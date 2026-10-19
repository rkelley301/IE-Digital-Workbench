// Hazard auto-suggestion and PPE enforcement.
//
// The pure functions decide what the permit's work conditions and hazards require.
// applyMandates() makes the database match: it adds anything missing and marks it
// locked (source !== 'manual'). When a condition is unchecked, items it required are
// downgraded to 'manual' rather than deleted, so nothing the technician wrote under
// them disappears and the technician decides whether to keep them.

import { db } from '../db/schema';
import { deleteTstiPpe, newId, now, patchRecord, putRecord } from '../db/repo';
import { seedReady } from '../db/seed';
import { BASELINE_PPE, HOT_WORK_TASKS, MANDATED_FORM_CHECKS, PTW1_CONDITION_MAP } from '../db/seed/reference';
import type { RecognitionKey } from '../forms/templates';
import type {
  Control,
  ControlLevel,
  Hazard,
  Permit,
  SiteRule,
  StepHazard,
  Tsti,
  TstiPpe,
  WorkCondition,
} from '../db/types';

export interface ReferenceData {
  hazards: Hazard[];
  rules: SiteRule[];
}

export interface MandatedHazard {
  hazard: Hazard;
  source: 'site_rule' | 'hazard';
  /** Rule code, or the work condition that triggered the hazard. */
  sourceRef: string;
}

export interface MandatedControl {
  level: ControlLevel;
  text: string;
  source: 'site_rule' | 'hazard';
  sourceRef: string;
}

export interface MandatedPpe {
  ppeCode: string;
  source: 'baseline' | 'site_rule' | 'hazard';
  /** 'baseline' and/or hazard codes. */
  requiredBy: string[];
}

// ---------- Pure rules ----------

/** Work conditions implied by the PTW 1 boxes, the app-only triggers, and hot work tasks. */
export function deriveWorkConditions(
  p: Pick<Permit, 'workActivities' | 'chemicals' | 'siteConditions' | 'hotWorkTasks'>,
): WorkCondition[] {
  const out = new Set<WorkCondition>(p.siteConditions);
  for (const a of p.workActivities) for (const c of PTW1_CONDITION_MAP.workActivities[a] ?? []) out.add(c);
  for (const ch of p.chemicals) for (const c of PTW1_CONDITION_MAP.chemicals[ch] ?? []) out.add(c);
  for (const t of p.hotWorkTasks) for (const c of HOT_WORK_TASKS.find((h) => h.key === t)?.sets ?? []) out.add(c);
  return expandConditions([...out]);
}

export interface MandatedFormChecks {
  /** Form 4 box key -> rule code that requires it. */
  safeWorkPractices: Map<string, string>;
  basicSafeguards: Map<string, string>;
}

/** Form 4 Safe Work Practices / Basic Safeguards boxes the site rules lock on. */
export function mandatedFormChecks(conditions: readonly WorkCondition[]): MandatedFormChecks {
  const conds = expandConditions(conditions);
  const out: MandatedFormChecks = { safeWorkPractices: new Map(), basicSafeguards: new Map() };
  for (const m of MANDATED_FORM_CHECKS) {
    if (!conds.includes(m.condition)) continue;
    for (const k of m.safeWorkPractices) out.safeWorkPractices.set(k, m.ruleCode);
    for (const k of m.basicSafeguards) out.basicSafeguards.set(k, m.ruleCode);
  }
  return out;
}

/** Open flame is always hot work. */
export function expandConditions(conditions: readonly WorkCondition[]): WorkCondition[] {
  const set = new Set(conditions);
  if (set.has('open_flame')) set.add('hot_work');
  return [...set];
}

export function triggeredRules(conditions: readonly WorkCondition[], rules: readonly SiteRule[]): SiteRule[] {
  const conds = new Set(expandConditions(conditions));
  return rules.filter((r) => r.triggers.some((t) => conds.has(t)));
}

/** Hazards the work conditions force onto the TSTI. Rule-added beats trigger-added. */
export function mandatedHazards(conditions: readonly WorkCondition[], ref: ReferenceData): MandatedHazard[] {
  const conds = expandConditions(conditions);
  const byCode = new Map<string, MandatedHazard>();

  for (const rule of triggeredRules(conds, ref.rules)) {
    for (const code of rule.addsHazards) {
      const hazard = ref.hazards.find((h) => h.code === code);
      if (hazard && !byCode.has(code)) byCode.set(code, { hazard, source: 'site_rule', sourceRef: rule.code });
    }
  }
  for (const hazard of ref.hazards) {
    const hit = hazard.triggers.find((t) => conds.includes(t));
    if (hit && !byCode.has(hazard.code)) byCode.set(hazard.code, { hazard, source: 'hazard', sourceRef: hit });
  }
  return [...byCode.values()];
}

/**
 * Controls required under a hazard row: the hazard's mapped controls, plus any
 * rule 'control' requirements for rules that add this hazard.
 */
export function mandatedControls(
  hazardCode: string,
  conditions: readonly WorkCondition[],
  ref: ReferenceData,
): MandatedControl[] {
  const hazard = ref.hazards.find((h) => h.code === hazardCode);
  if (!hazard) return [];
  const rules = triggeredRules(conditions, ref.rules).filter((r) => r.addsHazards.includes(hazardCode));
  const ruleRef = rules[0]?.code;
  const out: MandatedControl[] = [];
  const add = (c: MandatedControl) => {
    const dup = out.find((o) => o.level === c.level && o.text === c.text);
    if (!dup) out.push(c);
    else if (c.source === 'site_rule') Object.assign(dup, c);
  };

  for (const rule of rules) {
    for (const req of rule.requirements) {
      if (req.kind === 'control') add({ level: req.level, text: req.text, source: 'site_rule', sourceRef: rule.code });
    }
  }
  for (const c of hazard.suggestedControls) {
    add(ruleRef
      ? { ...c, source: 'site_rule', sourceRef: ruleRef }
      : { ...c, source: 'hazard', sourceRef: hazard.code });
  }
  return out;
}

/** Baseline PPE plus the PPE mapped to every hazard present on the TSTI. */
export function mandatedPpe(
  presentHazardCodes: Iterable<string>,
  ruleHazardCodes: ReadonlySet<string>,
  ref: ReferenceData,
): MandatedPpe[] {
  const rank = { hazard: 0, site_rule: 1, baseline: 2 } as const;
  const byCode = new Map<string, MandatedPpe>();
  const add = (ppeCode: string, source: MandatedPpe['source'], by: string) => {
    const cur = byCode.get(ppeCode);
    if (!cur) {
      byCode.set(ppeCode, { ppeCode, source, requiredBy: [by] });
      return;
    }
    if (!cur.requiredBy.includes(by)) cur.requiredBy.push(by);
    if (rank[source] > rank[cur.source]) cur.source = source;
  };

  for (const code of BASELINE_PPE) add(code, 'baseline', 'baseline');
  for (const code of new Set(presentHazardCodes)) {
    const hazard = ref.hazards.find((h) => h.code === code);
    if (!hazard) continue;
    const source = ruleHazardCodes.has(code) ? 'site_rule' : 'hazard';
    for (const ppe of hazard.requiredPpe) add(ppe, source, code);
  }
  return [...byCode.values()];
}

// ---------- Database sync ----------

export async function loadReference(): Promise<ReferenceData> {
  const [hazards, rules] = await Promise.all([db.hazards.toArray(), db.siteRules.toArray()]);
  return { hazards, rules };
}

const sameList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

// Serialize syncs so overlapping calls (e.g. React StrictMode double effects)
// cannot both decide an item is missing and add it twice.
let queue: Promise<unknown> = Promise.resolve();

/** Make the TSTI's hazards, controls and PPE match what the permit requires. */
export function applyMandates(tstiId: string): Promise<void> {
  const run = queue.then(() => syncTsti(tstiId));
  queue = run.catch(() => undefined);
  return run;
}

async function syncTsti(tstiId: string): Promise<void> {
  // On first launch the reference tables may still be loading; an empty hazard
  // library would silently apply no mandates.
  await seedReady();
  const tables = [db.permits, db.tsti, db.jsaSteps, db.stepHazards, db.controls, db.tstiPpe, db.hazards, db.siteRules, db.outbox];
  await db.transaction('rw', tables, async () => {
    const tsti = await db.tsti.get(tstiId);
    if (!tsti) return;
    const permit = await db.permits.get(tsti.permitId);
    // Closed or voided permits are a record; never rewrite them.
    if (!permit || permit.status === 'closed' || permit.status === 'void') return;

    const ref = await loadReference();
    const conds = expandConditions(permit.workConditions);
    const required = mandatedHazards(conds, ref);
    const requiredCodes = new Set(required.map((m) => m.hazard.code));
    const ruleHazardCodes = new Set(required.filter((m) => m.source === 'site_rule').map((m) => m.hazard.code));

    // 1. Hazards
    let steps = await db.jsaSteps.where('[tstiId+seq]').between([tstiId, -Infinity], [tstiId, Infinity]).toArray();
    if (steps.length === 0) {
      const step = { id: newId(), tstiId, seq: 1, description: '' };
      await putRecord('jsaSteps', step);
      steps = [step];
    }
    const firstStepId = steps[0]!.id;
    const hazards = await db.stepHazards.where('tstiId').equals(tstiId).toArray();

    for (const m of required) {
      const existing = hazards.find((h) => h.hazardCode === m.hazard.code);
      if (!existing) {
        const row: StepHazard = {
          id: newId(),
          tstiId,
          stepId: firstStepId, // technician moves it to the right step
          hazardCode: m.hazard.code,
          recognitionKeys: m.hazard.recognitionKeys,
          description: m.hazard.name,
          source: m.source,
          sourceRef: m.sourceRef,
        };
        await putRecord('stepHazards', row);
        hazards.push(row);
      } else if (existing.source !== m.source || existing.sourceRef !== m.sourceRef) {
        await patchRecord('stepHazards', existing.id, { source: m.source, sourceRef: m.sourceRef });
        Object.assign(existing, { source: m.source, sourceRef: m.sourceRef });
      }
    }
    // Keep coded hazards' recognition boxes in step with the reference library.
    for (const h of hazards) {
      const keys = h.hazardCode ? ref.hazards.find((x) => x.code === h.hazardCode)?.recognitionKeys : undefined;
      if (keys && !sameList(h.recognitionKeys, keys)) {
        await patchRecord('stepHazards', h.id, { recognitionKeys: keys });
        h.recognitionKeys = keys;
      }
    }
    for (const h of hazards) {
      const stillRequired = h.hazardCode !== undefined && requiredCodes.has(h.hazardCode);
      if (h.source !== 'manual' && !stillRequired) {
        await patchRecord('stepHazards', h.id, { source: 'manual', sourceRef: undefined });
        Object.assign(h, { source: 'manual', sourceRef: undefined });
      }
    }

    // 2. Controls under each hazard row
    const controls = await db.controls.where('tstiId').equals(tstiId).toArray();
    for (const h of hazards) {
      const own = controls.filter((c) => c.stepHazardId === h.id);
      const needed = h.hazardCode ? mandatedControls(h.hazardCode, conds, ref) : [];
      for (const n of needed) {
        const match = own.find((c) => c.level === n.level && c.text === n.text);
        if (!match) {
          const row: Control = { id: newId(), tstiId, stepHazardId: h.id, ...n };
          await putRecord('controls', row);
        } else if (match.source !== n.source || match.sourceRef !== n.sourceRef) {
          await patchRecord('controls', match.id, { source: n.source, sourceRef: n.sourceRef });
        }
      }
      for (const c of own) {
        const stillNeeded = needed.some((n) => n.level === c.level && n.text === c.text);
        if (c.source !== 'manual' && !stillNeeded) await patchRecord('controls', c.id, { source: 'manual', sourceRef: undefined });
      }
    }

    // 3. PPE matrix
    const present = hazards.flatMap((h) => (h.hazardCode ? [h.hazardCode] : []));
    const ppeNeeded = mandatedPpe(present, ruleHazardCodes, ref);
    const ppeRows = await db.tstiPpe.where('tstiId').equals(tstiId).toArray();
    for (const n of ppeNeeded) {
      const row = ppeRows.find((p) => p.ppeCode === n.ppeCode);
      if (!row) {
        const created: TstiPpe = { id: newId(), tstiId, ppeCode: n.ppeCode, source: n.source, requiredBy: n.requiredBy };
        await putRecord('tstiPpe', created);
      } else if (row.source !== n.source || !sameList(row.requiredBy, n.requiredBy)) {
        await patchRecord('tstiPpe', row.id, { source: n.source, requiredBy: n.requiredBy });
      }
    }
    for (const row of ppeRows) {
      if (row.source !== 'manual' && !ppeNeeded.some((n) => n.ppeCode === row.ppeCode)) {
        await patchRecord('tstiPpe', row.id, { source: 'manual', requiredBy: [] });
      }
    }

    // 4. Form 4 boxes the site rules require
    const forms = mandatedFormChecks(conds);
    const swp = union(tsti.safeWorkPractices, forms.safeWorkPractices.keys());
    const safeguards = union(tsti.basicSafeguards, forms.basicSafeguards.keys());
    if (swp.length !== tsti.safeWorkPractices.length || safeguards.length !== tsti.basicSafeguards.length) {
      await patchRecord('tsti', tstiId, {
        safeWorkPractices: swp as Tsti['safeWorkPractices'],
        basicSafeguards: safeguards as Tsti['basicSafeguards'],
      });
    }
  });
}

const union = (a: readonly string[], b: Iterable<string>): string[] => [...new Set([...a, ...b])];

// ---------- Technician additions (always 'manual', always deletable) ----------

/** Add a hazard from the reference library. Its mapped controls and PPE follow automatically. */
export async function addLibraryHazard(tstiId: string, stepId: string, hazardCode: string): Promise<void> {
  const hazard = await db.hazards.get(hazardCode);
  if (!hazard) throw new Error(`Unknown hazard ${hazardCode}`);
  await putRecord('stepHazards', {
    id: newId(),
    tstiId,
    stepId,
    hazardCode,
    recognitionKeys: hazard.recognitionKeys,
    description: hazard.name,
    source: 'manual',
  });
  await applyMandates(tstiId);
}

/** Job-specific hazard the library does not cover (e.g. a pinch point on this flange). */
export async function addCustomHazard(
  tstiId: string,
  stepId: string,
  recognitionKey: RecognitionKey,
  description: string,
): Promise<void> {
  const text = description.trim();
  if (!text) throw new Error('Describe the hazard.');
  await putRecord('stepHazards', { id: newId(), tstiId, stepId, recognitionKeys: [recognitionKey], description: text, source: 'manual' });
}

export async function moveStepHazard(stepHazardId: string, stepId: string): Promise<void> {
  await patchRecord('stepHazards', stepHazardId, { stepId });
}

export async function addManualControl(
  tstiId: string,
  stepHazardId: string,
  level: ControlLevel,
  text: string,
): Promise<void> {
  const t = text.trim();
  if (!t) throw new Error('Enter the control.');
  await putRecord('controls', { id: newId(), tstiId, stepHazardId, level, text: t, source: 'manual' });
}

/** Check or uncheck a PPE / gloves box. Unchecking a required box is refused. */
export async function setPpeChecked(tstiId: string, ppeCode: string, checked: boolean): Promise<void> {
  const existing = await db.tstiPpe.where('[tstiId+ppeCode]').equals([tstiId, ppeCode]).first();
  if (checked && !existing) {
    await putRecord('tstiPpe', { id: newId(), tstiId, ppeCode, source: 'manual', requiredBy: [] });
  } else if (!checked && existing) {
    await deleteTstiPpe(existing.id);
  }
}

type PermitFormChanges = Partial<
  Pick<Permit, 'permitNumber' | 'date' | 'workActivities' | 'workAreas' | 'generalConsiderations' | 'hazardousConditions' | 'chemicals' | 'chemicalsOther' | 'siteConditions' | 'hotWorkTasks' | 'safetyCheck' | 'rescuePlan'>
>;

/** Save PTW fields; when trigger boxes change, re-derive conditions and everything they require. */
export async function updatePermitForm(permitId: string, changes: PermitFormChanges): Promise<void> {
  const permit = await db.permits.get(permitId);
  if (!permit) throw new Error('Permit not found.');
  const next = { ...permit, ...changes };
  const workConditions = deriveWorkConditions(next);
  const conditionsChanged = !sameList(workConditions, permit.workConditions);
  await patchRecord('permits', permitId, { ...changes, workConditions, updatedAt: now() });
  if (conditionsChanged) {
    const tstis = await db.tsti.where('permitId').equals(permitId).toArray();
    for (const t of tstis) await applyMandates(t.id);
  }
}
