import { useState } from 'react'
import { HOT_WORK_TASKS, SITE_TRIGGER_OPTIONS } from '../db/seed/reference'
import type { Permit } from '../db/types'
import {
  GENERAL_CONSIDERATIONS,
  HAZARDOUS_CONDITIONS,
  HIGHLY_HAZARDOUS_CHEMICALS,
  PTW1_SIGNATURES,
  PTW1_TITLE,
  WORK_ACTIVITIES,
  WORK_AREAS,
} from '../forms/templates'
import { activatePermit, invalidatePermit } from '../logic/permitActions'
import { updatePermitForm } from '../logic/safetyEngine'
import { isSubmitDisabled, validateBeforeSignatures, validateSignOff } from '../logic/validation'
import { FormShell } from './FormShell'
import { useAction, usePermitBundle } from './hooks'
import { SignatureBlock } from './SignatureBlock'
import { GasTests, SiteRulesPanel } from './SiteRulesPanel'
import { Button, CheckGroup, CheckRow, CommitTextArea, DateField, IssueList, Section, TextField } from './ui'
import { toggle } from './formUtils'

const STATUS_LABEL: Record<Permit['status'], string> = {
  draft: 'DRAFT',
  ready_to_sign: 'READY TO SIGN',
  active: 'ACTIVE',
  invalidated: 'INVALID · STOP WORK',
  closed: 'CLOSED',
  void: 'VOID',
}

export function PTW1Form({ permitId }: { permitId: string }) {
  const bundle = usePermitBundle(permitId)
  const action = useAction()
  const [otherChem, setOtherChem] = useState(false)

  if (bundle === undefined) return <FormShell title={PTW1_TITLE}>Loading…</FormShell>
  if (bundle === null) return <FormShell title={PTW1_TITLE}>Permit not found.</FormShell>

  const p = bundle.permit
  const editable = p.status === 'draft'
  const save = (changes: Parameters<typeof updatePermitForm>[1]) => action.run(() => updatePermitForm(p.id, changes))
  const preSignIssues = validateBeforeSignatures(bundle)
  const signOffIssues = validateSignOff(bundle)
  const canSign = editable && preSignIssues.length === 0
  const canActivate = editable && signOffIssues.length === 0 && !isSubmitDisabled(bundle.tsti)
  const otherChecked = otherChem || p.chemicalsOther.trim() !== ''

  return (
    <FormShell title="PTW 1" subtitle={PTW1_TITLE}>
      <div
        className={`rounded-lg p-3 text-center text-lg font-black ${p.status === 'invalidated' ? 'bg-field-stop text-black' : p.status === 'active' ? 'bg-field-ok text-black' : 'bg-field-panel'}`}
      >
        {STATUS_LABEL[p.status]}
      </div>

      {action.error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border-2 border-field-stop bg-black p-3 text-lg font-bold text-field-stop">
          {action.error}
          <Button variant="ghost" onClick={action.clear} aria-label="Dismiss error">✕</Button>
        </div>
      )}

      <fieldset disabled={!editable} className="space-y-6">
        <Section title="Permit">
          <TextField label="Permit Number" value={p.permitNumber} onCommit={(permitNumber) => save({ permitNumber })} />
          <DateField label="Date" value={p.date} onChange={(date) => save({ date })} />
        </Section>

        <Section title="Work Activities">
          <CheckGroup items={WORK_ACTIVITIES} selected={p.workActivities} onToggle={(k, on) => save({ workActivities: toggle(p.workActivities, k, on) })} />
        </Section>

        <Section title="Work Areas (Craft Use)">
          <CheckGroup items={WORK_AREAS} selected={p.workAreas} onToggle={(k, on) => save({ workAreas: toggle(p.workAreas, k, on) })} />
        </Section>

        <Section title="General Considerations (Craft Use)">
          <CheckGroup
            items={GENERAL_CONSIDERATIONS}
            selected={p.generalConsiderations}
            onToggle={(k, on) => save({ generalConsiderations: toggle(p.generalConsiderations, k, on) })}
          />
        </Section>

        <Section title="Hazardous Conditions">
          <CheckGroup
            items={HAZARDOUS_CONDITIONS}
            selected={p.hazardousConditions}
            onToggle={(k, on) => save({ hazardousConditions: toggle(p.hazardousConditions, k, on) })}
          />
        </Section>

        <Section title="Highly Hazardous Chemicals (List Known Substances)">
          <CheckGroup items={HIGHLY_HAZARDOUS_CHEMICALS} selected={p.chemicals} onToggle={(k, on) => save({ chemicals: toggle(p.chemicals, k, on) })} />
          <CheckRow
            label="Other"
            checked={otherChecked}
            onChange={(on) => {
              setOtherChem(on)
              if (!on) save({ chemicalsOther: '' })
            }}
          />
          {otherChecked && (
            <CommitTextArea singleLine ariaLabel="Other chemical" value={p.chemicalsOther} placeholder="Other substance" onCommit={(chemicalsOther) => save({ chemicalsOther })} />
          )}
        </Section>

        <Section title="Morris site triggers" appOnly>
          <CheckGroup
            items={SITE_TRIGGER_OPTIONS.map((o) => ({ key: o.condition, label: o.label }))}
            selected={p.siteConditions}
            onToggle={(k, on) => save({ siteConditions: toggle(p.siteConditions, k, on) })}
          />
          <CheckGroup
            title="Hot work: task includes"
            items={HOT_WORK_TASKS}
            selected={p.hotWorkTasks}
            onToggle={(k, on) => save({ hotWorkTasks: toggle(p.hotWorkTasks, k, on) })}
          />
        </Section>
      </fieldset>

      <SiteRulesPanel bundle={bundle} run={action.run} />
      <GasTests bundle={bundle} run={action.run} />

      <Section title="Approvals & Signatures" note={canSign || !editable ? undefined : 'Complete all open items before signing.'}>
        {PTW1_SIGNATURES.map((s) => (
          <SignatureBlock key={s.key} label={s.label} permitId={p.id} docType="ptw" role={s.key} signatures={bundle.signatures} run={action.run} withTime disabled={!canSign} />
        ))}
      </Section>

      {editable && (
        <>
          <IssueList title="Sign-off" issues={signOffIssues} />
          <Button variant="primary" className="w-full text-lg" disabled={!canActivate} onClick={() => action.run(() => activatePermit(p.id))}>
            Activate permit
          </Button>
        </>
      )}

      {p.status === 'active' && (
        <Section title="Permit invalid: stop work" note="Emergency alarm or changed conditions invalidate the permit. Stop, reassess, resume only when authorized on a new permit.">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button variant="danger" onClick={() => action.run(() => invalidatePermit(p.id, 'emergency_alarm'))}>
              Emergency alarm
            </Button>
            <Button variant="danger" onClick={() => action.run(() => invalidatePermit(p.id, 'conditions_changed'))}>
              Conditions changed
            </Button>
          </div>
        </Section>
      )}
    </FormShell>
  )
}
