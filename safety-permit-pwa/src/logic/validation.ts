// Sign-off blocker. Every check is a pure function over a loaded PermitBundle and
// returns terse, imperative issues. An empty list means the gate is open.

import { db } from '../db/schema';
import { O2_DEFICIENT_BELOW_PCT } from '../db/seed/reference';
import type {
  Control,
  GasAnalyte,
  GasTest,
  Hazard,
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
import {
  ANGLE_GRINDER_CHECKS,
  ANGLE_GRINDER_HEADING,
  BASIC_SAFEGUARDS,
  CLOSURE_QUESTIONS,
  GLOVES_OTHER_NOTE,
  LEADER_Q10,
  LEADER_QUESTIONS,
  PTW1_SIGNATURES,
  SAFE_WORK_PRACTICES,
  SAFETY_CHECK,
  TASK_PLANNING_FIELDS,
  TSTI2_SIGNATURE_LABELS,
  recognitionLabel,
  type Item,
} from '../forms/templates';
import {
  expandConditions,
  mandatedFormChecks,
  mandatedHazards,
  mandatedPpe,
  triggeredRules,
  type ReferenceData,
} from './safetyEngine';

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

const labelOf = (list: readonly Item[], key: string): string => list.find((i) => i.key === key)?.label ?? key;

const signature = (b: PermitBundle, docType: Signature['docType'], role: SignatureRole) =>
  b.signatures.find((s) => s.docType === docType && s.role === role);

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

// ---------- PTW 1 (Form 1) ----------

export function validatePtw1(b: PermitBundle): Issue[] {
  const issues: Issue[] = [];
  const need = (ok: boolean, message: string, targetId?: string) => {
    if (!ok) issues.push({ section: 'ptw', message, targetId });
  };
  const p = b.permit;
  need(!blank(p.permitNumber), 'Enter Permit Number.');
  need(!blank(p.date), 'Enter Date.');
  need(p.workActivities.length > 0, 'Check at least one Work Activity.');
  if (expandConditions(p.workConditions).includes('confined_space')) need(!blank(p.rescuePlan), 'Enter rescue plan.');

  for (const iso of b.isolations) {
    need(!blank(iso.isolationPoint), 'Enter isolation point.', iso.id);
    need(!blank(iso.verifiedBy), `Verify zero energy: ${iso.isolationPoint || 'isolation'}.`, iso.id);
  }
  for (const t of b.gasTests) {
    const where = t.testLocation || 'location';
    need(!blank(t.testedBy), `Gas test at ${where}: enter tested by.`, t.id);
    need(!blank(t.instrumentId), `Gas test at ${where}: enter instrument ID.`, t.id);
    if (isOxygenDeficient(t) && t.acceptable !== false) {
      need(false, `Gas test at ${where}: O2 below ${O2_DEFICIENT_BELOW_PCT}% is oxygen deficient. Mark it failed.`, t.id);
    }
    need(t.acceptable !== null, `Gas test at ${where}: mark pass or fail.`, t.id);
  }
  return issues;
}

export function validatePtwSignatures(b: PermitBundle): Issue[] {
  return PTW1_SIGNATURES.flatMap(({ key, label }) => {
    const sig = signature(b, 'ptw', key);
    if (!sig || blank(sig.name)) return [{ section: 'ptw' as const, message: `Sign: ${label}.` }];
    if (!sig.signedAt) return [{ section: 'ptw' as const, message: `${label}: enter date and time.` }];
    return [];
  });
}

/** Form 2 Safety Check: answered in full, and no "No", before work can start. */
export function validateSafetyCheck(b: PermitBundle): Issue[] {
  return SAFETY_CHECK.flatMap(({ key, label }) => {
    const a = b.permit.safetyCheck[key];
    if (!a) return [{ section: 'closure' as const, message: `Safety Check: answer "${label}"` }];
    if (a === 'no') return [{ section: 'closure' as const, message: `Safety Check: "${label}" is No. Work cannot start.` }];
    return [];
  });
}

// ---------- TSTI Page 1 (Form 3) ----------

export function validateTstiPage1(b: PermitBundle): Issue[] {
  const issues: Issue[] = [];
  const push = (message: string, targetId?: string) => issues.push({ section: 'tsti1', message, targetId });
  const t = b.tsti;

  if (blank(t.date)) push('Enter Date.');
  for (const f of TASK_PLANNING_FIELDS) if (blank(t.planning[f.key])) push(`Enter ${f.label}.`);

  // JSA table
  if (!b.steps.some((s) => !blank(s.description))) push('Describe at least one Basic Task Step.');
  for (const step of b.steps) {
    const hz = b.stepHazards.filter((h) => h.stepId === step.id);
    if (blank(step.description)) {
      if (hz.length > 0) push(`Step ${step.seq}: describe the step or move its hazards.`, step.id);
      continue;
    }
    if (hz.length === 0) push(`Step ${step.seq}: add a Potential Hazard.`, step.id);
    for (const h of hz) {
      if (!b.controls.some((c) => c.stepHazardId === h.id)) push(`Step ${step.seq}: add an Action to Eliminate or Control "${h.description}".`, h.id);
    }
  }

  // Every Page 1 hazard must have its Hazard Recognition box checked.
  const checked = new Set<string>(t.hazardRecognition);
  for (const h of b.stepHazards) {
    for (const key of h.recognitionKeys) {
      if (!checked.has(key)) push(`"${h.description}" is in the JSA. Check Hazard Recognition: ${recognitionLabel(key)}.`, h.id);
    }
  }
  if (checked.has('env_other') && blank(t.envOther)) push('Hazard Recognition: describe Environmental Other.');

  // FLS Mandatory Leader Questions
  for (const q of LEADER_QUESTIONS) {
    const a = t.leaderAnswers[q.key];
    if (!a) push(`Answer Leader Question ${q.label}`);
    else if (a === 'no' && q.key !== 'q9') push(`Leader Question ${q.label} is No. Resolve before work starts.`);
  }
  if (t.leaderAnswers.q9 === 'yes' && blank(t.leaderQ10)) push(`Answer Leader Question ${LEADER_Q10}`);
  return issues;
}

// ---------- TSTI Page 2 (Form 4) ----------

export function validateTstiPage2(b: PermitBundle, ref: ReferenceData = { hazards: b.hazards, rules: b.rules }): Issue[] {
  const issues: Issue[] = [];
  const push = (message: string, targetId?: string) => issues.push({ section: 'tsti2', message, targetId });
  const t = b.tsti;

  // Boxes the site rules require
  const forms = mandatedFormChecks(b.permit.workConditions);
  for (const [key, rule] of forms.safeWorkPractices) {
    if (!(t.safeWorkPractices as string[]).includes(key)) push(`${rule}: check Safe Work Practice ${labelOf(SAFE_WORK_PRACTICES, key)}.`);
  }
  for (const [key, rule] of forms.basicSafeguards) {
    if (!(t.basicSafeguards as string[]).includes(key)) push(`${rule}: check Basic Safeguard ${labelOf(BASIC_SAFEGUARDS, key)}.`);
  }
  if (t.safeWorkPractices.includes('other') && blank(t.safeWorkPracticesOther)) push('Safe Work Practices: describe Other.');

  // PPE matrix: every required item must be checked
  const ruleHazards = new Set(mandatedHazards(b.permit.workConditions, ref).filter((m) => m.source === 'site_rule').map((m) => m.hazard.code));
  const present = b.stepHazards.flatMap((h) => (h.hazardCode ? [h.hazardCode] : []));
  for (const need of mandatedPpe(present, ruleHazards, ref)) {
    if (!b.tstiPpe.some((p) => p.ppeCode === need.ppeCode)) {
      push(`Check PPE: ${b.ppeItems.find((p) => p.code === need.ppeCode)?.name ?? need.ppeCode}.`);
    }
  }
  if (b.tstiPpe.some((p) => p.ppeCode === 'gloves_chemical') && blank(t.glovesChemicalSpec)) push('Gloves: specify Chemical Resistant type.');
  if (!blank(t.glovesOther) && blank(t.glovesOtherApprovedBy)) push(`Gloves Other: enter Site Manager approval ${GLOVES_OTHER_NOTE}.`);
  if (t.fallProtection.includes('other') && blank(t.fallProtectionOther)) push('Fall Protection: describe Other.');

  // Angle Grinder: Cutting Operation Permit
  if (t.safeWorkPractices.includes('angle_grinder_cutting')) {
    const g = t.angleGrinder;
    if (blank(g.requester)) push(`${ANGLE_GRINDER_HEADING}: enter Requester / User.`);
    if (blank(g.supervisor)) push(`${ANGLE_GRINDER_HEADING}: enter Supervisor.`);
    for (const c of ANGLE_GRINDER_CHECKS) if (!g.checks.includes(c.key)) push(`${ANGLE_GRINDER_HEADING}: check ${c.label}.`);
    if (g.decision === null) push(`${ANGLE_GRINDER_HEADING}: mark Approved or Denied.`);
    if (g.decision === 'denied') push(`${ANGLE_GRINDER_HEADING}: Denied. Do not cut.`);
  }

  // Signatures
  const L = TSTI2_SIGNATURE_LABELS;
  if (t.twoUpRequired === null) push(`Answer ${L.twoUp}`);
  if (t.twoUpRequired === 'yes' && blank(t.twoUpActivity)) push(`${L.twoUp} Yes: list activity.`);
  const emp = signature(b, 'tsti', 'employee');
  if (!emp || blank(emp.name)) push(`Sign: ${L.employee}.`);
  else if (blank(emp.badgeOrEmployeeId)) push(`Enter ${L.badge}.`);
  const fls = signature(b, 'tsti', 'fls');
  if (!fls || blank(fls.name)) push(`Sign: ${L.fls}.`);
  else if (!fls.signedAt) push(`${L.fls}: enter Date.`);

  if (isSubmitDisabled(t)) push('Acknowledge STOP Work Authority.');
  else if (blank(t.stopWorkAckBy)) push('Enter name on STOP Work acknowledgment.');
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

/** Everything except the PTW signatures. Signature blocks stay locked until this is empty. */
export function validateBeforeSignatures(b: PermitBundle): Issue[] {
  return [
    ...validatePtw1(b),
    ...validateTstiPage1(b),
    ...validateTstiPage2(b),
    ...validateSafetyCheck(b),
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
    ...validatePtw1(b),
    ...validateTstiPage1(b),
    ...validateTstiPage2(b),
    ...validateSafetyCheck(b),
    ...validateRuleRequirements(b, 'sign_off'),
    ...validatePtwSignatures(b),
  ];
}

export function validateClosure(b: PermitBundle): Issue[] {
  const issues: Issue[] = [];
  const push = (message: string, targetId?: string) => issues.push({ section: 'closure', message, targetId });
  const c = b.closure;

  if (b.permit.status !== 'active' && b.permit.status !== 'invalidated') push('Only an active or invalidated permit can be closed.');
  for (const q of CLOSURE_QUESTIONS) if (!c?.answers[q.key]) push(`Permit Closure: answer "${q.label}"`);
  const anyNo = CLOSURE_QUESTIONS.some((q) => c?.answers[q.key] === 'no');
  if (anyNo && blank(c?.noAnswersReportedTo)) push('Permit Closure has a "No" answer. Enter the manager it was reported to.');
  for (const iso of b.isolations) {
    if (blank(iso.removedBy) || !iso.removedAt) push(`Remove isolation: ${iso.isolationPoint}.`, iso.id);
  }
  if (!signature(b, 'closure', 'closure_acceptor')?.name.trim()) push('Sign: Closure - PTW Acceptor.');
  if (!signature(b, 'closure', 'closure_issuer')?.name.trim()) push('Sign: Closure - Permit Issuer.');

  return [...issues, ...validateRuleRequirements(b, 'closure')];
}
