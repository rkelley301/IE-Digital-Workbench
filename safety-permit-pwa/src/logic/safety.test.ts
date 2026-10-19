import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/schema'
import { ensureSeed } from '../db/seed'
import { BASELINE_PPE } from '../db/seed/reference'
import { LockedItemError, createPermitDraft, deleteControl, deleteStep, deleteStepHazard, deleteTstiPpe, newId, now, patchRecord, putRecord } from '../db/repo'
import type { WorkCondition } from '../db/types'
import { addLibraryHazard, applyMandates, deriveWorkConditions, setPpeChecked, triggeredRules, updatePermitForm } from './safetyEngine'
import { CLOSURE_QUESTIONS, SAFETY_CHECK } from '../forms/templates'
import { BlockedError, activatePermit } from './permitActions'
import { isSubmitDisabled, loadBundle, validateClosure, validateRuleRequirements, validateSafetyCheck, validateTstiPage1, type PermitBundle } from './validation'

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
    await updatePermitForm(permitId, { siteConditions: ['hpu'] })
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
    await updatePermitForm(permitId, { chemicals: ['methyl_chloride'] })
    const { controls, ppe } = await rows()
    expect(controls.some((c) => c.text === 'Continuous gas monitoring for methyl chloride' && c.source === 'site_rule')).toBe(true)
    for (const code of ['chem_resistant_clothing', 'gloves_chemical', 'face_shield']) {
      expect(ppe.find((p) => p.ppeCode === code)).toMatchObject({ source: 'site_rule', requiredBy: ['chemical.methyl_chloride'] })
    }
  })

  it('unchecking a condition downgrades its items to manual instead of deleting them', async () => {
    await updatePermitForm(permitId, { chemicals: ['methyl_chloride'] })
    await updatePermitForm(permitId, { chemicals: [] })
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
    expect(after.ppe.find((p) => p.ppeCode === 'chem_resistant_clothing')?.source).toBe('manual')
  })

  it('manually added library hazard brings its mapped PPE', async () => {
    await addLibraryHazard(tstiId, (await firstStep()).id, 'noise.high')
    const { ppe } = await rows()
    expect(ppe.find((p) => p.ppeCode === 'hearing_protection')?.source).toBe('hazard')
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
    await updatePermitForm(permitId, { siteConditions: ['hpu'] })
    const { hazards } = await rows()
    await expect(deleteStep(hazards[0]!.stepId)).rejects.toBeInstanceOf(LockedItemError)
  })
})

describe('validation', () => {
  it('STOP Work gate', () => {
    expect(isSubmitDisabled({ stopWorkAcknowledged: false })).toBe(true)
    expect(isSubmitDisabled({ stopWorkAcknowledged: true })).toBe(false)
  })

  it('page 1: JSA needs a hazard per step and a control per hazard', async () => {
    const step = await firstStep()
    const jsa = async () => validateTstiPage1(await bundle()).map((i) => i.message).filter((m) => /Step|Basic Task Step/.test(m))
    expect(await jsa()).toContain('Describe at least one Basic Task Step.')
    await patchRecord('jsaSteps', step.id, { description: 'Isolate and drain' })
    expect(await jsa()).toEqual(['Step 1: add a Potential Hazard.'])
    await putRecord('stepHazards', { id: 'h1', tstiId, stepId: step.id, recognitionKeys: ['line_equip_under_pressure'], description: 'Trapped pressure', source: 'manual' })
    expect(await jsa()).toEqual(['Step 1: add an Action to Eliminate or Control "Trapped pressure".'])
  })

  it('page 1: every JSA hazard needs its Hazard Recognition box checked', async () => {
    await updatePermitForm(permitId, { siteConditions: ['hpu'] })
    const recog = async () => validateTstiPage1(await bundle()).map((i) => i.message).filter((m) => m.includes('Hazard Recognition'))
    expect(await recog()).toEqual(['"Hydrogen (HPU)" is in the JSA. Check Hazard Recognition: Physical: Flammable Material.'])
    await patchRecord('tsti', tstiId, { hazardRecognition: ['flammable_material'] })
    expect(await recog()).toEqual([])
  })

  it('page 1: leader questions 1-8 answered No block; Q9 Yes needs Q10', async () => {
    const leader = async () => validateTstiPage1(await bundle()).map((i) => i.message).filter((m) => m.includes('Leader Question'))
    expect(await leader()).toHaveLength(9)
    const all = { q1: 'yes', q2: 'yes', q3: 'yes', q4: 'yes', q5: 'no', q6: 'yes', q7: 'yes', q8: 'yes', q9: 'yes' } as const
    await patchRecord('tsti', tstiId, { leaderAnswers: all })
    expect(await leader()).toEqual([
      'Leader Question 5. Comfortable with STOP work? is No. Resolve before work starts.',
      'Answer Leader Question 10. What would it mean if you did?',
    ])
  })

  it('page 2: rule-mandated Form 4 boxes are auto-checked and PPE locks hold', async () => {
    await updatePermitForm(permitId, { workActivities: ['confined_space_entry'] })
    const t = (await db.tsti.get(tstiId))!
    expect(t.safeWorkPractices).toContain('confined_space_entry')
    expect(t.basicSafeguards).toEqual(expect.arrayContaining(['attendant', 'ventilation_exhaust']))
    await expect(setPpeChecked(tstiId, 'head_protection', false)).rejects.toBeInstanceOf(LockedItemError)
    await setPpeChecked(tstiId, 'goggles', true)
    await setPpeChecked(tstiId, 'goggles', false)
    expect((await rows()).ppe.some((p) => p.ppeCode === 'goggles')).toBe(false)
  })

  it('PTW 1 boxes drive the site rules', () => {
    const base = { workActivities: [], chemicals: [], siteConditions: [], hotWorkTasks: [] }
    expect(deriveWorkConditions({ ...base, workActivities: ['confined_space_entry'] })).toEqual(['confined_space'])
    expect(deriveWorkConditions({ ...base, chemicals: ['hydrogen', 'methyl_chloride'] }).sort()).toEqual(['hpu', 'methyl_chloride'])
    expect(deriveWorkConditions({ ...base, hotWorkTasks: ['open_flame'] }).sort()).toEqual(['hot_work', 'open_flame'])
    expect(deriveWorkConditions({ ...base, chemicals: ['formaldehyde'] })).toEqual([])
  })

  it('Safety Check must be fully answered with no "No"', async () => {
    const msgs = async () => validateSafetyCheck(await bundle()).map((i) => i.message)
    expect(await msgs()).toHaveLength(8)
    const answers = Object.fromEntries(SAFETY_CHECK.map((q) => [q.key, 'yes'])) as Record<string, 'yes'>
    await updatePermitForm(permitId, { safetyCheck: { ...answers, ventilation: 'no' } })
    expect(await msgs()).toEqual(['Safety Check: "Is sufficient ventilation available?" is No. Work cannot start.'])
  })

  it('closure: every question answered, and a "No" must be reported', async () => {
    await patchRecord('permits', permitId, { status: 'active' })
    await putRecord('closures', { id: 'c1', permitId, answers: {} })
    const q = async () => validateClosure(await bundle()).map((i) => i.message).filter((m) => m.startsWith('Permit Closure'))
    expect(await q()).toHaveLength(8)
    const answers = Object.fromEntries(CLOSURE_QUESTIONS.map((x) => [x.key, 'yes'])) as Record<string, 'yes'>
    await patchRecord('closures', 'c1', { answers: { ...answers, locks_removed: 'no' } })
    expect(await q()).toEqual(['Permit Closure has a "No" answer. Enter the manager it was reported to.'])
    await patchRecord('closures', 'c1', { noAnswersReportedTo: 'J. Manager' })
    expect(await q()).toEqual([])
  })

  it('activatePermit refuses without STOP Work and with open items', async () => {
    await expect(activatePermit(permitId)).rejects.toThrow('Acknowledge STOP Work Authority.')
    await patchRecord('tsti', tstiId, { stopWorkAcknowledged: true, stopWorkAckBy: 'R. Tech' })
    await expect(activatePermit(permitId)).rejects.toBeInstanceOf(BlockedError)
    expect((await db.permits.get(permitId))!.status).toBe('draft')
  })

  it('closure is blocked until rule acknowledgments exist', async () => {
    await updatePermitForm(permitId, { chemicals: ['ammonia'] })
    const missing = () => validateClosure(b).filter((i) => i.section === 'rules').map((i) => i.message)
    let b = await bundle()
    expect(missing()).toContain('Ammonia systems: Confirm: All tools and components on this job are stainless steel.')
    await putRecord('ruleAcks', { id: newId(), permitId, ruleCode: 'MORRIS-NH3', requirementKey: 'stainless_only', acknowledgedBy: 'R. Tech', acknowledgedAt: now() })
    b = await bundle()
    expect(missing().some((m) => m.startsWith('Ammonia systems'))).toBe(false)
  })

  it('hot work fire watch must run 30 minutes past work end', async () => {
    await patchRecord('permits', permitId, { workConditions: ['hot_work'], workEndedAt: '2026-10-19T10:00:00.000Z' })
    await putRecord('closures', { id: 'c1', permitId, answers: {}, fireWatchBy: 'F. Watch', fireWatchEndedAt: '2026-10-19T10:29:00.000Z' })
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
