// Record types for the local IndexedDB store.
// IDs on field records are UUID strings (crypto.randomUUID) so records created
// offline on different devices never collide if a sync backend is added later.
// Reference tables (hazards, PPE, site rules) are keyed by stable string codes.

import type {
  ANGLE_GRINDER_CHECKS,
  BASIC_SAFEGUARDS,
  CLOSURE_QUESTIONS,
  FALL_PROTECTION,
  GENERAL_CONSIDERATIONS,
  HAZARDOUS_CONDITIONS,
  HEAVY_EQUIPMENT,
  HIGHLY_HAZARDOUS_CHEMICALS,
  Key,
  LeaderQuestionKey,
  RecognitionKey,
  SAFE_WORK_PRACTICES,
  SAFETY_CHECK,
  STOP_WORK_CONDITIONS,
  TaskPlanningField,
  WORK_ACTIVITIES,
  WORK_AREAS,
} from '../forms/templates';

export type ISODate = string; // ISO 8601 timestamp

export type YesNo = 'yes' | 'no';
export type YesNoNa = 'yes' | 'no' | 'na';

// ---------- Enumerations ----------

/**
 * 'invalidated' = emergency alarm or a change in work conditions (training notes p. 2).
 * An invalidated permit cannot return to 'active'; work resumes only on a reassessed,
 * re-authorized permit.
 */
export type PermitStatus = 'draft' | 'ready_to_sign' | 'active' | 'invalidated' | 'closed' | 'void';

/**
 * Site work conditions that trigger hardcoded Morris rules. Derived from the PTW 1
 * checkboxes plus the app-only site trigger section (see deriveWorkConditions).
 */
export type WorkCondition =
  | 'ammonia_system'
  | 'hpu' // Hydrogen Purification Unit / hydrogen systems
  | 'methyl_chloride'
  | 'arquad_area'
  | 'confined_space'
  | 'hot_work'
  | 'open_flame' // also implies hot_work
  | 'hazardous_area'
  | 'work_at_height';

export type ControlLevel = 'engineering' | 'administrative' | 'ppe';

export type IsolationType = 'electrical' | 'mechanical' | 'process' | 'hydraulic' | 'pneumatic';

export type SignatureRole =
  // PTW 1
  | 'acceptor'
  | 'issuer'
  | 'requestor'
  // Required by site rules (app-only, not on the paper PTW)
  | 'hole_watch'
  | 'fire_watch'
  | 'site_director' // HPU open-flame approval
  // TSTI Page 2
  | 'employee'
  | 'fls'
  | 'management'
  // Closure sign-off (app-only; Form 2 has no signature lines)
  | 'closure_acceptor'
  | 'closure_issuer';

export type DocType = 'ptw' | 'tsti' | 'closure';

/** Where an auto-filled item came from. Anything not 'manual' cannot be deleted by the user. */
export type ItemSource = 'baseline' | 'hazard' | 'site_rule' | 'manual';

export type GasAnalyte = 'o2' | 'lel' | 'h2s' | 'co' | 'nh3' | 'ch3cl';

// ---------- PTW 1 (Permit to Work) ----------

export interface Permit {
  id: string;
  siteId: string; // 'morris'
  permitNumber: string;
  date: ISODate;
  // Form 1 checkboxes
  workActivities: Key<typeof WORK_ACTIVITIES>[];
  workAreas: Key<typeof WORK_AREAS>[];
  generalConsiderations: Key<typeof GENERAL_CONSIDERATIONS>[];
  hazardousConditions: Key<typeof HAZARDOUS_CONDITIONS>[];
  chemicals: Key<typeof HIGHLY_HAZARDOUS_CHEMICALS>[];
  chemicalsOther: string; // blank = "Other" unchecked
  /** App-only site triggers not on the paper PTW (hot work, Arquad, etc.). */
  siteConditions: WorkCondition[];
  /** HOT_WORK_TASKS keys picked in the app-only section. */
  hotWorkTasks: string[];
  /** Derived: Form 1 selections + siteConditions + hotWorkTasks. Never edit directly. */
  workConditions: WorkCondition[];
  /** Form 2 Safety Check. Every item must be answered, and none "No", before work starts. */
  safetyCheck: Partial<Record<Key<typeof SAFETY_CHECK>, YesNoNa>>;
  status: PermitStatus;
  /** Free-text rescue plan. Required when workConditions includes 'confined_space'. */
  rescuePlan?: string;
  workStartedAt?: ISODate;
  workEndedAt?: ISODate; // start of the 30-min hot work fire watch clock
  invalidatedAt?: ISODate;
  invalidatedReason?: 'emergency_alarm' | 'conditions_changed';
  /** New permit issued after reassessment, if any. */
  supersededBy?: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Isolation {
  id: string;
  permitId: string;
  isolationPoint: string; // valve / breaker / tag ID
  type: IsolationType;
  method: string; // e.g. "LOTO", "double block and bleed", "blind"
  lockNumber?: string;
  tagNumber?: string;
  isolatedBy: string;
  isolatedAt: ISODate;
  verifiedBy?: string; // zero-energy verification
  verifiedAt?: ISODate;
  removedBy?: string; // filled at permit closure
  removedAt?: ISODate;
}

export interface GasTest {
  id: string;
  permitId: string;
  testedAt: ISODate;
  testedBy: string;
  instrumentId: string;
  bumpTestedAt?: ISODate;
  testLocation: string;
  /** True for a continuous monitor placed for the job (required for methyl chloride). */
  continuous: boolean;
  /** Analytes the instrument is actually reading. Rules check this, not just the values. */
  analytes: GasAnalyte[];
  o2Pct?: number;
  lelPct?: number;
  h2sPpm?: number;
  coPpm?: number;
  nh3Ppm?: number;
  ch3clPpm?: number;
  /**
   * Tester's determination against site limits. The only limit the app enforces on its
   * own is O2 < 19.5% = oxygen deficient (training notes p. 2), which forces this false.
   */
  acceptable: boolean | null;
  notes?: string;
}

export interface Signature {
  id: string;
  permitId: string;
  docType: DocType;
  role: SignatureRole;
  name: string;
  badgeOrEmployeeId?: string;
  /** Date and time written beside the signature. */
  signedAt: ISODate;
  /** Optional drawn signature as a PNG data URL. */
  imageDataUrl?: string;
}

// ---------- TSTI Page 1 & 2 ----------

export interface Tsti {
  id: string;
  permitId: string;
  // Form 3 (Page 1): Task Planning
  date: ISODate;
  planning: Record<TaskPlanningField, string>; // jobDescription = Task Description
  stopWorkConditions: Key<typeof STOP_WORK_CONDITIONS>[];
  comments: string;
  hazardRecognition: RecognitionKey[];
  envOther: string; // Environmental: Other text
  leaderAnswers: Partial<Record<LeaderQuestionKey, YesNo>>;
  leaderQ10: string;
  // Form 4 (Page 2)
  standardEquipment: string;
  specialEquipment: string;
  supportCraft: string;
  safeWorkPractices: Key<typeof SAFE_WORK_PRACTICES>[];
  safeWorkPracticesOther: string;
  basicSafeguards: Key<typeof BASIC_SAFEGUARDS>[];
  ppeOther: string;
  glovesChemicalSpec: string;
  glovesOther: string;
  glovesOtherApprovedBy: string; // Site Manager approval
  fallProtection: Key<typeof FALL_PROTECTION>[];
  fallProtectionOther: string;
  heavyEquipment: Key<typeof HEAVY_EQUIPMENT>[];
  heavyEquipmentWeight: string;
  angleGrinder: {
    requester: string;
    supervisor: string;
    checks: Key<typeof ANGLE_GRINDER_CHECKS>[];
    decision: 'approved' | 'denied' | null;
  };
  twoUpRequired: YesNo | null;
  twoUpActivity: string;
  /** Mandatory (app requirement, not on the paper form). Final submit is disabled while false. */
  stopWorkAcknowledged: boolean;
  stopWorkAckBy?: string;
  stopWorkAckAt?: ISODate;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/** TSTI Page 1: basic task step. */
export interface JsaStep {
  id: string;
  tstiId: string;
  seq: number; // 1-based display order
  description: string;
}

/** TSTI Page 1: hazard mapped to a task step. */
export interface StepHazard {
  id: string;
  tstiId: string;
  stepId: string;
  hazardCode?: string; // FK -> hazards.code; absent for free-text hazards
  /** Hazard Recognition boxes this hazard falls under. Each must be checked on Page 1. */
  recognitionKeys: RecognitionKey[];
  description: string;
  source: ItemSource;
  sourceRef?: string; // site rule code when source === 'site_rule'
}

/** TSTI Page 1: control for a step hazard (Engineering / Admin / PPE). */
export interface Control {
  id: string;
  tstiId: string;
  stepHazardId: string;
  level: ControlLevel;
  text: string;
  source: ItemSource;
  sourceRef?: string;
}

/** TSTI Page 2: a checked PPE Required / Gloves Required box (or app baseline item). */
export interface TstiPpe {
  id: string;
  tstiId: string;
  ppeCode: string; // FK -> ppeItems.code
  source: ItemSource;
  /** 'baseline' and/or hazard codes that require this item. */
  requiredBy: string[];
}

/** Acknowledgement of a site rule requirement (e.g. "stainless tools only"). */
export interface RuleAck {
  id: string;
  permitId: string;
  ruleCode: string;
  requirementKey: string;
  acknowledgedBy: string;
  acknowledgedAt: ISODate;
}

// ---------- Permit Closure ----------

export interface PermitClosure {
  id: string;
  permitId: string;
  /** Form 2 Permit Closure answers. */
  answers: Partial<Record<Key<typeof CLOSURE_QUESTIONS>, YesNoNa>>;
  /** Manager any "No" answers were reported to (required when any answer is "No"). */
  noAnswersReportedTo?: string;
  /** Hot work only: when the fire watch ended. Must be >= workEndedAt + 30 min. */
  fireWatchEndedAt?: ISODate;
  fireWatchBy?: string;
  closedAt?: ISODate;
}

// ---------- Reference data (seeded, read-only in UI) ----------

export interface PpeItem {
  code: string;
  name: string;
  /** Part of the mandatory baseline worn on every job. */
  baseline: boolean;
  /** Where it appears: a Form 4 list, or 'baseline_only' for baseline items not on the form. */
  list: 'ppe_required' | 'gloves_required' | 'baseline_only';
}

export interface Hazard {
  code: string;
  /** Hazard Recognition boxes this hazard falls under. */
  recognitionKeys: RecognitionKey[];
  name: string;
  description: string;
  requiredPpe: string[]; // ppeItems.code
  /** Work conditions that auto-suggest this hazard. */
  triggers: WorkCondition[];
  suggestedControls: { level: ControlLevel; text: string }[];
}

export type RuleRequirement =
  | { kind: 'ack'; key: string; label: string }
  | { kind: 'gas_test'; key: string; label: string; continuous: boolean; analytes: GasAnalyte[]; timing: 'before_work' | 'during_work' }
  | { kind: 'role'; key: string; label: string; role: SignatureRole }
  | { kind: 'permit_field'; key: string; label: string; field: 'rescuePlan' }
  | { kind: 'post_work_watch'; key: string; label: string; minutes: number }
  | { kind: 'approval'; key: string; label: string; role: SignatureRole; when: WorkCondition }
  | { kind: 'control'; key: string; label: string; level: ControlLevel; text: string };

export interface SiteRule {
  code: string;
  siteId: string;
  title: string;
  summary: string;
  triggers: WorkCondition[];
  /** 'block' = sign-off is impossible until satisfied. All Morris rules are 'block'. */
  enforcement: 'block' | 'warn';
  /** Where the rule comes from: 'site_kb' = app spec, 'training_notes p. N' = site training notes. */
  basis: string;
  requirements: RuleRequirement[];
  /** Hazards auto-added to the TSTI when this rule triggers. */
  addsHazards: string[];
}

// ---------- Training mode ----------
// Structure matches Site_Safety_Sim.html so its content ports over as-is.

export interface ScenarioOption {
  t: string;
  ok?: boolean;
  /** Consequence shown when this wrong option is picked. */
  fail?: string;
}

export interface ScenarioStep {
  text: string;
  options: ScenarioOption[];
  why: string;
  ref: string; // training notes page
}

export interface TrainingScenario {
  id: string;
  title: string;
  role: string;
  tag: string;
  workConditions: WorkCondition[];
  steps: ScenarioStep[];
}

export interface TrainingAttempt {
  id: string;
  scenarioId: string;
  traineeName: string;
  startedAt: ISODate;
  completedAt?: ISODate;
  /** Index of the option chosen at each step (all picks, including wrong ones). */
  picks: number[][];
  perfect?: boolean;
}

// ---------- Local infrastructure ----------

/** Pending changes for a future sync backend; drives the sync status indicator. */
export interface OutboxEntry {
  seq?: number; // auto-increment
  table: string;
  recordId: string;
  op: 'put' | 'delete';
  createdAt: ISODate;
}

export interface MetaEntry {
  key: string;
  value: unknown;
}
