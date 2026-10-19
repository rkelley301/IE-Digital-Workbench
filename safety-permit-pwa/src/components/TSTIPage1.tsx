import { useEffect, useState, type ReactNode } from 'react'
import { addStep, deleteControl, deleteStep, deleteStepHazard, isLocked, patchRecord } from '../db/repo'
import type { Control, ControlLevel, Hazard, JsaStep, StepHazard, Tsti } from '../db/types'
import {
  COMMENTS_LABEL,
  HAZARD_RECOGNITION,
  HAZARD_RECOGNITION_HEADING,
  JSA_HEADERS,
  LEADER_Q10,
  LEADER_QUESTIONS,
  LEADER_QUESTIONS_HEADING,
  RECOGNITION_ITEMS,
  STOP_WORK_CONDITIONS,
  TASK_PLANNING_FIELDS,
  TSTI1_TITLE,
  recognitionLabel,
  type RecognitionGroup,
  type RecognitionKey,
} from '../forms/templates'
import { addCustomHazard, addLibraryHazard, addManualControl, applyMandates, moveStepHazard } from '../logic/safetyEngine'
import { validateTstiPage1, type PermitBundle } from '../logic/validation'
import { FormShell } from './FormShell'
import { useAction, usePermitBundle, type Run } from './hooks'
import { Button, CheckGroup, ChoiceRow, CommitTextArea, DateField, IssueList, Label, LockBadge, Section, TextField, inputClass } from './ui'
import { YES_NO, toggle } from './formUtils'

const GROUPS = Object.entries(HAZARD_RECOGNITION) as [RecognitionGroup, (typeof HAZARD_RECOGNITION)[RecognitionGroup]][]

const LEVELS: { value: ControlLevel; label: string; short: string }[] = [
  { value: 'engineering', label: 'Engineering', short: 'ENG' },
  { value: 'administrative', label: 'Administrative', short: 'ADMIN' },
  { value: 'ppe', label: 'PPE', short: 'PPE' },
]

const lockLabel = (item: { source: string; sourceRef?: string }) =>
  item.source === 'site_rule' ? `Required · ${item.sourceRef}` : 'Required · hazard'

export function TSTIPage1({ permitId, onNext }: { permitId: string; onNext?: () => void }) {
  const bundle = usePermitBundle(permitId)
  const tstiId = bundle?.tsti.id
  const conditionsKey = bundle?.permit.workConditions.join(',')
  const action = useAction()

  // Re-derive mandated hazards/controls/PPE whenever the work conditions change.
  useEffect(() => {
    if (tstiId) void applyMandates(tstiId)
  }, [tstiId, conditionsKey])

  if (bundle === undefined) return <FormShell title="TSTI Page 1">Loading…</FormShell>
  if (bundle === null || !tstiId) return <FormShell title="TSTI Page 1">Permit not found.</FormShell>

  const issues = validateTstiPage1(bundle)
  const { tsti, steps } = bundle
  const editable = bundle.permit.status === 'draft'
  const save = (changes: Partial<Tsti>) => action.run(() => patchRecord('tsti', tsti.id, changes))

  // Recognition boxes the JSA hazards require, for highlighting.
  const required = new Map<string, string>()
  for (const h of bundle.stepHazards) for (const k of h.recognitionKeys) if (!required.has(k)) required.set(k, `Required by JSA: ${h.description}`)

  return (
    <FormShell title="TSTI Page 1" subtitle={TSTI1_TITLE}>
      {action.error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border-2 border-field-stop bg-black p-3 text-lg font-bold text-field-stop">
          {action.error}
          <Button variant="ghost" onClick={action.clear} aria-label="Dismiss error">✕</Button>
        </div>
      )}

      <fieldset disabled={!editable} className="space-y-6">
      <Section title="Task Planning">
        <DateField label="Date" value={tsti.date} onChange={(date) => save({ date })} />
        {TASK_PLANNING_FIELDS.map((f) => (
          <TextField
            key={f.key}
            label={f.label}
            multiline={f.key === 'jobDescription' || f.key === 'knownHazards' || f.key === 'evacuationRoute'}
            value={tsti.planning[f.key]}
            placeholder={f.key === 'woPermitNumber' ? bundle.permit.permitNumber : undefined}
            onCommit={(v) => save({ planning: { ...tsti.planning, [f.key]: v } })}
          />
        ))}
      </Section>

      <Section title="Stop Work Conditions (Reminders)">
        <CheckGroup items={STOP_WORK_CONDITIONS} selected={tsti.stopWorkConditions} onToggle={(k, on) => save({ stopWorkConditions: toggle(tsti.stopWorkConditions, k, on) })} />
      </Section>

      <section className="space-y-4">
        <h2 className="text-xl font-black uppercase">JSA</h2>
        <p className="text-sm font-bold uppercase text-neutral-300">{JSA_HEADERS.join(' · ')}</p>
        {steps.map((step) => (
          <StepCard key={step.id} step={step} bundle={bundle} run={action.run} />
        ))}
        <Button className="w-full" onClick={() => action.run(() => addStep(tstiId))}>
          + Add step
        </Button>
      </section>

      <Section title={COMMENTS_LABEL}>
        <CommitTextArea ariaLabel={COMMENTS_LABEL} rows={3} value={tsti.comments} onCommit={(comments) => save({ comments })} />
      </Section>

      <Section title={HAZARD_RECOGNITION_HEADING}>
        {GROUPS.map(([group, g]) => (
          <CheckGroup
            key={group}
            title={g.label}
            items={g.items}
            selected={tsti.hazardRecognition}
            flagged={required}
            onToggle={(k, on) => save({ hazardRecognition: toggle<RecognitionKey>(tsti.hazardRecognition, k, on) })}
          />
        ))}
        {tsti.hazardRecognition.includes('env_other') && (
          <TextField label="Environmental: Other" value={tsti.envOther} onCommit={(envOther) => save({ envOther })} />
        )}
      </Section>

      <Section title={LEADER_QUESTIONS_HEADING}>
        {LEADER_QUESTIONS.map((q) => (
          <ChoiceRow
            key={q.key}
            label={q.label}
            value={tsti.leaderAnswers[q.key]}
            options={YES_NO}
            disabled={!editable}
            onChange={(v) => save({ leaderAnswers: { ...tsti.leaderAnswers, [q.key]: v } })}
          />
        ))}
        <TextField label={LEADER_Q10} multiline value={tsti.leaderQ10} onCommit={(leaderQ10) => save({ leaderQ10 })} />
      </Section>
      </fieldset>

      <IssueList title="TSTI Page 1" issues={issues} />

      {onNext && (
        <Button variant="primary" className="w-full text-lg" onClick={onNext}>
          Next: Page 2 →
        </Button>
      )}
    </FormShell>
  )
}

function StepCard({ step, bundle, run }: { step: JsaStep; bundle: PermitBundle; run: Run }) {
  const hazards = bundle.stepHazards
    .filter((h) => h.stepId === step.id)
    .sort((a, b) => Number(isLocked(b)) - Number(isLocked(a)))
  const holdsLocked = hazards.some(isLocked)
  const inputId = `step-${step.id}`

  return (
    <article className="rounded-xl border-2 border-field-line bg-field-panel p-4">
      <div className="mb-2 flex items-center justify-between">
        <Label htmlFor={inputId}>Step {step.seq} · Basic task step</Label>
        {!holdsLocked && bundle.steps.length > 1 && (
          <Button variant="danger" aria-label={`Delete step ${step.seq}`} onClick={() => run(() => deleteStep(step.id))}>
            Delete
          </Button>
        )}
      </div>
      <CommitTextArea
        id={inputId}
        value={step.description}
        placeholder="Describe the step."
        onCommit={(v) => run(() => patchRecord('jsaSteps', step.id, { description: v }))}
      />

      <div className="mt-4 space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-300">Potential hazards</h3>
        {hazards.length === 0 && <p className="text-base text-neutral-400">No hazards on this step.</p>}
        {hazards.map((h) => (
          <HazardRow key={h.id} hazard={h} step={step} bundle={bundle} run={run} />
        ))}
        <AddHazard tstiId={step.tstiId} stepId={step.id} library={bundle.hazards} run={run} />
      </div>
    </article>
  )
}

function HazardRow({ hazard, step, bundle, run }: { hazard: StepHazard; step: JsaStep; bundle: PermitBundle; run: Run }) {
  const locked = isLocked(hazard)
  const controls = bundle.controls.filter((c) => c.stepHazardId === hazard.id)
  const ref = hazard.hazardCode ? bundle.hazards.find((x) => x.code === hazard.hazardCode) : undefined

  return (
    <div className={`rounded-lg border-2 p-3 ${locked ? 'border-field-warn' : 'border-field-line'} bg-black`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {hazard.recognitionKeys.map((k) => (
              <span key={k} className="rounded bg-neutral-700 px-2 py-0.5 text-xs font-bold uppercase">
                {recognitionLabel(k)}
              </span>
            ))}
            {locked && <LockBadge label={lockLabel(hazard)} />}
          </div>
          <p className="mt-1 text-lg font-bold">{hazard.description}</p>
          {ref && ref.description !== hazard.description && <p className="text-base text-neutral-300">{ref.description}</p>}
        </div>
        {!locked && (
          <Button variant="danger" aria-label={`Delete hazard ${hazard.description}`} onClick={() => run(() => deleteStepHazard(hazard.id))}>
            Delete
          </Button>
        )}
      </div>

      {bundle.steps.length > 1 && (
        <div className="mt-2">
          <label className="flex items-center gap-2 text-base">
            <span className="font-bold">Step</span>
            <select
              className={`${inputClass} w-auto`}
              value={step.id}
              onChange={(e) => run(() => moveStepHazard(hazard.id, e.target.value))}
            >
              {bundle.steps.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.seq}
                  {s.description ? ` · ${s.description.slice(0, 30)}` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="mt-3">
        <h4 className="text-sm font-bold uppercase tracking-wide text-neutral-300">Actions to eliminate / control</h4>
        <ul className="mt-1 space-y-2">
          {controls.map((c) => (
            <ControlRow key={c.id} control={c} run={run} />
          ))}
        </ul>
        <AddControl tstiId={hazard.tstiId} stepHazardId={hazard.id} run={run} />
      </div>
    </div>
  )
}

function ControlRow({ control, run }: { control: Control; run: Run }) {
  const locked = isLocked(control)
  const level = LEVELS.find((l) => l.value === control.level)
  return (
    <li className="flex items-center justify-between gap-2 rounded border border-field-line px-3 py-2">
      <div className="min-w-0">
        <span className="mr-2 text-xs font-black text-field-warn">{level?.short}</span>
        <span className="text-base">{control.text}</span>
        {locked && (
          <div className="mt-1">
            <LockBadge label={lockLabel(control)} />
          </div>
        )}
      </div>
      {!locked && (
        <Button variant="danger" aria-label={`Delete control ${control.text}`} onClick={() => run(() => deleteControl(control.id))}>
          ✕
        </Button>
      )}
    </li>
  )
}

function AddControl({ tstiId, stepHazardId, run }: { tstiId: string; stepHazardId: string; run: Run }) {
  const [level, setLevel] = useState<ControlLevel>('engineering')
  const [text, setText] = useState('')
  const submit = () => {
    if (!text.trim()) return
    run(async () => {
      await addManualControl(tstiId, stepHazardId, level, text)
      setText('')
    })
  }
  return (
    <div className="mt-2 space-y-2">
      <div role="radiogroup" aria-label="Control type" className="grid grid-cols-3 gap-2">
        {LEVELS.map((l) => (
          <Button
            key={l.value}
            role="radio"
            aria-checked={level === l.value}
            variant={level === l.value ? 'primary' : 'secondary'}
            className="px-2 text-sm"
            onClick={() => setLevel(l.value)}
          >
            {l.label}
          </Button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className={inputClass}
          value={text}
          placeholder="Add control"
          aria-label="New control"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <Button onClick={submit} disabled={!text.trim()} aria-label="Add control">
          Add
        </Button>
      </div>
    </div>
  )
}

function AddHazard({ tstiId, stepId, library, run }: { tstiId: string; stepId: string; library: Hazard[]; run: Run }) {
  const [mode, setMode] = useState<'closed' | 'library' | 'custom'>('closed')
  const [code, setCode] = useState('')
  const [recognitionKey, setRecognitionKey] = useState<RecognitionKey | ''>('')
  const [text, setText] = useState('')
  const close = () => {
    setMode('closed')
    setCode('')
    setText('')
  }

  if (mode === 'closed') {
    return (
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => setMode('library')}>+ Hazard from list</Button>
        <Button onClick={() => setMode('custom')}>+ Job-specific hazard</Button>
      </div>
    )
  }

  let body: ReactNode
  if (mode === 'library') {
    body = (
      <>
        <select className={inputClass} value={code} aria-label="Hazard" onChange={(e) => setCode(e.target.value)}>
          <option value="">Select hazard…</option>
          {library.map((h) => (
            <option key={h.code} value={h.code}>
              {h.name}
            </option>
          ))}
        </select>
        <Button variant="primary" disabled={!code} onClick={() => run(async () => { await addLibraryHazard(tstiId, stepId, code); close() })}>
          Add hazard
        </Button>
      </>
    )
  } else {
    body = (
      <>
        <select
          className={inputClass}
          value={recognitionKey}
          aria-label="Hazard Recognition box"
          onChange={(e) => setRecognitionKey(e.target.value as RecognitionKey)}
        >
          <option value="">Hazard Recognition box…</option>
          {GROUPS.map(([group, g]) => (
            <optgroup key={group} label={g.label}>
              {RECOGNITION_ITEMS.filter((i) => i.group === group).map((i) => (
                <option key={i.key} value={i.key}>
                  {i.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <input className={inputClass} value={text} placeholder="Describe the hazard" aria-label="Hazard description" onChange={(e) => setText(e.target.value)} />
        <Button
          variant="primary"
          disabled={!text.trim() || !recognitionKey}
          onClick={() =>
            run(async () => {
              if (!recognitionKey) return
              await addCustomHazard(tstiId, stepId, recognitionKey, text)
              close()
            })
          }
        >
          Add hazard
        </Button>
      </>
    )
  }

  return (
    <div className="space-y-2 rounded-lg border-2 border-dashed border-field-line p-3">
      {body}
      <Button variant="ghost" className="w-full" onClick={close}>
        Cancel
      </Button>
    </div>
  )
}
