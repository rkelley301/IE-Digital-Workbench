import Dexie, { type EntityTable } from 'dexie';
import { blankPermitFields, blankTstiFields } from './defaults';
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

    // v3: forms rebuilt on the Brown & Root paper templates. No index changes;
    // existing drafts are reshaped so they open in the new forms.
    this.version(3)
      .stores({})
      .upgrade(async (tx) => {
        await tx.table('permits').toCollection().modify((p: Record<string, unknown>) => {
          const blank = blankPermitFields();
          for (const [k, v] of Object.entries(blank)) if (!(k in p) || k === 'workConditions') p[k] = v;
          delete p.location;
          delete p.equipment;
        });
        await tx.table('tsti').toCollection().modify((t: Record<string, unknown>) => {
          const blank = blankTstiFields();
          blank.planning.jobDescription = typeof t.jobDescription === 'string' ? t.jobDescription : '';
          Object.assign(t, blank, { date: t.createdAt });
          delete t.jobDescription;
          delete t.crewNames;
          delete t.hazardChecklist;
        });
        await tx.table('stepHazards').toCollection().modify((h: Record<string, unknown>) => {
          h.recognitionKeys = [];
          delete h.category;
        });
        // PPE codes changed to the Form 4 boxes; the safety engine rebuilds required rows.
        await tx.table('tstiPpe').clear();
        await tx.table('closures').toCollection().modify((c: Record<string, unknown>) => {
          c.answers = {};
          for (const k of ['siteCleanupVerified', 'siteCleanupVerifiedBy', 'isolationsRemovedVerified', 'isolationsRemovedVerifiedBy', 'remarks']) delete c[k];
        });
        await tx.table('signatures').filter((s: { role: string }) => s.role === 'safety' || s.role === 'closure_receiver').delete();
        await tx.table('signatures').toCollection().modify((s: Record<string, unknown>) => {
          if (s.role === 'receiver') s.role = 'acceptor';
        });
      });
  }
}

export const db = new PermitDB();
