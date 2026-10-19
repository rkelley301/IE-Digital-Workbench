import { useState } from 'react'
import { addGasTest, deleteGasTest, patchRecord, setRuleAck } from '../db/repo'
import { O2_DEFICIENT_BELOW_PCT } from '../db/seed/reference'
import type { GasAnalyte, GasTest, RuleRequirement, SignatureRole, SiteRule } from '../db/types'
import { expandConditions, triggeredRules, updatePermitForm } from '../logic/safetyEngine'
import { isOxygenDeficient, requirementMet, type PermitBundle } from '../logic/validation'
import type { Run } from './hooks'
import { SignatureBlock } from './SignatureBlock'
import { Button, CheckGroup, CheckRow, ChoiceRow, CommitTextArea, Label, Section, TextField, inputClass } from './ui'

const ROLE_LABEL: Partial<Record<SignatureRole, string>> = {
  hole_watch: 'Hole watch',
  fire_watch: 'Fire watch',
  site_director: 'Site Director approval (special review)',
}

function Status({ ok, children }: { ok: boolean; children: string }) {
  return (
    <p className={`flex min-h-11 items-center gap-2 rounded-lg border-2 px-3 text-base font-bold ${ok ? 'border-field-ok text-field-ok' : 'border-field-stop text-field-stop'}`}>
      <span aria-hidden="true">{ok ? '✓' : '✕'}</span>
      {children}
    </p>
  )
}

/** Requirements of every Morris rule this permit triggers. App-only: not on the paper PTW. */
export function SiteRulesPanel({ bundle, run }: { bundle: PermitBundle; run: Run }) {
  const acceptor = bundle.signatures.find((s) => s.docType === 'ptw' && s.role === 'acceptor')?.name ?? ''
  const [ackName, setAckName] = useState(acceptor)
  const rules = triggeredRules(bundle.permit.workConditions, bundle.rules)
  const conds = expandConditions(bundle.permit.workConditions)

  if (rules.length === 0) {
    return (
      <Section title="Morris site rule requirements" appOnly>
        <p className="text-base text-neutral-300">No site rules triggered by this permit.</p>
      </Section>
    )
  }

  const render = (rule: SiteRule, req: RuleRequirement) => {
    const met = requirementMet(bundle, rule, req, 'sign_off')
    switch (req.kind) {
      case 'ack': {
        const ack = bundle.ruleAcks.find((a) => a.ruleCode === rule.code && a.requirementKey === req.key)
        return (
          <CheckRow
            key={req.key}
            label={ack ? `${req.label} (${ack.acknowledgedBy})` : req.label}
            checked={!!ack}
            onChange={(checked) =>
              run(async () => {
                if (checked && !ackName.trim()) throw new Error('Enter "Acknowledged by" name first.')
                await setRuleAck(bundle.permit.id, rule.code, req.key, checked ? ackName.trim() : null)
              })
            }
          />
        )
      }
      case 'role':
        return (
          <SignatureBlock key={req.key} label={ROLE_LABEL[req.role] ?? req.label} permitId={bundle.permit.id} docType="ptw" role={req.role} signatures={bundle.signatures} run={run} withTime />
        )
      case 'approval':
        if (!conds.includes(req.when)) return null
        return (
          <SignatureBlock key={req.key} label={ROLE_LABEL[req.role] ?? req.label} permitId={bundle.permit.id} docType="ptw" role={req.role} signatures={bundle.signatures} run={run} withTime />
        )
      case 'permit_field':
        return (
          <TextField key={req.key} label="Rescue plan" multiline value={bundle.permit.rescuePlan ?? ''} onCommit={(v) => run(() => updatePermitForm(bundle.permit.id, { rescuePlan: v }))} />
        )
      case 'gas_test':
        return <Status key={req.key} ok={met}>{`${req.label}${met ? '' : ': record under Gas tests'}`}</Status>
      case 'control':
        return <Status key={req.key} ok={met}>{`TSTI Page 1 control: ${req.text}`}</Status>
      case 'post_work_watch':
        return <p key={req.key} className="text-base text-neutral-300">{req.label}. Recorded at closure.</p>
    }
  }

  return (
    <Section title="Morris site rule requirements" appOnly>
      <div>
        <Label htmlFor="ack-name">Acknowledged by</Label>
        <input id="ack-name" className={inputClass} value={ackName} placeholder="Name" onChange={(e) => setAckName(e.target.value)} />
      </div>
      {rules.map((rule) => (
        <div key={rule.code} className="space-y-2 rounded-lg border-2 border-field-warn p-3">
          <h3 className="text-base font-black uppercase">
            {rule.title} <span className="text-sm text-field-warn">· {rule.code}</span>
          </h3>
          <p className="text-base text-neutral-300">{rule.summary}</p>
          {rule.requirements.map((req) => render(rule, req))}
        </div>
      ))}
    </Section>
  )
}

const ANALYTES: { key: GasAnalyte; label: string; field: keyof GasTest; unit: string }[] = [
  { key: 'o2', label: 'O2', field: 'o2Pct', unit: '%' },
  { key: 'lel', label: 'LEL', field: 'lelPct', unit: '%' },
  { key: 'h2s', label: 'H2S', field: 'h2sPpm', unit: 'ppm' },
  { key: 'co', label: 'CO', field: 'coPpm', unit: 'ppm' },
  { key: 'nh3', label: 'NH3', field: 'nh3Ppm', unit: 'ppm' },
  { key: 'ch3cl', label: 'CH3Cl', field: 'ch3clPpm', unit: 'ppm' },
]

/** Gas test log. App-only: required by the confined space, hot work, and methyl chloride rules. */
export function GasTests({ bundle, run }: { bundle: PermitBundle; run: Run }) {
  const patch = (id: string, changes: Partial<GasTest>) => run(() => patchRecord('gasTests', id, changes))
  return (
    <Section title="Gas tests" appOnly>
      {bundle.gasTests.length === 0 && <p className="text-base text-neutral-300">No gas tests recorded.</p>}
      {bundle.gasTests.map((t) => {
        const deficient = isOxygenDeficient(t)
        return (
          <div key={t.id} className="space-y-3 rounded-lg border-2 border-field-line bg-black p-3">
            <TextField label="Test location" value={t.testLocation} onCommit={(v) => patch(t.id, { testLocation: v })} />
            <TextField label="Tested by" value={t.testedBy} onCommit={(v) => patch(t.id, { testedBy: v })} />
            <TextField label="Instrument ID" value={t.instrumentId} onCommit={(v) => patch(t.id, { instrumentId: v })} />
            <CheckRow label="Continuous monitor for the job" checked={t.continuous} onChange={(continuous) => patch(t.id, { continuous })} />
            <CheckGroup
              title="Analytes read"
              items={ANALYTES.map((a) => ({ key: a.key, label: a.label }))}
              selected={t.analytes}
              onToggle={(key, on) => patch(t.id, { analytes: on ? [...t.analytes, key] : t.analytes.filter((a) => a !== key) })}
            />
            {ANALYTES.filter((a) => t.analytes.includes(a.key)).map((a) => {
              const v = t[a.field]
              return (
                <div key={a.key}>
                  <Label htmlFor={`${t.id}-${a.key}`}>{`${a.label} (${a.unit})`}</Label>
                  <CommitTextArea
                    id={`${t.id}-${a.key}`}
                    singleLine
                    inputMode="decimal"
                    value={typeof v === 'number' ? String(v) : ''}
                    onCommit={(raw) => {
                      const n = raw.trim() === '' ? undefined : Number(raw)
                      if (n !== undefined && Number.isNaN(n)) return
                      const changes: Partial<GasTest> = { [a.field]: n }
                      if (a.key === 'o2' && n !== undefined && n < O2_DEFICIENT_BELOW_PCT) changes.acceptable = false
                      patch(t.id, changes)
                    }}
                  />
                </div>
              )
            })}
            {deficient && (
              <p role="alert" className="rounded-lg bg-field-stop p-3 text-base font-black text-black">
                O2 below {O2_DEFICIENT_BELOW_PCT}% = OXYGEN DEFICIENT. Test fails.
              </p>
            )}
            <ChoiceRow
              label="Result"
              value={t.acceptable === null ? null : t.acceptable ? 'pass' : 'fail'}
              options={deficient ? [{ value: 'fail', label: 'Fail' }] : [{ value: 'pass', label: 'Pass' }, { value: 'fail', label: 'Fail' }]}
              onChange={(v) => patch(t.id, { acceptable: v === 'pass' })}
            />
            <Button variant="danger" className="w-full" onClick={() => run(() => deleteGasTest(t.id))}>
              Delete test
            </Button>
          </div>
        )
      })}
      <Button className="w-full" onClick={() => run(() => addGasTest(bundle.permit.id))}>
        + Add gas test
      </Button>
    </Section>
  )
}
