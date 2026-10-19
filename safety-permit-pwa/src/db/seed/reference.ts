// Hardcoded Morris site reference data.
// Sources: the app spec knowledge base ('site_kb') and the Morris site safety
// training notes that Site_Safety_Sim.html was built from ('training_notes p. N').
// Where neither source names PPE for a hazard, requiredPpe is empty (baseline only)
// and the technician specifies it. Generic hazards are not listed: the Form 3 Hazard
// Recognition boxes cover those, and job-specific hazards are entered as free text.

import { GLOVES_REQUIRED, PPE_REQUIRED } from '../../forms/templates';
import type { Hazard, PpeItem, SiteRule, WorkCondition } from '../types';

export const SITE_ID = 'morris';

// PPE matrix keyed to the Form 4 "PPE Required" and "Gloves Required" boxes.
// Baseline items that are not boxes on Form 4 are listed as 'baseline_only'.
export const PPE_ITEMS: PpeItem[] = [
  ...PPE_REQUIRED.filter((i) => i.key !== 'ppe_other').map((i) => ({
    code: i.key,
    name: i.label,
    baseline: i.key === 'head_protection' || i.key === 'safety_glasses',
    list: 'ppe_required' as const,
  })),
  ...GLOVES_REQUIRED.filter((i) => i.key !== 'gloves_other').map((i) => ({
    code: i.key,
    name: i.label,
    baseline: false,
    list: 'gloves_required' as const,
  })),
  // Mandatory baseline with no box on Form 4
  { code: 'fr_clothing', name: 'FR clothing', baseline: true, list: 'baseline_only' },
  { code: 'leather_gloves', name: 'Leather work gloves', baseline: true, list: 'baseline_only' },
  { code: 'safety_boots', name: 'Safety boots', baseline: true, list: 'baseline_only' },
];

export const BASELINE_PPE = PPE_ITEMS.filter((p) => p.baseline).map((p) => p.code);

// Chemical = chemical suit, gloves, face shield (site KB), as Form 4 boxes.
const CHEMICAL_PPE = ['chem_resistant_clothing', 'gloves_chemical', 'face_shield'];

// recognitionKeys map each hazard to the Form 3 Hazard Recognition boxes it falls
// under; Page 1 validation requires those boxes checked.
export const HAZARDS: Hazard[] = [
  {
    code: 'gravity.fall_over_6ft',
    recognitionKeys: ['fall_from_heights'],
    name: 'Fall from height > 6 ft',
    description: 'Work more than 6 ft above a lower level.',
    requiredPpe: ['fall_protection'],
    triggers: ['work_at_height'],
    suggestedControls: [{ level: 'ppe', text: 'Full body harness with double lanyards' }],
  },
  {
    code: 'temperature.hot_work_ignition',
    recognitionKeys: ['arcing_sparks'],
    name: 'Hot work ignition source',
    description: 'Sparks, heat, or open flame. SPARK / HEAT / FLAME = THINK HOT WORK.',
    requiredPpe: [],
    triggers: ['hot_work', 'open_flame'],
    suggestedControls: [
      { level: 'administrative', text: 'Combustible gas test before work' },
      { level: 'administrative', text: 'Fire watch for 30 minutes after work ends' },
    ],
  },
  {
    code: 'chemical.general',
    recognitionKeys: ['chemical_liquid_vapor'],
    name: 'Chemical exposure',
    description: 'Contact with or exposure to hazardous chemicals.',
    requiredPpe: CHEMICAL_PPE,
    triggers: [],
    suggestedControls: [{ level: 'ppe', text: 'Chemical suit, chemical gloves, face shield' }],
  },
  {
    code: 'chemical.ammonia',
    recognitionKeys: ['chemical_liquid_vapor'],
    name: 'Ammonia system',
    description: 'Work on ammonia systems. Stainless steel tools and components only.',
    requiredPpe: CHEMICAL_PPE,
    triggers: ['ammonia_system'],
    suggestedControls: [
      { level: 'administrative', text: 'Stainless steel tools and components only' },
      { level: 'ppe', text: 'Chemical suit, chemical gloves, face shield' },
    ],
  },
  {
    code: 'chemical.hydrogen',
    recognitionKeys: ['flammable_material'],
    name: 'Hydrogen (HPU)',
    description: 'Hydrogen is extremely flammable. No open flames at the Hydrogen Purification Unit.',
    requiredPpe: [],
    triggers: ['hpu'],
    suggestedControls: [
      { level: 'engineering', text: 'Non-sparking tools only' },
      { level: 'administrative', text: 'No open flame without special review and Site Director approval' },
    ],
  },
  {
    code: 'chemical.methyl_chloride',
    recognitionKeys: ['flammable_material', 'chemical_liquid_vapor'],
    name: 'Methyl chloride',
    description: 'Highly flammable and hazardous chemical.',
    requiredPpe: CHEMICAL_PPE,
    triggers: ['methyl_chloride'],
    suggestedControls: [
      { level: 'engineering', text: 'Continuous gas monitoring for methyl chloride' },
      { level: 'ppe', text: 'Chemical suit, chemical gloves, face shield' },
    ],
  },
  {
    code: 'chemical.arquad',
    recognitionKeys: ['flammable_material', 'chemical_liquid_vapor'],
    name: 'Arquad Area',
    description: 'Flammable liquids plus potential eye and chemical irritation hazards.',
    requiredPpe: CHEMICAL_PPE,
    triggers: ['arquad_area'],
    suggestedControls: [{ level: 'ppe', text: 'Chemical suit, chemical gloves, face shield' }],
  },
  {
    code: 'chemical.confined_space_atmosphere',
    recognitionKeys: ['confined_space'],
    name: 'Confined space atmosphere',
    description: 'O2 below 19.5% is oxygen deficient (normal air is about 20.9%).',
    requiredPpe: [],
    triggers: ['confined_space'],
    suggestedControls: [
      { level: 'engineering', text: 'Continuous ventilation' },
      { level: 'administrative', text: 'Pre-entry gas test (O2)' },
      { level: 'administrative', text: 'Hole watch posted for the entire entry' },
      { level: 'administrative', text: 'Rescue plan in place before entry' },
    ],
  },
  {
    code: 'noise.high',
    recognitionKeys: ['noise_excessive'],
    name: 'High noise',
    description: 'High noise area or noisy task.',
    requiredPpe: ['hearing_protection'],
    triggers: [],
    suggestedControls: [{ level: 'ppe', text: 'Double hearing protection (plugs + muffs)' }],
  },
];

export const SITE_RULES: SiteRule[] = [
  {
    code: 'MORRIS-NH3',
    siteId: SITE_ID,
    title: 'Ammonia systems',
    summary: 'Strictly stainless steel tools and components only.',
    triggers: ['ammonia_system'],
    enforcement: 'block',
    basis: 'site_kb',
    addsHazards: ['chemical.ammonia'],
    requirements: [
      { kind: 'ack', key: 'stainless_only', label: 'All tools and components on this job are stainless steel' },
    ],
  },
  {
    code: 'MORRIS-HPU',
    siteId: SITE_ID,
    title: 'Hydrogen Purification Unit (HPU)',
    summary: 'Non-sparking tools mandatory. No open flame without special review and Site Director approval.',
    triggers: ['hpu'],
    enforcement: 'block',
    basis: 'site_kb; training_notes pp. 4-5',
    addsHazards: ['chemical.hydrogen'],
    requirements: [
      { kind: 'ack', key: 'non_sparking_tools', label: 'Non-sparking tools only on this job' },
      { kind: 'control', key: 'non_sparking_control', label: 'Non-sparking tools', level: 'engineering', text: 'Non-sparking tools only' },
      { kind: 'approval', key: 'open_flame_approval', label: 'Special review and Site Director approval for open flame', role: 'site_director', when: 'open_flame' },
    ],
  },
  {
    code: 'MORRIS-CH3CL',
    siteId: SITE_ID,
    title: 'Methyl chloride',
    summary: 'Continuous gas monitoring required. Highly flammable and hazardous.',
    triggers: ['methyl_chloride'],
    enforcement: 'block',
    basis: 'site_kb; training_notes p. 5',
    addsHazards: ['chemical.methyl_chloride'],
    requirements: [
      { kind: 'gas_test', key: 'ch3cl_continuous', label: 'Continuous monitor reading methyl chloride', continuous: true, analytes: ['ch3cl'], timing: 'during_work' },
    ],
  },
  {
    code: 'MORRIS-ARQUAD',
    siteId: SITE_ID,
    title: 'Arquad Area',
    summary: 'Flammable liquids plus eye and chemical irritation hazards.',
    triggers: ['arquad_area'],
    enforcement: 'block',
    basis: 'training_notes p. 5',
    addsHazards: ['chemical.arquad'],
    requirements: [
      { kind: 'ack', key: 'arquad_hazards', label: 'Crew briefed on flammable liquid and eye/chemical irritation hazards' },
    ],
  },
  {
    code: 'MORRIS-HAZAREA',
    siteId: SITE_ID,
    title: 'Hazardous area entry',
    summary: 'Know the Emergency Response Plan and the hazardous chemicals present.',
    triggers: ['hazardous_area', 'arquad_area', 'methyl_chloride', 'hpu', 'ammonia_system'],
    enforcement: 'block',
    basis: 'training_notes p. 4',
    addsHazards: [],
    requirements: [
      { kind: 'ack', key: 'erp_and_chemicals', label: 'Crew knows the Emergency Response Plan and the hazardous chemicals present' },
    ],
  },
  {
    code: 'MORRIS-CSE',
    siteId: SITE_ID,
    title: 'Confined space entry',
    summary: 'Mandatory hole watch, continuous ventilation, rescue plan.',
    triggers: ['confined_space'],
    enforcement: 'block',
    basis: 'site_kb; training_notes pp. 1-2',
    addsHazards: ['chemical.confined_space_atmosphere'],
    requirements: [
      { kind: 'role', key: 'hole_watch', label: 'Hole watch assigned and signed', role: 'hole_watch' },
      { kind: 'ack', key: 'continuous_ventilation', label: 'Continuous ventilation in place for the entire entry' },
      { kind: 'permit_field', key: 'rescue_plan', label: 'Rescue plan documented', field: 'rescuePlan' },
      { kind: 'gas_test', key: 'pre_entry_o2', label: 'Pre-entry O2 test', continuous: false, analytes: ['o2'], timing: 'before_work' },
      { kind: 'ack', key: 'evacuation_triggers', label: 'Crew knows evacuation triggers: signs/symptoms of exposure, hole watch unable to perform duties, danger outside the space' },
    ],
  },
  {
    code: 'MORRIS-HOT',
    siteId: SITE_ID,
    title: 'Hot work',
    summary: 'Combustible gas testing mandatory. Fire watch for 30 minutes after work.',
    triggers: ['hot_work', 'open_flame'],
    enforcement: 'block',
    basis: 'site_kb; training_notes p. 3',
    addsHazards: ['temperature.hot_work_ignition'],
    requirements: [
      { kind: 'gas_test', key: 'combustible_gas', label: 'Combustible gas (LEL) test before work', continuous: false, analytes: ['lel'], timing: 'before_work' },
      { kind: 'role', key: 'fire_watch', label: 'Fire watch assigned and signed', role: 'fire_watch' },
      { kind: 'post_work_watch', key: 'fire_watch_30', label: 'Fire watch continues 30 minutes after work ends', minutes: 30 },
    ],
  },
];

/**
 * Tasks that require a Hot Work Permit (training notes p. 3). Picking any of these
 * on the PTW sets the 'hot_work' work condition. A normal walk-through does not.
 */
export const HOT_WORK_TASKS: { key: string; label: string; sets: WorkCondition[] }[] = [
  { key: 'cutting_welding', label: 'Cutting or welding', sets: ['hot_work'] },
  { key: 'spark_producing', label: 'Any potentially spark-producing work (grinding, cutoff saw)', sets: ['hot_work'] },
  { key: 'power_tools_haz_area', label: 'Power tools in a hazardous area', sets: ['hot_work'] },
  { key: 'striking_hand_tools', label: 'Striking objects with hand tools', sets: ['hot_work'] },
  { key: 'open_flame', label: 'Open flame (torch, heating)', sets: ['hot_work', 'open_flame'] },
];

/** O2 below this is oxygen deficient (training notes p. 2). The only gas limit the app hardcodes. */
export const O2_DEFICIENT_BELOW_PCT = 19.5;

export const DISCLAIMER = 'Technician is final authority. App is a drafting tool.';

// ---------- Form → rule trigger mapping ----------

/** PTW 1 boxes that set a work condition, so checking them fires the Morris rules. */
export const PTW1_CONDITION_MAP: {
  workActivities: Partial<Record<string, WorkCondition[]>>;
  chemicals: Partial<Record<string, WorkCondition[]>>;
} = {
  workActivities: {
    confined_space_entry: ['confined_space'],
    work_at_heights: ['work_at_height'],
  },
  chemicals: {
    ammonia: ['ammonia_system'],
    hydrogen: ['hpu'],
    methyl_chloride: ['methyl_chloride'],
  },
};

/** App-only site triggers with no box on the paper PTW. */
export const SITE_TRIGGER_OPTIONS: { condition: WorkCondition; label: string }[] = [
  { condition: 'hpu', label: 'Work in the Hydrogen Purification Unit (HPU)' },
  { condition: 'arquad_area', label: 'Work in the Arquad Area' },
  { condition: 'hazardous_area', label: 'Work in a hazardous area' },
];

/**
 * Form 4 boxes a site rule makes mandatory. They are checked and locked on Page 2
 * while the condition applies.
 */
export const MANDATED_FORM_CHECKS: {
  condition: WorkCondition;
  ruleCode: string;
  safeWorkPractices: string[];
  basicSafeguards: string[];
}[] = [
  { condition: 'confined_space', ruleCode: 'MORRIS-CSE', safeWorkPractices: ['confined_space_entry'], basicSafeguards: ['attendant', 'ventilation_exhaust'] },
  { condition: 'hot_work', ruleCode: 'MORRIS-HOT', safeWorkPractices: [], basicSafeguards: ['fire_watch'] },
];
