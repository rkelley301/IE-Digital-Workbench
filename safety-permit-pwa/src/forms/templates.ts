// Exact wording from blank-permit-tsti-templates.md. Forms render from this file so
// the app matches the paper forms 1:1. Do not paraphrase; edit only to match the paper.
// Keys are stable storage IDs; labels are display text.

export interface Item<K extends string = string> {
  key: K;
  label: string;
}

const items = <K extends string>(list: readonly Item<K>[]) => list;

// ---------- Form 1: Morris Permit to Work (PTW 1) ----------

export const PTW1_TITLE = 'Morris Permit to Work (PTW 1)';

export const WORK_ACTIVITIES = items([
  { key: 'confined_space_entry', label: 'Confined Space Entry' },
  { key: 'work_at_heights', label: 'Work at Heights' },
  { key: 'line_break', label: 'Line Break' },
  { key: 'general_work', label: 'General Work (Requires SWR, JSE, etc.)' },
  { key: 'critical_lift', label: 'Critical Lift (Signature by PTW 1A or PTW 2A)' },
] as const);

export const WORK_AREAS = items([
  { key: 'pipeline_piping', label: 'Pipeline/Piping' },
  { key: 'vessel', label: 'Vessel' },
  { key: 'furnace', label: 'Furnace' },
  { key: 'boiler', label: 'Boiler' },
  { key: 'mechanical_equipment', label: 'Mechanical Equipment' },
  { key: 'electrical_instrumentation', label: 'Electrical/Instrumentation' },
  { key: 'building_grounds', label: 'Building & Grounds' },
] as const);

export const GENERAL_CONSIDERATIONS = items([
  { key: 'wet_damp', label: 'Wet/Damp' },
  { key: 'toxic', label: 'Toxic' },
  { key: 'low_temperature', label: 'Low Temperature' },
  { key: 'poor_lighting', label: 'Poor Lighting' },
] as const);

export const HAZARDOUS_CONDITIONS = items([
  { key: 'severe_weather', label: 'Severe Weather' },
  { key: 'low_temperature', label: 'Low Temperature' },
  { key: 'chemical_exposure', label: 'Chemical Exposure' },
  { key: 'location_site_condition', label: 'Location/Site Condition' },
] as const);

export const HIGHLY_HAZARDOUS_CHEMICALS = items([
  { key: 'ammonia', label: '1. Ammonia' },
  { key: 'acrylonitrile', label: '2. Acrylonitrile' },
  { key: 'benzyl_chloride', label: '3. Benzyl Chloride' },
  { key: 'hydrogen', label: '4. Hydrogen' },
  { key: 'formaldehyde', label: '5. Formaldehyde' },
  { key: 'methyl_chloride', label: '6. Methyl Chloride' },
] as const);

export const PTW1_SIGNATURES = items([
  { key: 'acceptor', label: 'Permit Acceptor' },
  { key: 'issuer', label: 'PTW Issuer' },
  { key: 'requestor', label: 'PTW Requestor' },
] as const);

// ---------- Form 2: Nouryon Permit / SCAN Card / Permit Closure ----------

export const FORM2_TITLE = 'Nouryon Permit / SCAN Card / Permit Closure';
export const SAFETY_CHECK_HEADING = 'Safety Check (Before work can start - PTW Acceptor)';

export const SAFETY_CHECK = items([
  { key: 'no_unexpected_pressure', label: 'Is equipment free of unexpected pressure?' },
  { key: 'ventilation', label: 'Is sufficient ventilation available?' },
  { key: 'slips_trips_falls', label: 'Has risk of slips, trips, falls been mitigated?' },
  { key: 'ptw_discussed', label: 'Has content of this PTW been discussed between parties?' },
  { key: 'scaffold_ladders_inspected', label: 'Has scaffolding, ladders been inspected prior to use?' },
  { key: 'surface_hazards', label: 'Have surface hazards been identified and mitigated?' },
  { key: 'emergency_exits', label: 'Are emergency exits known and free of obstructions?' },
  { key: 'showers_eyewash', label: 'Have safety showers/eyewash stations been identified/tested?' },
] as const);

export const CLOSURE_HEADING = 'Permit Closure';
export const CLOSURE_NOTE =
  'IMPORTANT NOTE: PTW Acceptor & Permit Issuer must report "NO" answers to their manager prior to closing';

export const CLOSURE_QUESTIONS = items([
  { key: 'completed_approved', label: '1. Was the work satisfactorily completed and approved by Owner?' },
  { key: 'site_cleaned', label: '2. Job site properly cleaned with no dust, tools, or materials left behind?' },
  { key: 'locks_removed', label: '3. All personal locks have been removed?' },
  { key: 'safe_return_to_service', label: '4. All equipment is safe to return to service (verified by Equipment Owner)?' },
  { key: 'completed_safely', label: '5. Work task was completed safely and as instructed?' },
  { key: 'manholes_returned', label: '6. All manhole covers returned to normal operating position?' },
  { key: 'waste_labeled', label: '7. Was waste generated from work properly labeled & reported to HSE?' },
  { key: 'no_liquid_exposure', label: '8. No exposure to compressed water, or any other liquid substance?' },
] as const);

// ---------- Form 3: TSTI Page 1 ----------

export const TSTI1_TITLE = 'Total Safety Task Instruction (TSTI) - Page 1';

export const TASK_PLANNING_FIELDS = items([
  { key: 'woPermitNumber', label: 'W.O. / Permit#' },
  { key: 'crewCraft', label: 'Crew/Craft' },
  { key: 'equipment', label: 'Equipment being worked on' },
  { key: 'jobDescription', label: 'Task Description' },
  { key: 'knownHazards', label: 'Known Hazards / Last Product' },
  { key: 'areaUnit', label: 'Area / Unit' },
  { key: 'plantEmergencyNumber', label: 'Plant Emergency#' },
  { key: 'alarmCode', label: 'Alarm Code' },
  { key: 'assemblyPoint', label: 'Nearest Safety Shelter/Assembly Point' },
  { key: 'evacuationRoute', label: 'Evacuation Route' },
  { key: 'safetyShowerLocations', label: 'Safety Shower Location(s)' },
  { key: 'areaTraining', label: 'Unit / Area Specific Training' },
] as const);
export type TaskPlanningField = (typeof TASK_PLANNING_FIELDS)[number]['key'];

export const STOP_WORK_CONDITIONS = items([
  { key: 'adjacent_work', label: 'Adjacent Work Hazards' },
  { key: 'chemical_spills', label: 'Chemical Spills/Releases' },
  { key: 'excessive_noise', label: 'Excessive Noise' },
  { key: 'fires_explosions', label: 'Fires & Explosions' },
  { key: 'change_in_conditions', label: 'Change in Conditions' },
  { key: 'evacuation_alarm', label: 'Evacuation Alarm' },
  { key: 'extreme_weather', label: 'Extreme Weather' },
  { key: 'unusual_odors', label: 'Unusual Odors' },
  { key: 'unsafe_condition', label: 'Unsafe Condition Recognized' },
  { key: 'missing_guards', label: 'Missing Guard(s)' },
] as const);

export const JSA_HEADERS = ['Basic Task Steps', 'Potential Hazards', 'Actions to Eliminate or Control Hazard'] as const;
export const COMMENTS_LABEL = 'FLS, Employee Comments, Changes in Condition(s)';

export const HAZARD_RECOGNITION_HEADING = 'Hazard Recognition / Considerations (Risk Management)';

export const HAZARD_RECOGNITION = {
  physical: {
    label: 'Physical',
    items: items([
      { key: 'process_hazards', label: 'Process Hazards' },
      { key: 'elevated_overhead_work', label: 'Elevated/Overhead Work' },
      { key: 'manual_lifting', label: 'Manual Lifting' },
      { key: 'rough_sharp_material', label: 'Rough/Sharp Material' },
      { key: 'slipping_uneven_surfaces', label: 'Slipping/Uneven Surfaces' },
      { key: 'vehicle_traffic', label: 'Vehicle Traffic' },
      { key: 'hot_cold_surfaces', label: 'Hot/Cold Surfaces' },
      { key: 'machinery_rotating', label: 'Machinery-Rotating' },
      { key: 'fall_from_heights', label: 'Fall from Heights' },
      { key: 'vibration', label: 'Vibration' },
      { key: 'arcing_sparks', label: 'Arcing/Sparks' },
      { key: 'excavation', label: 'Excavation' },
      { key: 'confined_space', label: 'Confined Space' },
      { key: 'falling_objects', label: 'Falling Objects' },
      { key: 'housekeeping', label: 'Housekeeping' },
      { key: 'flammable_material', label: 'Flammable Material' },
      { key: 'corrosive_materials', label: 'Corrosive Materials' },
      { key: 'adjacent_work', label: 'Adjacent Work' },
      { key: 'high_voltage', label: 'High Voltage' },
      { key: 'structural_surface_openings', label: 'Structural Surface Openings' },
      { key: 'poor_lighting', label: 'Poor Lighting' },
      { key: 'environmental', label: 'Environmental' },
      { key: 'electrocution_shock', label: 'Electrocution/Shock' },
      { key: 'repetitive_motion', label: 'Repetitive Motion' },
      { key: 'pinch_points_crushing', label: 'Pinch Points/Crushing' },
      { key: 'radiation_xray', label: 'Radiation/X-Ray' },
      { key: 'dust_flying_debris', label: 'Dust/Flying Debris' },
      { key: 'line_equip_under_pressure', label: 'Line/Equip Under Pressure' },
      { key: 'pedestrian_traffic', label: 'Pedestrian Traffic' },
    ] as const),
  },
  health: {
    label: 'Health',
    items: items([
      { key: 'asbestos_lead_silica', label: 'Asbestos/Lead/Silica' },
      { key: 'inert_gases', label: 'Inert Gases Present' },
      { key: 'toxic_atmosphere', label: 'Toxic Atmosphere' },
      { key: 'contaminated_soil_water', label: 'Contaminated Soil/Water' },
      { key: 'fumes', label: 'Fumes' },
      { key: 'temperature', label: 'Temperature' },
      { key: 'chemical_liquid_vapor', label: 'Chemical - Liquid/Vapor' },
      { key: 'fatigue', label: 'Fatigue' },
      { key: 'noise_excessive', label: 'Noise (Excessive)' },
    ] as const),
  },
  environmental: {
    label: 'Environmental',
    items: items([
      { key: 'chemical_spills_releases', label: 'Chemical Spills/Releases' },
      { key: 'waste_water', label: 'Waste Water' },
      { key: 'env_other', label: 'Other' },
    ] as const),
  },
} as const;

export type RecognitionGroup = keyof typeof HAZARD_RECOGNITION;
export type RecognitionKey = (typeof HAZARD_RECOGNITION)[RecognitionGroup]['items'][number]['key'];

/** Physical and Health share no keys; keys are unique across all three groups. */
export const RECOGNITION_ITEMS: (Item<RecognitionKey> & { group: RecognitionGroup })[] = (
  Object.entries(HAZARD_RECOGNITION) as [RecognitionGroup, (typeof HAZARD_RECOGNITION)[RecognitionGroup]][]
).flatMap(([group, g]) => g.items.map((i) => ({ ...i, group })));

export const recognitionLabel = (key: string): string => {
  const item = RECOGNITION_ITEMS.find((i) => i.key === key);
  return item ? `${HAZARD_RECOGNITION[item.group].label}: ${item.label}` : key;
};

export const LEADER_QUESTIONS_HEADING = 'FLS Mandatory Leader Questions';

/** Questions 1-9 are Yes/No. Question 10 is free text. */
export const LEADER_QUESTIONS = items([
  { key: 'q1', label: '1. Are you fit to work today?' },
  { key: 'q2', label: '2. Tools/Equipment correct for task?' },
  { key: 'q3', label: '3. Do you have the correct PPE?' },
  { key: 'q4', label: '4. TSTI identifies risk/mitigation?' },
  { key: 'q5', label: '5. Comfortable with STOP work?' },
  { key: 'q6', label: '6. Know how to contact supervision?' },
  { key: 'q7', label: '7. Committed to ZERO HARM 24/7?' },
  { key: 'q8', label: '8. Is training/knowledge matched?' },
  { key: 'q9', label: '9. Can you get hurt performing this?' },
] as const);
export type LeaderQuestionKey = (typeof LEADER_QUESTIONS)[number]['key'];
export const LEADER_Q10 = '10. What would it mean if you did?';

// ---------- Form 4: TSTI Page 2 ----------

export const TSTI2_TITLE = 'TSTI - Page 2 (Task Planning & Risk Management)';

export const TSTI2_TEXT_FIELDS = items([
  { key: 'standardEquipment', label: 'Standard Equipment Requirements' },
  { key: 'specialEquipment', label: 'Special Equipment / Tools' },
  { key: 'supportCraft', label: 'Support Craft - Third Party' },
] as const);

export const SAFE_WORK_PRACTICES = items([
  { key: 'abrasive_blasting', label: 'Abrasive Blasting' },
  { key: 'lead_abatement', label: 'Lead Abatement' },
  { key: 'confined_space_entry', label: 'Confined Space Entry' },
  { key: 'crane_lift_plan', label: 'Crane Lift Study/Plan' },
  { key: 'electrical_close_proximity', label: 'Electrical - Close Proximity' },
  { key: 'excavations_shoring', label: 'Excavations & Shoring' },
  { key: 'hot_taps', label: 'Hot Taps' },
  { key: 'line_break_equip_opening', label: 'Line Break/Equip Opening' },
  { key: 'loto', label: 'LOTO' },
  { key: 'sds_labeling', label: 'SDS & Labeling' },
  { key: 'angle_grinder_cutting', label: 'Angle Grinder - Cutting' },
  { key: 'other', label: 'Other' },
] as const);

export const BASIC_SAFEGUARDS = items([
  { key: 'bottle_watch', label: 'Bottle Watch' },
  { key: 'barricades', label: 'Barricades (with tags)' },
  { key: 'warning_signs', label: 'Post Warning Signs' },
  { key: 'fire_extinguishers', label: 'Fire Extinguishers Located' },
  { key: 'fire_watch', label: 'Fire Watch' },
  { key: 'hole_covers', label: 'Hole Covers With Labels' },
  { key: 'attendant', label: 'Attendant' },
  { key: 'housekeeping', label: 'Housekeeping' },
  { key: 'additional_lighting', label: 'Lighting - Additional' },
  { key: 'tracing_deenergized', label: 'Steam/Elec Tracing De-Energized' },
  { key: 'scaffolding', label: 'Scaffolding' },
  { key: 'tools_good_condition', label: 'Tools and equip. in good condition' },
  { key: 'ventilation_exhaust', label: 'Ventilation/Exhaust System' },
] as const);

/** PPE Required. Keys double as ppeItems codes in the PPE matrix. */
export const PPE_REQUIRED = items([
  { key: 'arc_suit', label: 'Arc Suit' },
  { key: 'chem_resistant_clothing', label: 'Chem. Resistant Clothing' },
  { key: 'safety_glasses', label: 'Safety Glasses' },
  { key: 'face_shield', label: 'Face Shield' },
  { key: 'goggles', label: 'Goggles' },
  { key: 'footwear_other', label: 'Foot Wear (Other than steel toe)' },
  { key: 'head_protection', label: 'Head Protection' },
  { key: 'hearing_protection', label: 'Hearing Protection' },
  { key: 'respirator', label: 'Respirator (APR/SCBA)' },
  { key: 'weather_clothing', label: 'Weather Resistant Clothing' },
  { key: 'fall_protection', label: 'Fall Protection' },
  { key: 'cut_sleeves', label: 'Cut Resistant Sleeves' },
  { key: 'ppe_other', label: 'Other' },
] as const);

/** Gloves Required. Keys double as ppeItems codes. */
export const GLOVES_REQUIRED = items([
  { key: 'gloves_impact_cut_puncture', label: 'Impact/Cut/Puncture Resistant' },
  { key: 'gloves_chemical', label: 'Chemical Resistant (Specify)' },
  { key: 'gloves_voltage', label: 'Voltage Rated' },
  { key: 'gloves_welder_heat', label: 'Welder/Heat Gloves' },
  { key: 'gloves_vibration', label: 'Vibration Resistant' },
  { key: 'gloves_steel_mesh', label: 'Steel Mesh' },
  { key: 'gloves_cut_only', label: 'Cut Resistant Only' },
  { key: 'gloves_nitrile', label: 'Nitrile (Surgical Type)' },
  { key: 'gloves_other', label: 'Other' },
] as const);
export const GLOVES_OTHER_NOTE = '(Site Manager Approval Required)';

export const FALL_PROTECTION = items([
  { key: 'harness_inspected', label: 'Harness has been inspected' },
  { key: 'srl_inspected', label: 'SRL(s) have been inspected' },
  { key: 'tie_off_points', label: 'Approved tie-off points available' },
  { key: 'rescue_plan', label: 'Rescue plan reviewed/approved' },
  { key: 'lifelines_inspected', label: 'Lifelines have been inspected' },
  { key: 'stretcher', label: 'Stretcher person/equip needed' },
  { key: 'safe_access', label: 'Safe access provided' },
  { key: 'level2_heights', label: 'Level 2: working at heights' },
  { key: 'tethers', label: 'Two person/vehicle tethers needed' },
  { key: 'on_scaffold', label: 'Working on scaffold' },
  { key: 'other', label: 'Other' },
] as const);

export const HEAVY_EQUIPMENT = items([
  { key: 'spotter', label: 'Spotter needed' },
  { key: 'multiple_spotters', label: 'Multiple Spotters Needed' },
  { key: 'area_hazards', label: 'Area hazards identified/mitigated' },
  { key: 'inspection', label: 'Inspection completed' },
  { key: 'permit_area', label: 'Permit required/area' },
  { key: 'ground_stable', label: 'Ground stable for type/weight' },
  { key: 'spotter_vest', label: 'Vest worn by spotter(s)' },
  { key: 'signal_person', label: 'Signal person assigned' },
  { key: 'traffic_rerouted', label: 'Person & vehicle traffic rerouted' },
  { key: 'overhead_obstructions', label: 'Overhead obstructions addressed' },
] as const);

export const ANGLE_GRINDER_HEADING = 'Angle Grinder: Cutting Operation Permit';
export const ANGLE_GRINDER_CHECKS = items([
  { key: 'pre_job_check', label: 'Pre-job check completed' },
  { key: 'conditions_acceptable', label: 'Conditions are acceptable' },
  { key: 'lototo', label: "System has been LOTOTO'd" },
  { key: 'walked_down', label: 'System walked down' },
] as const);

export const TSTI2_SIGNATURE_LABELS = {
  employee: 'Employee Signature',
  badge: 'Badge/JDE #',
  twoUp: 'Two Up Signature Required?',
  twoUpActivity: 'If yes, list activity below',
  flsHeading: 'FLS Supervisor Review / Authorization of TSTI @ Task Location',
  fls: 'FLS / Designee Signature',
  management: 'Management / Designee Signature',
} as const;

export type Key<L extends readonly Item[]> = L[number]['key'];
