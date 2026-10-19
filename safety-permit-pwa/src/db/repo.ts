// All writes to field records go through here so every change lands in the outbox
// and rule-mandated items cannot be deleted by any caller, not just the UI.

import type { Table } from 'dexie';
import { db } from './schema';
import { blankPermitFields, blankTstiFields } from './defaults';
import type {
  Control,
  GasTest,
  Isolation,
  JsaStep,
  Permit,
  PermitClosure,
  RuleAck,
  Signature,
  SignatureRole,
  StepHazard,
  Tsti,
  TstiPpe,
} from './types';
import { SITE_ID } from './seed/reference';

export interface FieldTables {
  permits: Permit;
  isolations: Isolation;
  gasTests: GasTest;
  signatures: Signature;
  tsti: Tsti;
  jsaSteps: JsaStep;
  stepHazards: StepHazard;
  controls: Control;
  tstiPpe: TstiPpe;
  ruleAcks: RuleAck;
  closures: PermitClosure;
}
export type FieldTableName = keyof FieldTables;

/** Thrown when something tries to delete an item a site rule or hazard requires. */
export class LockedItemError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LockedItemError';
  }
}

export const newId = (): string => crypto.randomUUID();
export const now = (): string => new Date().toISOString();

function table<K extends FieldTableName>(name: K): Table<FieldTables[K], string> {
  return db.table<FieldTables[K], string>(name);
}

/** Record a pending change. Repeat saves of the same record coalesce into one entry. */
async function enqueue(tableName: FieldTableName, recordId: string, op: 'put' | 'delete'): Promise<void> {
  const existing = await db.outbox.where('[table+recordId]').equals([tableName, recordId]).first();
  if (existing?.seq !== undefined) {
    await db.outbox.update(existing.seq, { op, createdAt: now() });
  } else {
    await db.outbox.add({ table: tableName, recordId, op, createdAt: now() });
  }
}

export async function putRecord<K extends FieldTableName>(name: K, rec: FieldTables[K]): Promise<void> {
  await db.transaction('rw', [table(name), db.outbox], async () => {
    await table(name).put(rec);
    await enqueue(name, rec.id, 'put');
  });
}

export async function patchRecord<K extends FieldTableName>(
  name: K,
  id: string,
  changes: Partial<FieldTables[K]>,
): Promise<void> {
  await db.transaction('rw', [table(name), db.outbox], async () => {
    const current = await table(name).get(id);
    if (!current) throw new Error(`${name} ${id} not found`);
    const next = { ...current, ...changes } as FieldTables[K];
    if ('updatedAt' in next) (next as { updatedAt: string }).updatedAt = now();
    await table(name).put(next);
    await enqueue(name, id, 'put');
  });
}

async function removeRecord(name: FieldTableName, id: string): Promise<void> {
  await table(name).delete(id);
  await enqueue(name, id, 'delete');
}

// ---------- Creation ----------

/** Number of task step rows a new TSTI starts with (matches the paper form). */
export const DEFAULT_STEP_COUNT = 5;

/** Create a draft permit with its TSTI and empty step rows. */
export async function createPermitDraft(permitNumber = ''): Promise<{ permitId: string; tstiId: string }> {
  const permitId = newId();
  const tstiId = newId();
  const ts = now();
  const permit: Permit = {
    id: permitId,
    siteId: SITE_ID,
    permitNumber,
    date: ts,
    ...blankPermitFields(),
    status: 'draft',
    createdAt: ts,
    updatedAt: ts,
  };
  const tsti: Tsti = {
    id: tstiId,
    permitId,
    date: ts,
    ...blankTstiFields(),
    stopWorkAcknowledged: false,
    createdAt: ts,
    updatedAt: ts,
  };
  await db.transaction('rw', [db.permits, db.tsti, db.jsaSteps, db.outbox], async () => {
    await putRecord('permits', permit);
    await putRecord('tsti', tsti);
    for (let seq = 1; seq <= DEFAULT_STEP_COUNT; seq++) {
      await putRecord('jsaSteps', { id: newId(), tstiId, seq, description: '' });
    }
  });
  return { permitId, tstiId };
}

/** Upsert the one signature for a permit/doc/role. A blank name removes it. */
export async function setSignature(
  permitId: string,
  docType: Signature['docType'],
  role: SignatureRole,
  changes: { name?: string; signedAt?: string; badgeOrEmployeeId?: string },
): Promise<void> {
  await db.transaction('rw', [db.signatures, db.outbox], async () => {
    const existing = await db.signatures.where('[permitId+docType+role]').equals([permitId, docType, role]).first();
    const next: Signature = { id: existing?.id ?? newId(), permitId, docType, role, name: '', signedAt: '', ...existing, ...changes };
    if (!next.name.trim() && !next.signedAt && !next.badgeOrEmployeeId) {
      if (existing) await removeRecord('signatures', existing.id);
      return;
    }
    await putRecord('signatures', next);
  });
}

/** Record or clear a site rule acknowledgment. */
export async function setRuleAck(permitId: string, ruleCode: string, requirementKey: string, acknowledgedBy: string | null): Promise<void> {
  await db.transaction('rw', [db.ruleAcks, db.outbox], async () => {
    const existing = await db.ruleAcks.where('[permitId+ruleCode+requirementKey]').equals([permitId, ruleCode, requirementKey]).first();
    if (acknowledgedBy === null || !acknowledgedBy.trim()) {
      if (existing) await removeRecord('ruleAcks', existing.id);
      return;
    }
    const ack: RuleAck = { id: existing?.id ?? newId(), permitId, ruleCode, requirementKey, acknowledgedBy, acknowledgedAt: existing?.acknowledgedAt ?? now() };
    await putRecord('ruleAcks', ack);
  });
}

export async function addGasTest(permitId: string): Promise<void> {
  const test: GasTest = { id: newId(), permitId, testedAt: now(), testedBy: '', instrumentId: '', testLocation: '', continuous: false, analytes: [], acceptable: null };
  await putRecord('gasTests', test);
}

export async function deleteGasTest(id: string): Promise<void> {
  await db.transaction('rw', [db.gasTests, db.outbox], () => removeRecord('gasTests', id));
}

/** Get the closure record for a permit, creating a blank one if needed. */
export async function ensureClosure(permitId: string): Promise<PermitClosure> {
  const existing = await db.closures.where('permitId').equals(permitId).first();
  if (existing) return existing;
  const closure: PermitClosure = { id: newId(), permitId, answers: {} };
  await putRecord('closures', closure);
  return closure;
}

export async function addStep(tstiId: string): Promise<void> {
  await db.transaction('rw', [db.jsaSteps, db.outbox], async () => {
    const last = await db.jsaSteps.where('[tstiId+seq]').between([tstiId, -Infinity], [tstiId, Infinity]).last();
    await putRecord('jsaSteps', { id: newId(), tstiId, seq: (last?.seq ?? 0) + 1, description: '' });
  });
}

// ---------- Guarded deletes ----------

export const isLocked = (item: { source: string }): boolean => item.source !== 'manual';

/** Delete a manual hazard and every control under it. */
export async function deleteStepHazard(id: string): Promise<void> {
  await db.transaction('rw', [db.stepHazards, db.controls, db.outbox], async () => {
    const hz = await db.stepHazards.get(id);
    if (!hz) return;
    if (isLocked(hz)) throw new LockedItemError(`Required by ${hz.sourceRef ?? 'site rule'}. Cannot delete.`);
    const children = await db.controls.where('stepHazardId').equals(id).toArray();
    for (const c of children) await removeRecord('controls', c.id);
    await removeRecord('stepHazards', id);
  });
}

export async function deleteControl(id: string): Promise<void> {
  await db.transaction('rw', [db.controls, db.outbox], async () => {
    const c = await db.controls.get(id);
    if (!c) return;
    if (isLocked(c)) throw new LockedItemError(`Required by ${c.sourceRef ?? 'hazard'}. Cannot delete.`);
    await removeRecord('controls', id);
  });
}

export async function deleteTstiPpe(id: string): Promise<void> {
  await db.transaction('rw', [db.tstiPpe, db.outbox], async () => {
    const p = await db.tstiPpe.get(id);
    if (!p) return;
    if (isLocked(p)) throw new LockedItemError(`Required by ${p.requiredBy.join(', ') || 'baseline'}. Cannot delete.`);
    await removeRecord('tstiPpe', id);
  });
}

/** Delete a step and its manual hazards. Refused if it still holds a required hazard. */
export async function deleteStep(id: string): Promise<void> {
  await db.transaction('rw', [db.jsaSteps, db.stepHazards, db.controls, db.outbox], async () => {
    const step = await db.jsaSteps.get(id);
    if (!step) return;
    const count = await db.jsaSteps.where('tstiId').equals(step.tstiId).count();
    if (count <= 1) throw new LockedItemError('TSTI needs at least one step.');
    const hazards = await db.stepHazards.where('stepId').equals(id).toArray();
    const locked = hazards.find(isLocked);
    if (locked) throw new LockedItemError(`Move "${locked.description}" to another step first.`);
    for (const h of hazards) await deleteStepHazard(h.id);
    await removeRecord('jsaSteps', id);
    // Renumber the remaining steps so the sequence has no gaps.
    const rest = await db.jsaSteps.where('[tstiId+seq]').between([step.tstiId, -Infinity], [step.tstiId, Infinity]).toArray();
    for (const [i, s] of rest.entries()) {
      if (s.seq !== i + 1) await putRecord('jsaSteps', { ...s, seq: i + 1 });
    }
  });
}
