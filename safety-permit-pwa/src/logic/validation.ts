// Sign-off blocker. Every check is a pure function over a loaded PermitBundle and
// returns terse, imperative issues. An empty list means the gate is open.

import { db } from '../db/schema';
import { O2_DEFICIENT_BELOW_PCT } from '../db/seed/reference';
import type {
  Control,
  GasAnalyte,
  GasTest,
  Hazard,
  HazardCategory,
  Isolation,
  JsaStep,
  Permit,
  PermitClosure,
  PpeItem,
  RuleAck,
  RuleRequirement,
  Signature,
  SignatureRole,
  SiteRule,
  StepHazard,
  Tsti,
  TstiPpe,
} from '../db/types';
import { expandConditions, triggeredRules } from './safetyEngine';

export type Section = 'ptw' | 'tsti1' | 'tsti2' | 'rules' | 'closure';

export interface Issue {
  section: Section;
  message: string;
  /** Record the issue points at, for scroll-to / highlight. */
  targetId?: string;
}

export interface PermitBundle {
  permit: Permit;
  isolations: Isolation[];
  gasTests: GasTest[];
  signatures: Signature[];
  tsti: Tsti;
  steps: JsaStep[]; // sorted by seq
  stepHazards: StepHazard[];
  controls: Control[];
  tstiPpe: TstiPpe[];
  ruleAcks: RuleAck[];
  closure?: PermitClosure;
  rules: SiteRule[];
  hazards: Hazard[];
  ppeItems: PpeItem[];
}

export async function loadBundle(permitId: string): Promise<PermitBundle | undefined> {
  const permit = await db.permits.get(permitId);
  const tsti = await db.tsti.where('permitId').equals(permitId).first();
  if (!permit || !tsti) return undefined;
  const [isolations, gasTests, signatures, steps, stepHazards, controls, tstiPpe, ruleAcks, closure, rules, hazards, ppeItems] =
    await Promise.all([
      db.isolations.where('permitId').equals(permitId).toArray(),
      db.gasTests.where('permitId').equals(permitId).toArray(),
      db.signatures.where('permitId').equals(permitId).toArray(),
      db.jsaSteps.where('[tstiId+seq]').between([tsti.id, -Infinity], [tsti.id, Infinity]).toArray(),
      db.stepHazards.where('tstiId').equals(tsti.id).toArray(),
      db.controls.where('tstiId').equals(tsti.id).toArray(),
      db.tstiPpe.where('tstiId').equals(tsti.id).toArray(),
      db.ruleAcks.where('permitId').equals(permitId).toArray(),
      db.closures.where('permitId').equals(permitId).first(),
      db.siteRules.toArray(),
      db.hazards.toArray(),
      db.ppeItems.toArray(),
    ]);
  return { permit, tsti, isolations, gasTests, signatures, steps, stepHazards, controls, tstiPpe, ruleAcks, closure, rules, hazards, ppeItems };
}

// ---------- STOP Work gate (hardcoded) ----------

/** Final submit is never possible without the STOP Work Authority acknowledgment. */
export const isSubmitDisabled = (tsti: Pick<Tsti, 'stopWorkAcknowledged'>): boolean => !tsti.stopWorkAcknowledged;

// ---------- Helpers ----------

const blank = (s: string | undefined): boolean => !s || s.trim() === '';

const CATEGORY_LABEL: Record<HazardCategory, string> = {
  gravity: 'Gravity',
  pressure: 'Pressure',
  temperature: 'Temperature',
  chemical: 'Chemical',
  electrical: 'Electrical',
  mechanical: 'Mechanical',
  noise: 'Noise',
};

const ANALYTE_FIELD: Record<GasAnalyte, keyof GasTest> = {
  o2: 'o2Pct',
  lel: 'lelPct',
  h2s: 'h2sPpm',
  co: 'coPpm',
  nh3: 'nh3Ppm',
  ch3cl: 'ch3clPpm',
};

export const isOxygenDeficient = (t: Pick<GasTest, 'o2Pct'>): boolean =>
  t.o2Pct !== undefined && t.o2Pct < O2_DEFICIENT_BELOW_PCT;

/** A gas test counts only if the tester passed it and O2 is not deficient. */
export const gasTestPasses = (t: GasTest): boolean => t.acceptable === true && !isOxygenDeficient(t);

const hasSignature = (b: PermitBundle, docType: Signature['docType'], role: SignatureRole) =>
  b.signatures.some((s) => s.docType === docType && s.role === role && !blank(s.name));

function gasRequirementMet(b: PermitBundle, req: Extract<RuleRequirement, { kind: 'gas_test' }>): boolean {
  return b.gasTests.some((t) => {
    if (!gasTestPasses(t)) return false;
    if (req.continuous && !t.continuous) return false;
    if (!req.analytes.every((a) => t.analytes.includes(a) && t[ANALYTE_FIELD[a]] !== undefined)) return false;
    if (req.timing === 'before_work' && b.permit.workStartedAt && t.testedAt > b.permit.workStartedAt) return false;
    return true;
  });
}

// ---------- PTW 1 ----------

export function validatePtwHeader(b: PermitBundle): Issue[] {
  const issues: Issue[] = [];
  const p = b.permit;
  const need = (ok: boolean, message: string, targetId?: string) => {
    if (!ok) issues.push({ section: 'ptw', message, targetId });
  };
  need(!blank(p.permitNumber), 'Enter permit number.');
  need(!blank(p.date), 'Enter date.');
  need(!blank(p.location), 'Enter location.');
  need(!blank(p.equipment), 'Enter equipment.');
  for (const iso of b.isolations) {
    need(!blank(iso.isolationPoint), 'Enter isolation point.', iso.id);
    need(!blank(iso.isolatedBy), `Isolation ${iso.isolationPoint || ''}: enter isolated by.`.trim(), iso.id);
    need(!blank(iso.verifiedBy), `Verify zero energy: ${iso.isolationPoint || 'isolation'}.`, iso.id);
  }
  for (const t of b.gasTests) {
    if (isOxygenDeficient(t) && t.acceptable !== false) {
      need(false, `Gas test at ${t.testLocation || 'location'}: O2 below ${O2_DEFICIENT_BELOW_PCT}% is oxygen deficient. Mark it failed.`, t.id);
    }
    need(t.acceptable !== null, `Gas test at ${t.testLocation || 'location'}: mark pass or fail.`, t.id);
  }
  return issues;
}

export function validatePtwSignatures(b: PermitBundle): Issue[] {
  const roles: [SignatureRole, string][] = [
    ['issuer', 'Issuer'],
    ['receiver', 'Receiver'],
    ['safety', 'Safety'],
  ];
  return roles
    .filter(([role]) => !hasSignature(b, 'ptw', role))
    .map(([, label]) => ({ section: 'ptw' as const, message: `Sign: ${label}.` }));
}

// ---------- TSTI Page 1 ----------

export function validateTstiPage1(b: PermitBundle): Issue[] {
  const issues: Issue[] = [];
  const push = (message: string, targetId?: string) => issues.push({ section: 'tsti1', message, targetId });

  if (blank(b.tsti.jobDescription)) push('Enter job description.');
  if (!b.steps.some((s) => !blank(s.description))) push('Describe at least one task step.');

  for (const step of b.steps) {
    const hz = b.stepHazards.filter((h) => h.stepId === step.id);
    if (blank(step.description)) {
      if (hz.length > 0) push(`Step ${step.seq}: describe the step or move its hazards.`, step.id);
      continue;
    }
    if (hz.length === 0) push(`Step ${step.seq}: add a hazard.`, step.id);
    for (const h of hz) {
      if (!b.controls.some((c) => c.stepHazardId === h.id)) push(`Step ${step.seq}: add a control for "${h.description}".`, h.id);
    }
  }
  return issues;
}

// ---------- TSTI Page 2 ----------

export function validateTstiPage2(b: PermitBundle): Issue[] {
  const issues: Issue[] = [];
  const push = (message: string, targetId?: string) => issues.push({ section: 'tsti2', message, targetId });

  for (const [cat, check] of Object.entries(b.tsti.hazardChecklist) as [HazardCategory, Tsti['hazardChecklist'][HazardCategory]][]) {
    const label = CATEGORY_LABEL[cat];
    const onPage1 = b.stepHazards.some((h) => h.category === cat);
    if (check.present === null) push(`Answer: ${label}.`);
    else if (check.present && !onPage1) push(`${label} marked present. Add a ${label.toLowerCase()} hazard on Page 1.`);
    else if (!check.present && onPage1) push(`${label} hazard is on Page 1. Mark ${label} present.`);
  }

  for (const row of b.tstiPpe) {
    if (!row.confirmed) {
      const name = b.ppeItems.find((p) => p.code === row.ppeCode)?.name ?? row.ppeCode;
      push(`Confirm PPE: ${name}.`, row.id);
    }
  }

  if (isSubmitDisabled(b.tsti)) push('Acknowledge STOP Work Authority.');
  else if (blank(b.tsti.stopWorkAckBy)) push('Enter name on STOP Work acknowledgment.');
  return issues;
}

// ---------- Site rules ----------

export type RulePhase = 'sign_off' | 'closure';

const VERB: Record<RuleRequirement['kind'], string> = {
  ack: 'Confirm',
  gas_test: 'Record',
  role: 'Sign',
  permit_field: 'Enter',
  post_work_watch: 'Complete',
  approval: 'Get',
  control: 'Add control',
};

export function requirementMet(b: PermitBundle, rule: SiteRule, req: RuleRequirement, phase: RulePhase): boolean {
  switch (req.kind) {
    case 'ack':
      return b.ruleAcks.some((a) => a.ruleCode === rule.code && a.requirementKey === req.key && !blank(a.acknowledgedBy));
    case 'gas_test':
      return gasRequirementMet(b, req);
    case 'role':
      return hasSignature(b, 'ptw', req.role);
    case 'permit_field':
      return !blank(b.permit[req.field]);
    case 'approval':
      return !expandConditions(b.permit.workConditions).includes(req.when) || hasSignature(b, 'ptw', req.role);
    case 'control':
      return b.controls.some((c) => c.level === req.level && c.text === req.text);
    case 'post_work_watch': {
      if (phase !== 'closure') return true; // can only be met after work ends
      const end = b.permit.workEndedAt;
      const watchEnd = b.closure?.fireWatchEndedAt;
      if (!end || !watchEnd || blank(b.closure?.fireWatchBy)) return false;
      return Date.parse(watchEnd) - Date.parse(end) >= req.minutes * 60_000;
    }
  }
}

/** Unmet requirements of every rule the work conditions trigger. */
export function validateRuleRequirements(
  b: PermitBundle,
  phase: RulePhase,
  skipKinds: readonly RuleRequirement['kind'][] = [],
): Issue[] {
  const issues: Issue[] = [];
  for (const rule of triggeredRules(b.permit.workConditions, b.rules)) {
    for (const req of rule.requirements) {
      if (skipKinds.includes(req.kind) || requirementMet(b, rule, req, phase)) continue;
      let message = `${rule.title}: ${VERB[req.kind]}: ${req.label}.`;
      if (req.kind === 'post_work_watch' && b.permit.workEndedAt) {
        const earliest = new Date(Date.parse(b.permit.workEndedAt) + req.minutes * 60_000);
        message += ` Ends no earlier than ${earliest.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
      } else if (req.kind === 'post_work_watch') {
        message += ' Record work end time first.';
      }
      issues.push({ section: 'rules', message });
    }
  }
  return issues;
}

// ---------- Gates ----------

/** Everything that must be complete before anyone signs the PTW. */
export function validateBeforeSignatures(b: PermitBundle): Issue[] {
  return [
    ...validatePtwHeader(b),
    ...validateTstiPage1(b),
    ...validateTstiPage2(b),
    // Role signatures (hole watch, fire watch, Site Director) are collected with the
    // PTW signatures, so they are checked at sign-off, not here.
    ...validateRuleRequirements(b, 'sign_off', ['role', 'approval']),
  ];
}

/** Full sign-off: permit can go active only when this is empty. */
export function validateSignOff(b: PermitBundle): Issue[] {
  const issues: Issue[] = [];
  if (b.permit.status === 'invalidated') {
    issues.push({ section: 'ptw', message: 'Permit invalidated. Reassess and issue a new permit.' });
  }
  return [
    ...issues,
    ...validatePtwHeader(b),
    ...validateTstiPage1(b),
    ...validateTstiPage2(b),
    ...validateRuleRequirements(b, 'sign_off'),
    ...validatePtwSignatures(b),
  ];
}

export function validateClosure(b: PermitBundle): Issue[] {
  const issues: Issue[] = [];
  const push = (message: string, targetId?: string) => issues.push({ section: 'closure', message, targetId });
  const c = b.closure;

  if (b.permit.status !== 'active' && b.permit.status !== 'invalidated') push('Only an active or invalidated permit can be closed.');
  if (!c?.siteCleanupVerified || blank(c.siteCleanupVerifiedBy)) push('Verify site cleanup.');
  for (const iso of b.isolations) {
    if (blank(iso.removedBy) || !iso.removedAt) push(`Remove isolation: ${iso.isolationPoint}.`, iso.id);
  }
  if (b.isolations.length > 0 && (!c?.isolationsRemovedVerified || blank(c.isolationsRemovedVerifiedBy))) {
    push('Verify all isolations removed.');
  }
  if (!hasSignature(b, 'closure', 'closure_issuer')) push('Sign: Closure issuer.');
  if (!hasSignature(b, 'closure', 'closure_receiver')) push('Sign: Closure receiver.');

  return [...issues, ...validateRuleRequirements(b, 'closure')];
}
