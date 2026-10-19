import { useState } from 'react'
import { patchRecord } from '../db/repo'
import type { Tsti } from '../db/types'
import {
  ANGLE_GRINDER_CHECKS,
  ANGLE_GRINDER_HEADING,
  BASIC_SAFEGUARDS,
  FALL_PROTECTION,
  GLOVES_OTHER_NOTE,
  GLOVES_REQUIRED,
  HEAVY_EQUIPMENT,
  PPE_REQUIRED,
  SAFE_WORK_PRACTICES,
  TSTI2_SIGNATURE_LABELS as L,
  TSTI2_TEXT_FIELDS,
  TSTI2_TITLE,
} from '../forms/templates'
import { mandatedFormChecks, setPpeChecked } from '../logic/safetyEngine'
import { isSubmitDisabled, validateTstiPage2 } from '../logic/validation'
import { FormShell } from './FormShell'
import { useAction, usePermitBundle } from './hooks'
import { SignatureBlock } from './SignatureBlock'
import { Button, CheckGroup, CheckRow, ChoiceRow, CommitTextArea, IssueList, Section, TextField } from './ui'
import { YES_NO, toggle } from './formUtils'

const lockText = (requiredBy: string[]) =>
  requiredBy.includes('baseline') ? 'Required · baseline' : `Required · ${requiredBy.join(', ')}`

export function TSTIPage2({ permitId }: { permitId: string }) {
  const bundle = usePermitBundle(permitId)
  const action = useAction()
  const [open, setOpen] = useState({ ppeOther: false, glovesOther: false })

  if (bundle === undefined) return <FormShell title="TSTI Page 2">Loading…</FormShell>
  if (bundle === null) return <FormShell title="TSTI Page 2">Permit not found.</FormShell>

  const { tsti, permit } = bundle
  const editable = permit.status === 'draft'
  const save = (changes: Partial<Tsti>) => action.run(() => patchRecord('tsti', tsti.id, changes))
  const issues = validateTstiPage2(bundle)
  const forms = mandatedFormChecks(permit.workConditions)

  // PPE / gloves boxes are rows in tstiPpe. Rule- or hazard-required rows are locked.
  const ppeChecked = bundle.tstiPpe.map((r) => r.ppeCode)
  const ppeLocked = new Map(bundle.tstiPpe.filter((r) => r.source !== 'manual').map((r) => [r.ppeCode, lockText(r.requiredBy)]))
  const baselineOnly = bundle.ppeItems.filter((i) => i.list === 'baseline_only')
  const ppeOtherOn = open.ppeOther || tsti.ppeOther.trim() !== ''
  const glovesOtherOn = open.glovesOther || tsti.glovesOther.trim() !== ''
  const togglePpe = (code: string, on: boolean) => action.run(() => setPpeChecked(tsti.id, code, on))

  return (
    <FormShell title="TSTI Page 2" subtitle={TSTI2_TITLE}>
      {action.error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border-2 border-field-stop bg-black p-3 text-lg font-bold text-field-stop">
          {action.error}
          <Button variant="ghost" onClick={action.clear} aria-label="Dismiss error">✕</Button>
        </div>
      )}

      <fieldset disabled={!editable} className="space-y-6">
        <Section title="Task Planning & Risk Management">
          {TSTI2_TEXT_FIELDS.map((f) => (
            <TextField key={f.key} label={f.label} multiline value={tsti[f.key]} onCommit={(v) => save({ [f.key]: v })} />
          ))}
        </Section>

        <Section title="Safe Work Practices">
          <CheckGroup
            items={SAFE_WORK_PRACTICES}
            selected={tsti.safeWorkPractices}
            locked={forms.safeWorkPractices}
            onToggle={(k, on) => save({ safeWorkPractices: toggle(tsti.safeWorkPractices, k, on) })}
          />
          {tsti.safeWorkPractices.includes('other') && (
            <TextField label="Safe Work Practices: Other" value={tsti.safeWorkPracticesOther} onCommit={(safeWorkPracticesOther) => save({ safeWorkPracticesOther })} />
          )}
        </Section>

        <Section title="Basic Safeguards">
          <CheckGroup
            items={BASIC_SAFEGUARDS}
            selected={tsti.basicSafeguards}
            locked={forms.basicSafeguards}
            onToggle={(k, on) => save({ basicSafeguards: toggle(tsti.basicSafeguards, k, on) })}
          />
        </Section>

        <Section title="PPE Required">
          <CheckGroup items={PPE_REQUIRED.filter((i) => i.key !== 'ppe_other')} selected={ppeChecked} locked={ppeLocked} onToggle={togglePpe} />
          <CheckRow
            label="Other"
            checked={ppeOtherOn}
            onChange={(on) => {
              setOpen((o) => ({ ...o, ppeOther: on }))
              if (!on) save({ ppeOther: '' })
            }}
          />
          {ppeOtherOn && <CommitTextArea singleLine ariaLabel="Other PPE" value={tsti.ppeOther} placeholder="Other PPE" onCommit={(ppeOther) => save({ ppeOther })} />}
        </Section>

        <Section title="Baseline PPE (always required)" appOnly>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {baselineOnly.map((i) => (
              <CheckRow key={i.code} label={i.name} checked locked="Required · baseline" onChange={() => undefined} />
            ))}
          </div>
        </Section>

        <Section title="Gloves Required">
          <CheckGroup items={GLOVES_REQUIRED.filter((i) => i.key !== 'gloves_other')} selected={ppeChecked} locked={ppeLocked} onToggle={togglePpe} />
          {ppeChecked.includes('gloves_chemical') && (
            <TextField label="Chemical Resistant (Specify)" value={tsti.glovesChemicalSpec} onCommit={(glovesChemicalSpec) => save({ glovesChemicalSpec })} />
          )}
          <CheckRow
            label={`Other ${GLOVES_OTHER_NOTE}`}
            checked={glovesOtherOn}
            onChange={(on) => {
              setOpen((o) => ({ ...o, glovesOther: on }))
              if (!on) save({ glovesOther: '', glovesOtherApprovedBy: '' })
            }}
          />
          {glovesOtherOn && (
            <>
              <TextField label="Other gloves" value={tsti.glovesOther} onCommit={(glovesOther) => save({ glovesOther })} />
              <TextField label="Site Manager approval" value={tsti.glovesOtherApprovedBy} onCommit={(glovesOtherApprovedBy) => save({ glovesOtherApprovedBy })} />
            </>
          )}
        </Section>

        <Section title="Fall Protection">
          <CheckGroup items={FALL_PROTECTION} selected={tsti.fallProtection} onToggle={(k, on) => save({ fallProtection: toggle(tsti.fallProtection, k, on) })} />
          {tsti.fallProtection.includes('other') && (
            <TextField label="Fall Protection: Other" value={tsti.fallProtectionOther} onCommit={(fallProtectionOther) => save({ fallProtectionOther })} />
          )}
        </Section>

        <Section title="Heavy Equipment Use">
          <CheckGroup items={HEAVY_EQUIPMENT} selected={tsti.heavyEquipment} onToggle={(k, on) => save({ heavyEquipment: toggle(tsti.heavyEquipment, k, on) })} />
          <TextField label="Weight" value={tsti.heavyEquipmentWeight} onCommit={(heavyEquipmentWeight) => save({ heavyEquipmentWeight })} />
        </Section>

        <Section title={ANGLE_GRINDER_HEADING}>
          <TextField label="Requester / User" value={tsti.angleGrinder.requester} onCommit={(requester) => save({ angleGrinder: { ...tsti.angleGrinder, requester } })} />
          <TextField label="Supervisor" value={tsti.angleGrinder.supervisor} onCommit={(supervisor) => save({ angleGrinder: { ...tsti.angleGrinder, supervisor } })} />
          <CheckGroup
            items={ANGLE_GRINDER_CHECKS}
            selected={tsti.angleGrinder.checks}
            onToggle={(k, on) => save({ angleGrinder: { ...tsti.angleGrinder, checks: toggle(tsti.angleGrinder.checks, k, on) } })}
          />
          <ChoiceRow
            label="Decision"
            value={tsti.angleGrinder.decision}
            disabled={!editable}
            options={[
              { value: 'approved', label: 'Approved' },
              { value: 'denied', label: 'Denied' },
            ]}
            onChange={(decision) => save({ angleGrinder: { ...tsti.angleGrinder, decision } })}
          />
        </Section>

        <Section title="Signatures">
          <SignatureBlock label={L.employee} badgeLabel={L.badge} permitId={permit.id} docType="tsti" role="employee" signatures={bundle.signatures} run={action.run} disabled={!editable} />
          <ChoiceRow label={L.twoUp} value={tsti.twoUpRequired} options={YES_NO} disabled={!editable} onChange={(twoUpRequired) => save({ twoUpRequired })} />
          {tsti.twoUpRequired === 'yes' && (
            <TextField label={L.twoUpActivity} multiline value={tsti.twoUpActivity} onCommit={(twoUpActivity) => save({ twoUpActivity })} />
          )}
          <h3 className="text-base font-black uppercase">{L.flsHeading}</h3>
          <SignatureBlock label={L.fls} permitId={permit.id} docType="tsti" role="fls" signatures={bundle.signatures} run={action.run} disabled={!editable} />
          <SignatureBlock label={L.management} permitId={permit.id} docType="tsti" role="management" signatures={bundle.signatures} run={action.run} disabled={!editable} />
        </Section>

        <Section title="STOP Work Authority" appOnly>
          <CheckRow
            label="I have STOP Work Authority and will stop work if conditions change or are unsafe."
            checked={tsti.stopWorkAcknowledged}
            onChange={(on) => save({ stopWorkAcknowledged: on, stopWorkAckAt: on ? new Date().toISOString() : undefined })}
          />
          <TextField label="Name" value={tsti.stopWorkAckBy ?? ''} onCommit={(stopWorkAckBy) => save({ stopWorkAckBy })} />
          {isSubmitDisabled(tsti) && <p className="text-base font-bold text-field-stop">Permit cannot be activated until STOP Work Authority is acknowledged.</p>}
        </Section>
      </fieldset>

      <IssueList title="TSTI Page 2" issues={issues} />
    </FormShell>
  )
}
