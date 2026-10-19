import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/schema'
import { ensureSeed } from '../db/seed'
import { BASELINE_PPE } from '../db/seed/reference'
import { LockedItemError, createPermitDraft, deleteControl, deleteStep, deleteStepHazard, deleteTstiPpe, newId, now, patchRecord, putRecord } from '../db/repo'
import type { WorkCondition } from '../db/types'
import { addLibraryHazard, applyMandates, setWorkConditions, triggeredRules } from './safetyEngine'
import { isSubmitDisabled, loadBundle, validateClosure, validateRuleRequirements, validateTstiPage1, type PermitBundle } from './validation'

let permitId: string
let tstiId: string

beforeEach(async () => {
  await db.delete()
  await db.open()
  await ensureSeed()
  ;({ permitId, tstiId } = await createPermitDraft('P-1'))
})

const rows = async () => ({
  hazards: await db.stepHazards.where('tstiId').equals(tstiId).toArray(),
  controls: await db.controls.where('tstiId').equals(tstiId).toArray(),
  ppe: await db.tstiPpe.where('tstiId').equals(tstiId).toArray(),
})

const firstStep = async () => (await db.jsaSteps.where('[tstiId+seq]').equals([tstiId, 1]).first())!

async function bundle(): Promise<PermitBundle> {
  const b = await loadBundle(permitId)
  if (!b) throw new Error('no bundle')
  return b
}

describe('safety engine', () => {
  it('adds baseline PPE to every TSTI, locked', async () => {
    await applyMandates(tstiId)
    const { ppe } = await rows()
    expect(ppe.map((p) => p.ppeCode).sort()).toEqual([...BASELINE_PPE].sort())
    expect(ppe.every((p) => p.source === 'baseline')).toBe(true)
    await expect(deleteTstiPpe(ppe[0]!.id)).rejects.toBeInstanceOf(LockedItemError)
  })

  it('hpu adds the hydrogen hazard and a single locked non-sparking control', async () => {
    await setWorkConditions(permitId, ['hpu'])
    const { hazards, controls } = await rows()
    const h2 = hazards.find((h) => h.hazardCode === 'chemical.hydrogen')
    expect(h2).toMatchObject({ source: 'site_rule', sourceRef: 'MORRIS-HPU' })
    const nonSpark = controls.filter((c) => c.text === 'Non-sparking tools only')
    expect(nonSpark).toHaveLength(1)
    expect(nonSpark[0]).toMatchObject({ level: 'engineering', source: 'site_rule', sourceRef: 'MORRIS-HPU' })
    await expect(deleteStepHazard(h2!.id)).rejects.toBeInstanceOf(LockedItemError)
    await expect(deleteControl(nonSpark[0]!.id)).rejects.toBeInstanceOf(LockedItemError)
  })

  it('methyl chloride adds continuous monitoring control and chemical PPE', async () => {
    await setWorkConditions(permitId, ['methyl_chloride'])
    const { controls, ppe } = await rows()
    expect(controls.some((c) => c.text === 'Continuous gas monitoring for methyl chloride' && c.source === 'site_rule')).toBe(true)
    for (const code of ['chem_suit', 'chem_gloves', 'face_shield']) {
      expect(ppe.find((p) => p.ppeCode === code)).toMatchObject({ source: 'site_rule', requiredBy: ['chemical.methyl_chloride'] })
    }
  })

  it('unchecking a condition downgrades its items to manual instead of deleting them', async () => {
    await setWorkConditions(permitId, ['methyl_chloride'])
    await setWorkConditions(permitId, [])
    const { hazards, controls } = await rows()
    const h = hazards.find((x) => x.hazardCode === 'chemical.methyl_chloride')!
    expect(h.source).toBe('manual')
    // Hazard is still present, so its mapped controls stay required...
    expect(controls.filter((c) => c.stepHazardId === h.id).every((c) => c.source === 'hazard')).toBe(true)
    // ...until the technician deletes the now-manual hazard, which takes its controls with it.
    await deleteStepHazard(h.id)
    await applyMandates(tstiId)
    const after = await rows()
    expect(after.controls).toHaveLength(0)
    expect(after.ppe.find((p) => p.ppeCode === 'chem_suit')?.source).toBe('manual')
  })

  it('manually added library hazard brings its mapped PPE', async () => {
    await addLibraryHazard(tstiId, (await firstStep()).id, 'noise.high')
    const { ppe } = await rows()
    expect(ppe.find((p) => p.ppeCode === 'ear_plugs')?.source).toBe('hazard')
    expect(ppe.find((p) => p.ppeCode === 'ear_muffs')?.source).toBe('hazard')
  })

  it('open flame triggers hot work and HPU approval', async () => {
    const rules = await db.siteRules.toArray()
    const codes = triggeredRules(['open_flame', 'hpu'] satisfies WorkCondition[], rules).map((r) => r.code)
    expect(codes).toContain('MORRIS-HOT')
    expect(codes).toContain('MORRIS-HPU')
  })

  it('concurrent syncs do not duplicate items', async () => {
    await patchRecord('permits', permitId, { workConditions: ['confined_space', 'hot_work'] })
    await Promise.all([applyMandates(tstiId), applyMandates(tstiId), applyMandates(tstiId)])
    const { hazards, controls } = await rows()
    const codes = hazards.map((h) => h.hazardCode)
    expect(new Set(codes).size).toBe(codes.length)
    const keys = controls.map((c) => `${c.stepHazardId}|${c.level}|${c.text}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('refuses to delete a step holding a required hazard', async () => {
    await setWorkConditions(permitId, ['hpu'])
    const { hazards } = await rows()
    await expect(deleteStep(hazards[0]!.stepId)).rejects.toBeInstanceOf(LockedItemError)
  })
})

describe('validation', () => {
  it('STOP Work gate', () => {
    expect(isSubmitDisabled({ stopWorkAcknowledged: false })).toBe(true)
    expect(isSubmitDisabled({ stopWorkAcknowledged: true })).toBe(false)
  })

  it('page 1 requires description, hazards per step, and a control per hazard', async () => {
    await setWorkConditions(permitId, [])
    const step = await firstStep()
    let msgs = validateTstiPage1(await bundle()).map((i) => i.message)
    expect(msgs).toContain('Enter job description.')
    expect(msgs).toContain('Describe at least one task step.')

    await patchRecord('tsti', tstiId, { jobDescription: 'Replace transmitter' })
    await patchRecord('jsaSteps', step.id, { description: 'Isolate and drain' })
    msgs = validateTstiPage1(await bundle()).map((i) => i.message)
    expect(msgs).toEqual(['Step 1: add a hazard.'])

    await putRecord('stepHazards', { id: 'h1', tstiId, stepId: step.id, category: 'pressure', description: 'Trapped pressure', source: 'manual' })
    msgs = validateTstiPage1(await bundle()).map((i) => i.message)
    expect(msgs).toEqual(['Step 1: add a control for "Trapped pressure".'])
  })

  it('closure is blocked until rule acknowledgments exist', async () => {
    await setWorkConditions(permitId, ['ammonia_system'])
    const missing = () => validateClosure(b).filter((i) => i.section === 'rules').map((i) => i.message)
    let b = await bundle()
    expect(missing()).toContain('Ammonia systems: Confirm: All tools and components on this job are stainless steel.')
    await putRecord('ruleAcks', { id: newId(), permitId, ruleCode: 'MORRIS-NH3', requirementKey: 'stainless_only', acknowledgedBy: 'R. Tech', acknowledgedAt: now() })
    b = await bundle()
    expect(missing().some((m) => m.startsWith('Ammonia systems'))).toBe(false)
  })

  it('hot work fire watch must run 30 minutes past work end', async () => {
    await patchRecord('permits', permitId, { workConditions: ['hot_work'], workEndedAt: '2026-10-19T10:00:00.000Z' })
    await putRecord('closures', { id: 'c1', permitId, siteCleanupVerified: true, isolationsRemovedVerified: true, fireWatchBy: 'F. Watch', fireWatchEndedAt: '2026-10-19T10:29:00.000Z' })
    const watchIssue = async () => validateRuleRequirements(await bundle(), 'closure').some((i) => i.message.includes('30 minutes'))
    expect(await watchIssue()).toBe(true)
    await patchRecord('closures', 'c1', { fireWatchEndedAt: '2026-10-19T10:30:00.000Z' })
    expect(await watchIssue()).toBe(false)
  })

  it('an O2-deficient gas test never satisfies a requirement, even if marked acceptable', async () => {
    await patchRecord('permits', permitId, { workConditions: ['confined_space'] })
    const test = { id: 'g1', permitId, testedAt: now(), testedBy: 'T', instrumentId: 'M1', testLocation: 'Manway', continuous: false, analytes: ['o2' as const], o2Pct: 19.2, acceptable: true }
    await putRecord('gasTests', test)
    const o2Issue = async () => validateRuleRequirements(await bundle(), 'sign_off').some((i) => i.message.includes('Pre-entry O2'))
    expect(await o2Issue()).toBe(true)
    await patchRecord('gasTests', 'g1', { o2Pct: 20.9 })
    expect(await o2Issue()).toBe(false)
  })
})
