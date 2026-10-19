import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, type ReactNode } from 'react'
import { addStep, deleteControl, deleteStep, deleteStepHazard, isLocked, patchRecord } from '../db/repo'
import type { Control, ControlLevel, Hazard, HazardCategory, JsaStep, StepHazard } from '../db/types'
import { addCustomHazard, addLibraryHazard, addManualControl, applyMandates, moveStepHazard } from '../logic/safetyEngine'
import { loadBundle, validateTstiPage1, type PermitBundle } from '../logic/validation'
import { FormShell } from './FormShell'
import { Button, CommitTextArea, IssueList, Label, LockBadge, inputClass } from './ui'

const CATEGORIES: { value: HazardCategory; label: string }[] = [
  { value: 'gravity', label: 'Gravity' },
  { value: 'pressure', label: 'Pressure' },
  { value: 'temperature', label: 'Temperature' },
  { value: 'chemical', label: 'Chemical' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'mechanical', label: 'Mechanical' },
  { value: 'noise', label: 'Noise' },
]

const LEVELS: { value: ControlLevel; label: string; short: string }[] = [
  { value: 'engineering', label: 'Engineering', short: 'ENG' },
  { value: 'administrative', label: 'Administrative', short: 'ADMIN' },
  { value: 'ppe', label: 'PPE', short: 'PPE' },
]

const lockLabel = (item: { source: string; sourceRef?: string }) =>
  item.source === 'site_rule' ? `Required · ${item.sourceRef}` : 'Required · hazard'

/** Run an action and surface any error (e.g. LockedItemError) to the technician. */
function useAction() {
  const [error, setError] = useState<string | null>(null)
  const run = (fn: () => Promise<unknown>) => {
    setError(null)
    fn().catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }
  return { error, run, clear: () => setError(null) }
}

export function TSTIPage1({ permitId, onNext }: { permitId: string; onNext?: () => void }) {
  // null = not found; undefined = still loading
  const bundle = useLiveQuery(async () => (await loadBundle(permitId)) ?? null, [permitId])
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

  return (
    <FormShell title="TSTI Page 1" subtitle={`Task Safety · Permit ${bundle.permit.permitNumber || '(no number)'}`}>
      {action.error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border-2 border-field-stop bg-black p-3 text-lg font-bold text-field-stop">
          {action.error}
          <Button variant="ghost" onClick={action.clear} aria-label="Dismiss error">✕</Button>
        </div>
      )}

      <section>
        <Label htmlFor="job-description">Job description</Label>
        <CommitTextArea
          id="job-description"
          rows={3}
          value={tsti.jobDescription}
          placeholder="What is the job? Equipment, location, scope."
          onCommit={(v) => action.run(() => patchRecord('tsti', tsti.id, { jobDescription: v }))}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-black uppercase">Task steps · hazards · controls</h2>
        {steps.map((step) => (
          <StepCard key={step.id} step={step} bundle={bundle} run={action.run} />
        ))}
        <Button className="w-full" onClick={() => action.run(() => addStep(tstiId))}>
          + Add step
        </Button>
      </section>

      <IssueList title="Page 1" issues={issues} />

      {onNext && (
        <Button variant="primary" className="w-full text-lg" onClick={onNext}>
          Next: Page 2 →
        </Button>
      )}
    </FormShell>
  )
}

type Run = (fn: () => Promise<unknown>) => void

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
  const category = CATEGORIES.find((c) => c.value === hazard.category)?.label

  return (
    <div className={`rounded-lg border-2 p-3 ${locked ? 'border-field-warn' : 'border-field-line'} bg-black`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-neutral-700 px-2 py-0.5 text-xs font-bold uppercase">{category}</span>
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
  const [category, setCategory] = useState<HazardCategory>('mechanical')
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
          {CATEGORIES.map((c) => (
            <optgroup key={c.value} label={c.label}>
              {library
                .filter((h) => h.category === c.value)
                .map((h) => (
                  <option key={h.code} value={h.code}>
                    {h.name}
                  </option>
                ))}
            </optgroup>
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
          value={category}
          aria-label="Hazard category"
          onChange={(e) => setCategory(e.target.value as HazardCategory)}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <input className={inputClass} value={text} placeholder="Describe the hazard" aria-label="Hazard description" onChange={(e) => setText(e.target.value)} />
        <Button
          variant="primary"
          disabled={!text.trim()}
          onClick={() => run(async () => { await addCustomHazard(tstiId, stepId, category, text); close() })}
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
