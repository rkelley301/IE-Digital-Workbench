// Ported verbatim from Site_Safety_Sim.html (built from the Morris site safety
// training notes). Regenerate rather than hand-edit if the sim content changes.
import type { TrainingScenario } from '../types';

export const TRAINING_SCENARIOS: TrainingScenario[] = [
  {
    "id": "attendant",
    "title": "The Attendant",
    "role": "Confined-space attendant",
    "tag": "Confined Space",
    "workConditions": [
      "confined_space"
    ],
    "steps": [
      {
        "text": "You're the attendant on a permit-required confined space. Over the radio, you can tell the entrant is showing signs of exposure. He says he's almost done.",
        "options": [
          {
            "t": "Let him finish — he's almost done",
            "fail": "He pushes on. Five minutes later he stops answering the radio. Now it's a rescue, not an exit."
          },
          {
            "t": "Order an immediate evacuation of the space",
            "ok": true
          },
          {
            "t": "Call the Site Director and wait for direction",
            "fail": "You're on hold while the exposure continues. The trigger was already met — evacuation doesn't wait on a phone call."
          }
        ],
        "why": "A worker showing signs or symptoms of exposure = evacuate the permit space.",
        "ref": "p. 1"
      },
      {
        "text": "Everyone's out and okay. The crew lead says: \"Permit's still good. We'll finish after lunch.\"",
        "options": [
          {
            "t": "Go back in on the same permit — nothing changed on paper",
            "fail": "The crew re-enters a space nobody reassessed. The paper matched this morning, not this afternoon."
          },
          {
            "t": "Treat the permit as invalid: stop, reassess conditions & hazards, resume only when authorized",
            "ok": true
          },
          {
            "t": "Re-enter, but keep it short",
            "fail": "Short exposure is still exposure. Conditions changed and nobody reassessed them."
          }
        ],
        "why": "Conditions changed. A permit is valid only while its issued conditions stay unchanged.",
        "ref": "p. 2"
      }
    ]
  },
  {
    "id": "outside",
    "title": "Trouble Outside",
    "role": "Entrant",
    "tag": "Confined Space",
    "workConditions": [
      "confined_space"
    ],
    "steps": [
      {
        "text": "You're working inside a vessel. The attendant radios: a dangerous situation is developing out in the unit — not in your space.",
        "options": [
          {
            "t": "Keep working — the hazard isn't in here",
            "fail": "The situation outside spreads. Your only exit now runs straight through it."
          },
          {
            "t": "Evacuate the space now",
            "ok": true
          },
          {
            "t": "Stay inside and wait until it passes",
            "fail": "You're sealed in a space with one way out while things get worse on the other side of it."
          }
        ],
        "why": "A dangerous situation outside the space can still require evacuation.",
        "ref": "p. 1"
      },
      {
        "text": "Now the emergency alarm sounds. What just happened to your work permit?",
        "options": [
          {
            "t": "Still valid — we didn't cause the alarm",
            "fail": "The crew keeps working under a permit that no longer matches reality."
          },
          {
            "t": "It's invalid",
            "ok": true
          },
          {
            "t": "It becomes valid again once the alarm stops",
            "fail": "An alarm doesn't pause a permit. It ends it."
          }
        ],
        "why": "An emergency alarm makes the work permit invalid.",
        "ref": "p. 2"
      },
      {
        "text": "All clear is called. Your crew wants to jump right back in.",
        "options": [
          {
            "t": "Resume immediately — the alarm's over",
            "fail": "Nobody checked what the event changed. You're back inside on stale assumptions."
          },
          {
            "t": "Reassess conditions & hazards; resume only when authorized",
            "ok": true
          }
        ],
        "why": "PERMIT INVALID → STOP → REASSESS → RESUME ONLY WHEN AUTHORIZED.",
        "ref": "p. 2"
      }
    ]
  },
  {
    "id": "attgone",
    "title": "No Eyes Outside",
    "role": "Entrant",
    "tag": "Confined Space",
    "workConditions": [
      "confined_space"
    ],
    "steps": [
      {
        "text": "Mid-task, your attendant gets pulled away to help another crew. Nobody is doing the attendant's job now.",
        "options": [
          {
            "t": "Keep working — he'll be back soon",
            "fail": "Something goes wrong inside and nobody outside knows. The safety net you were counting on is gone."
          },
          {
            "t": "Evacuate the permit space",
            "ok": true
          },
          {
            "t": "Have your partner inside keep an eye on you",
            "fail": "An entrant can't be the attendant. The role outside the space is empty."
          }
        ],
        "why": "The attendant can no longer perform their duties → evacuate.",
        "ref": "p. 1"
      }
    ]
  },
  {
    "id": "gas",
    "title": "The Gas Reading",
    "role": "Pre-entry check",
    "tag": "Atmosphere",
    "workConditions": [
      "confined_space"
    ],
    "steps": [
      {
        "text": "Before entry, the meter reads 19.1% O₂. The crew is ready to go.",
        "options": [
          {
            "t": "Call it normal — it's close to 20.9%",
            "fail": "\"Close\" put the crew into an oxygen-deficient atmosphere."
          },
          {
            "t": "Oxygen deficient — conditions don't support entry as planned",
            "ok": true
          },
          {
            "t": "Call it oxygen enriched",
            "fail": "Wrong direction. The reading is low, not high."
          }
        ],
        "why": "Below 19.5% O₂ = oxygen deficient. Normal is about 20.9%.",
        "ref": "p. 2"
      },
      {
        "text": "The crew lead asks what everyone needs to know before any permit-space entry. Pick the complete answer.",
        "options": [
          {
            "t": "Just the gas reading",
            "fail": "One number doesn't tell you how exposure happens or what it looks like."
          },
          {
            "t": "Conditions, hazards, mode of exposure, signs/symptoms, consequences — and watch for changes",
            "ok": true
          },
          {
            "t": "Who the attendant is",
            "fail": "Important, but it's not the knowledge list."
          }
        ],
        "why": "Know what hazards are present, how exposure can happen, and what exposure looks like — before entering.",
        "ref": "p. 1"
      }
    ]
  },
  {
    "id": "hpu",
    "title": "Flame at the HPU",
    "role": "E&I / maintenance support",
    "tag": "Hydrogen",
    "workConditions": [
      "hpu",
      "open_flame",
      "hot_work"
    ],
    "steps": [
      {
        "text": "A bolt on equipment in the Hydrogen Purification Unit is seized. Someone suggests a torch.",
        "options": [
          {
            "t": "Pull a standard Hot Work Permit and go",
            "fail": "A hot work permit alone isn't the HPU rule. Open flame here needs more — and hydrogen is extremely flammable."
          },
          {
            "t": "Stop: open flame here needs special review + Site Director approval",
            "ok": true
          },
          {
            "t": "Do it fast before anyone notices",
            "fail": "An uncontrolled ignition source in a hydrogen unit. This is how the incident report starts."
          }
        ],
        "why": "No open flames at the HPU. Any open flame requires special review + Site Director approval.",
        "ref": "p. 4"
      },
      {
        "text": "Plan B: break a fitting loose by hand on the hydrogen system. What tools?",
        "options": [
          {
            "t": "Standard steel wrench",
            "fail": "Steel on steel can spark. Around hydrogen that's the one thing you don't want."
          },
          {
            "t": "Non-sparking tools",
            "ok": true
          },
          {
            "t": "Whatever's in the gang box",
            "fail": "Unknown tools = unknown spark risk around an extremely flammable gas."
          }
        ],
        "why": "Hydrogen is extremely flammable — use non-sparking tools.",
        "ref": "p. 5"
      },
      {
        "text": "It's still stuck. You'd need to strike the wrench with a hammer. Permit check?",
        "options": [
          {
            "t": "No permit — it's just a hand tool",
            "fail": "Striking is on the Hot Work list for a reason: it can throw a spark."
          },
          {
            "t": "Hot Work Permit required — striking objects with hand tools",
            "ok": true
          }
        ],
        "why": "Striking objects with hand tools requires a Hot Work Permit.",
        "ref": "p. 3"
      }
    ]
  },
  {
    "id": "arquad",
    "title": "Contractor in Arquad",
    "role": "Contractor",
    "tag": "Hazardous Areas",
    "workConditions": [
      "arquad_area",
      "methyl_chloride",
      "hazardous_area"
    ],
    "steps": [
      {
        "text": "You're sent to the Arquad Area for a job. Before entering this hazardous area, you must know…",
        "options": [
          {
            "t": "The Emergency Response Plan + the hazardous chemicals present",
            "ok": true
          },
          {
            "t": "Your job scope — the rest is operations' problem",
            "fail": "An alarm sounds and you don't know where to go or what you might have been exposed to."
          },
          {
            "t": "Where the break room is",
            "fail": "Not on the list."
          }
        ],
        "why": "Hazardous-area contractors must know the ERP and the hazardous chemicals present.",
        "ref": "p. 4"
      },
      {
        "text": "What hazards does the Arquad Area carry?",
        "options": [
          {
            "t": "Flammable liquids only",
            "fail": "You skip eye protection and catch a splash. Half the hazard picture is missing."
          },
          {
            "t": "Flammable liquids + eye/chemical irritation",
            "ok": true
          },
          {
            "t": "Irritation only",
            "fail": "You bring a spark source into an area with flammable liquids."
          }
        ],
        "why": "Arquad: flammable liquids + potential eye and chemical irritation hazards.",
        "ref": "p. 5"
      },
      {
        "text": "The job also touches methyl chloride. What's the call?",
        "options": [
          {
            "t": "Highly flammable + hazardous chemical",
            "ok": true
          },
          {
            "t": "Inert — no special concern",
            "fail": "Treating a highly flammable, hazardous chemical as inert is how small jobs become big events."
          },
          {
            "t": "Flammable, but not hazardous otherwise",
            "fail": "Only half right. It's both."
          }
        ],
        "why": "METHYL CHLORIDE = HIGHLY FLAMMABLE + HAZARDOUS.",
        "ref": "p. 5"
      }
    ]
  },
  {
    "id": "heat",
    "title": "Hot Day, Tank Farm",
    "role": "Coworker",
    "tag": "First Aid / Fire",
    "workConditions": [],
    "steps": [
      {
        "text": "A coworker is suffering heat exhaustion. Which response does this course treat as correct?",
        "options": [
          {
            "t": "Keep working, hydrate at the next break",
            "fail": "They keep going. Heat illness gets worse, not better, under load."
          },
          {
            "t": "Elevate their feet/legs over their head",
            "ok": true
          },
          {
            "t": "Walk it off",
            "fail": "More exertion in the heat is the opposite of treatment."
          }
        ],
        "why": "Course point: elevating the victim's feet/legs is the correct heat-exhaustion response in this training. Verify site first-aid direction.",
        "ref": "p. 4"
      },
      {
        "text": "Across the lot, a gasoline can catches fire. When you report it, what fire class is it?",
        "options": [
          {
            "t": "Class A",
            "fail": "Class A is ordinary combustibles. Gasoline is a flammable liquid."
          },
          {
            "t": "Class B",
            "ok": true
          },
          {
            "t": "Class C",
            "fail": "Not an electrical fire."
          }
        ],
        "why": "Gasoline fires are Class B. B = Burning liquids.",
        "ref": "p. 3"
      }
    ]
  }
];

/** Quick-reference rules from the training notes, shown in training mode. */
export const QUICK_RULES: { topic: string; rule: string; ref: string }[] = [
  {
    "topic": "Oxygen deficiency",
    "rule": "Below 19.5% O₂",
    "ref": "p. 2"
  },
  {
    "topic": "Normal air",
    "rule": "About 20.9% O₂",
    "ref": "p. 2"
  },
  {
    "topic": "Gasoline fire",
    "rule": "Class B (flammable liquid). B = Burning liquids",
    "ref": "p. 3"
  },
  {
    "topic": "Emergency alarm",
    "rule": "Work permit becomes INVALID",
    "ref": "p. 2"
  },
  {
    "topic": "Work conditions change",
    "rule": "Work permit becomes INVALID",
    "ref": "p. 2"
  },
  {
    "topic": "After a permit goes invalid",
    "rule": "Stop work → reassess conditions & hazards → resume only when authorized",
    "ref": "p. 2"
  },
  {
    "topic": "Spark / Heat / Flame",
    "rule": "Think HOT WORK PERMIT",
    "ref": "p. 3"
  },
  {
    "topic": "Power tools in hazardous area",
    "rule": "Hot Work Permit required",
    "ref": "p. 3"
  },
  {
    "topic": "Striking with hand tools",
    "rule": "Hot Work Permit required",
    "ref": "p. 3"
  },
  {
    "topic": "Spark-producing work / open flame / cutting & welding",
    "rule": "Hot Work Permit required",
    "ref": "p. 3"
  },
  {
    "topic": "Normal walk-through",
    "rule": "No Hot Work Permit required",
    "ref": "p. 3"
  },
  {
    "topic": "Hazardous-area contractors",
    "rule": "Know the Emergency Response Plan + the hazardous chemicals present",
    "ref": "p. 4"
  },
  {
    "topic": "Heat exhaustion (course answer)",
    "rule": "Elevate the victim's feet/legs over their head — verify site first-aid direction",
    "ref": "p. 4"
  },
  {
    "topic": "Before permit-space entry",
    "rule": "Know conditions, hazards, mode of exposure, signs/symptoms, consequences; watch for changes",
    "ref": "p. 1"
  },
  {
    "topic": "Worker shows exposure",
    "rule": "EVACUATE the permit space",
    "ref": "p. 1"
  },
  {
    "topic": "Attendant can't perform duties",
    "rule": "EVACUATE the permit space",
    "ref": "p. 1"
  },
  {
    "topic": "Danger develops outside the space",
    "rule": "EVACUATE the permit space",
    "ref": "p. 1"
  },
  {
    "topic": "Hydrogen Purification Unit",
    "rule": "No open flames. Open flame needs special review + Site Director approval",
    "ref": "pp. 4–5"
  },
  {
    "topic": "Hydrogen",
    "rule": "Extremely flammable — use non-sparking tools",
    "ref": "p. 5"
  },
  {
    "topic": "Methyl Chloride",
    "rule": "Highly flammable + hazardous chemical",
    "ref": "p. 5"
  },
  {
    "topic": "Arquad Area",
    "rule": "Flammable liquids + eye/chemical irritation hazards",
    "ref": "p. 5"
  }
];
