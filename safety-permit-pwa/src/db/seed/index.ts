import { db } from '../schema';
import { HAZARDS, PPE_ITEMS, SITE_RULES } from './reference';
import { TRAINING_SCENARIOS } from './training';

/** Bump when reference data changes. Field records (permits etc.) are never touched. */
export const SEED_VERSION = 1;

/** Load or refresh hardcoded reference tables. Safe to call on every app start. */
export async function ensureSeed(): Promise<void> {
  const current = await db.meta.get('seedVersion');
  if (current?.value === SEED_VERSION) return;

  await db.transaction('rw', [db.ppeItems, db.hazards, db.siteRules, db.trainingScenarios, db.meta], async () => {
    await Promise.all([db.ppeItems.clear(), db.hazards.clear(), db.siteRules.clear(), db.trainingScenarios.clear()]);
    await db.ppeItems.bulkPut(PPE_ITEMS);
    await db.hazards.bulkPut(HAZARDS);
    await db.siteRules.bulkPut(SITE_RULES);
    await db.trainingScenarios.bulkPut(TRAINING_SCENARIOS);
    await db.meta.put({ key: 'seedVersion', value: SEED_VERSION });
  });
}
