import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { expect, it } from 'vitest'

// v2 schema as shipped before the template rebuild.
const V1 = {
  permits: 'id, permitNumber, status, date, siteId, updatedAt, *workConditions',
  isolations: 'id, permitId',
  gasTests: 'id, permitId, testedAt',
  signatures: 'id, permitId, [permitId+docType+role]',
  tsti: 'id, permitId',
  jsaSteps: 'id, tstiId, [tstiId+seq]',
  stepHazards: 'id, tstiId, stepId, hazardCode',
  controls: 'id, tstiId, stepHazardId',
  tstiPpe: 'id, tstiId, &[tstiId+ppeCode]',
  ruleAcks: 'id, permitId, &[permitId+ruleCode+requirementKey]',
  closures: 'id, &permitId',
  hazards: '&code, category, *triggers, *requiredPpe',
  ppeItems: '&code, baseline',
  siteRules: '&code, siteId, *triggers',
  trainingScenarios: '&id',
  trainingAttempts: 'id, scenarioId, startedAt',
  outbox: '++seq, table, recordId',
  meta: '&key',
}

it('v2 drafts migrate to the template shape', async () => {
  const old = new Dexie('tsti-permits')
  old.version(1).stores(V1)
  old.version(2).stores({ outbox: '++seq, table, recordId, [table+recordId]' })
  await old.open()
  await old.table('permits').put({ id: 'p1', permitNumber: 'P-9', status: 'draft', date: '2026-10-19T00:00:00Z', location: 'X', equipment: 'Y', workConditions: ['hpu'], createdAt: 'a', updatedAt: 'a' })
  await old.table('tsti').put({ id: 't1', permitId: 'p1', jobDescription: 'Swap PT-101', crewNames: [], hazardChecklist: {}, stopWorkAcknowledged: false, createdAt: '2026-10-19T00:00:00Z', updatedAt: 'a' })
  await old.table('stepHazards').put({ id: 'h1', tstiId: 't1', stepId: 's1', category: 'chemical', description: 'x', source: 'manual' })
  await old.table('tstiPpe').put({ id: 'pp1', tstiId: 't1', ppeCode: 'chem_suit', source: 'baseline', requiredBy: [], confirmed: false })
  await old.table('signatures').bulkPut([
    { id: 's1', permitId: 'p1', docType: 'ptw', role: 'receiver', name: 'A', signedAt: 'a' },
    { id: 's2', permitId: 'p1', docType: 'ptw', role: 'safety', name: 'B', signedAt: 'a' },
  ])
  old.close()

  const { db } = await import('./schema')
  await db.open()
  const permit = (await db.permits.get('p1'))!
  expect(permit.workActivities).toEqual([])
  expect(permit.workConditions).toEqual([]) // re-derived from the (empty) new boxes
  expect('location' in permit).toBe(false)
  const tsti = (await db.tsti.get('t1'))!
  expect(tsti.planning.jobDescription).toBe('Swap PT-101')
  expect(tsti.leaderAnswers).toEqual({})
  expect((await db.stepHazards.get('h1'))!.recognitionKeys).toEqual([])
  expect(await db.tstiPpe.count()).toBe(0)
  expect((await db.signatures.toArray()).map((s) => s.role)).toEqual(['acceptor'])
})
