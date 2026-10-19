// Hardcoded Morris site reference data.
// Sources: the app spec knowledge base ('site_kb') and the Morris site safety
// training notes that Site_Safety_Sim.html was built from ('training_notes p. N').
// Where neither source names PPE for a hazard, requiredPpe is empty (baseline only)
// and the technician specifies it. Nothing here should be invented.

import type { Hazard, PpeItem, SiteRule, WorkCondition } from '../types';

export const SITE_ID = 'morris';

export const PPE_ITEMS: PpeItem[] = [
  // Mandatory baseline, every job
  { code: 'hard_hat', name: 'Hard hat', baseline: true },
  { code: 'safety_glasses', name: 'Safety glasses', baseline: true },
  { code: 'fr_clothing', name: 'FR clothing', baseline: true },
  { code: 'leather_gloves', name: 'Leather work gloves', baseline: true },
  { code: 'safety_boots', name: 'Safety boots', baseline: true },
  // Chemical
  { code: 'chem_suit', name: 'Chemical suit', baseline: false },
  { code: 'chem_gloves', name: 'Chemical gloves', baseline: false },
  { code: 'face_shield', name: 'Face shield', baseline: false },
  // Noise: double hearing protection
  { code: 'ear_plugs', name: 'Ear plugs', baseline: false },
  { code: 'ear_muffs', name: 'Ear muffs', baseline: false },
  // Fall > 6 ft
  { code: 'harness', name: 'Full body harness', baseline: false },
  { code: 'double_lanyard', name: 'Double lanyards', baseline: false },
];

export const BASELINE_PPE = PPE_ITEMS.filter((p) => p.baseline).map((p) => p.code);

const CHEMICAL_PPE = ['chem_suit', 'chem_gloves', 'face_shield'];
const NO_KB_PPE = 'PPE beyond baseline is not defined in the site knowledge base. Technician to specify.';

export const HAZARDS: Hazard[] = [
  // Gravity
  {
    code: 'gravity.fall_over_6ft',
    category: 'gravity',
    name: 'Fall from height > 6 ft',
    description: 'Work more than 6 ft above a lower level.',
    requiredPpe: ['harness', 'double_lanyard'],
    triggers: ['work_at_height'],
    suggestedControls: [{ level: 'ppe', text: 'Full body harness with double lanyards' }],
  },
  {
    code: 'gravity.general',
    category: 'gravity',
    name: 'Gravity (other)',
    description: NO_KB_PPE,
    requiredPpe: [],
    triggers: [],
    suggestedControls: [],
  },
  // Pressure
  {
    code: 'pressure.general',
    category: 'pressure',
    name: 'Stored pressure',
    description: NO_KB_PPE,
    requiredPpe: [],
    triggers: [],
    suggestedControls: [],
  },
  // Temperature
  {
    code: 'temperature.hot_work_ignition',
    category: 'temperature',
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
    code: 'temperature.general',
    category: 'temperature',
    name: 'Temperature (other)',
    description: NO_KB_PPE,
    requiredPpe: [],
    triggers: [],
    suggestedControls: [],
  },
  // Chemical
  {
    code: 'chemical.general',
    category: 'chemical',
    name: 'Chemical exposure',
    description: 'Contact with or exposure to hazardous chemicals.',
    requiredPpe: CHEMICAL_PPE,
    triggers: [],
    suggestedControls: [{ level: 'ppe', text: 'Chemical suit, chemical gloves, face shield' }],
  },
  {
    code: 'chemical.ammonia',
    category: 'chemical',
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
    category: 'chemical',
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
    category: 'chemical',
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
    category: 'chemical',
    name: 'Arquad Area',
    description: 'Flammable liquids plus potential eye and chemical irritation hazards.',
    requiredPpe: CHEMICAL_PPE,
    triggers: ['arquad_area'],
    suggestedControls: [{ level: 'ppe', text: 'Chemical suit, chemical gloves, face shield' }],
  },
  {
    code: 'chemical.confined_space_atmosphere',
    category: 'chemical',
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
  // Electrical
  {
    code: 'electrical.general',
    category: 'electrical',
    name: 'Electrical energy',
    description: NO_KB_PPE,
    requiredPpe: [],
    triggers: [],
    suggestedControls: [],
  },
  // Mechanical
  {
    code: 'mechanical.general',
    category: 'mechanical',
    name: 'Mechanical energy',
    description: NO_KB_PPE,
    requiredPpe: [],
    triggers: [],
    suggestedControls: [],
  },
  // Noise
  {
    code: 'noise.high',
    category: 'noise',
    name: 'High noise',
    description: 'High noise area or noisy task.',
    requiredPpe: ['ear_plugs', 'ear_muffs'],
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
