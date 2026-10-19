import { useEffect } from 'react'
import { ensureClosure, patchRecord } from '../db/repo'
import type { PermitClosure } from '../db/types'
import { CLOSURE_HEADING, CLOSURE_NOTE, CLOSURE_QUESTIONS, FORM2_TITLE, SAFETY_CHECK, SAFETY_CHECK_HEADING } from '../forms/templates'
import { closePermit, recordWorkEnd } from '../logic/permitActions'
import { expandConditions, updatePermitForm } from '../logic/safetyEngine'
import { validateClosure, validateSafetyCheck } from '../logic/validation'
import { FormShell } from './FormShell'
import { useAction, usePermitBundle } from './hooks'
import { SignatureBlock } from './SignatureBlock'
import { Button, ChoiceRow, DateField, IssueList, Section, TextField } from './ui'
import { YES_NO_NA } from './formUtils'

export function PermitClosureForm({ permitId }: { permitId: string }) {
  const bundle = usePermitBundle(permitId)
  const action = useAction()
  const { run } = action

  useEffect(() => {
    run(() => ensureClosure(permitId))
  }, [permitId, run])

  if (bundle === undefined) return <FormShell title="Form 2">Loading…</FormShell>
  if (bundle === null) return <FormShell title="Form 2">Permit not found.</FormShell>

  const p = bundle.permit
  const c = bundle.closure
  const draft = p.status === 'draft'
  const closable = p.status === 'active' || p.status === 'invalidated'
  const hotWork = expandConditions(p.workConditions).includes('hot_work')
  const saveClosure = (changes: Partial<PermitClosure>) => c && run(() => patchRecord('closures', c.id, changes))
  const closureIssues = validateClosure(bundle)
  const anyNo = CLOSURE_QUESTIONS.some((q) => c?.answers[q.key] === 'no')

  return (
    <FormShell title="Form 2" subtitle={FORM2_TITLE}>
      {action.error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border-2 border-field-stop bg-black p-3 text-lg font-bold text-field-stop">
          {action.error}
          <Button variant="ghost" onClick={action.clear} aria-label="Dismiss error">✕</Button>
        </div>
      )}

      <Section title={SAFETY_CHECK_HEADING}>
        {SAFETY_CHECK.map((q) => (
          <ChoiceRow
            key={q.key}
            label={q.label}
            value={p.safetyCheck[q.key]}
            options={YES_NO_NA}
            disabled={!draft}
            onChange={(v) => run(() => updatePermitForm(p.id, { safetyCheck: { ...p.safetyCheck, [q.key]: v } }))}
          />
        ))}
        {draft && <IssueList title="Safety Check" issues={validateSafetyCheck(bundle)} />}
      </Section>

      <Section title={CLOSURE_HEADING} note={CLOSURE_NOTE}>
        {!closable && p.status !== 'closed' && <p className="text-base font-bold text-neutral-300">Available once the permit is active.</p>}
        {CLOSURE_QUESTIONS.map((q) => (
          <ChoiceRow
            key={q.key}
            label={q.label}
            value={c?.answers[q.key]}
            options={YES_NO_NA}
            disabled={!closable || !c}
            onChange={(v) => c && saveClosure({ answers: { ...c.answers, [q.key]: v } })}
          />
        ))}
        {anyNo && (
          <TextField label='"No" answers reported to (manager)' value={c?.noAnswersReportedTo ?? ''} disabled={!closable} onCommit={(noAnswersReportedTo) => saveClosure({ noAnswersReportedTo })} />
        )}
      </Section>

      {closable && (
        <Section title="Work end and closure sign-off" appOnly>
          <DateField label="Work ended" withTime value={p.workEndedAt} onChange={(iso) => run(() => recordWorkEnd(p.id, iso))} />
          {!p.workEndedAt && (
            <Button className="w-full" onClick={() => run(() => recordWorkEnd(p.id))}>
              Work ended now
            </Button>
          )}
          {hotWork && (
            <>
              <p className="text-base font-bold text-field-warn">Hot work: fire watch continues 30 minutes after work ends.</p>
              <TextField label="Fire watch" value={c?.fireWatchBy ?? ''} onCommit={(fireWatchBy) => saveClosure({ fireWatchBy })} />
              <DateField label="Fire watch ended" withTime value={c?.fireWatchEndedAt} onChange={(fireWatchEndedAt) => saveClosure({ fireWatchEndedAt })} />
            </>
          )}
          <SignatureBlock label="Closure - PTW Acceptor" permitId={p.id} docType="closure" role="closure_acceptor" signatures={bundle.signatures} run={run} withTime />
          <SignatureBlock label="Closure - Permit Issuer" permitId={p.id} docType="closure" role="closure_issuer" signatures={bundle.signatures} run={run} withTime />
        </Section>
      )}

      {closable && (
        <>
          <IssueList title="Closure" issues={closureIssues} />
          <Button variant="primary" className="w-full text-lg" disabled={closureIssues.length > 0} onClick={() => run(() => closePermit(p.id))}>
            Close permit
          </Button>
        </>
      )}
      {p.status === 'closed' && <p className="rounded-lg bg-field-panel p-3 text-center text-lg font-black">PERMIT CLOSED</p>}
    </FormShell>
  )
}
