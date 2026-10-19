import Dexie, { type EntityTable } from 'dexie';
import type {
  Control,
  GasTest,
  Hazard,
  Isolation,
  JsaStep,
  MetaEntry,
  OutboxEntry,
  Permit,
  PermitClosure,
  PpeItem,
  RuleAck,
  Signature,
  SiteRule,
  StepHazard,
  TrainingAttempt,
  TrainingScenario,
  Tsti,
  TstiPpe,
} from './types';

export class PermitDB extends Dexie {
  // PTW 1
  permits!: EntityTable<Permit, 'id'>;
  isolations!: EntityTable<Isolation, 'id'>;
  gasTests!: EntityTable<GasTest, 'id'>;
  signatures!: EntityTable<Signature, 'id'>;
  // TSTI
  tsti!: EntityTable<Tsti, 'id'>;
  jsaSteps!: EntityTable<JsaStep, 'id'>;
  stepHazards!: EntityTable<StepHazard, 'id'>;
  controls!: EntityTable<Control, 'id'>;
  tstiPpe!: EntityTable<TstiPpe, 'id'>;
  ruleAcks!: EntityTable<RuleAck, 'id'>;
  // Closure
  closures!: EntityTable<PermitClosure, 'id'>;
  // Reference data
  hazards!: EntityTable<Hazard, 'code'>;
  ppeItems!: EntityTable<PpeItem, 'code'>;
  siteRules!: EntityTable<SiteRule, 'code'>;
  // Training
  trainingScenarios!: EntityTable<TrainingScenario, 'id'>;
  trainingAttempts!: EntityTable<TrainingAttempt, 'id'>;
  // Infrastructure
  outbox!: EntityTable<OutboxEntry, 'seq'>;
  meta!: EntityTable<MetaEntry, 'key'>;

  constructor() {
    super('tsti-permits');

    // Only indexed fields are listed; all other fields are stored but not indexed.
    // '*' = multi-entry index on an array, '&' = unique, '[a+b]' = compound.
    this.version(1).stores({
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
    });

    // v2: compound index so repeated saves of one record coalesce into one outbox entry.
    this.version(2).stores({
      outbox: '++seq, table, recordId, [table+recordId]',
    });
  }
}

export const db = new PermitDB();
