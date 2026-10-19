# I&E Digital Workbench

A centralized suite of instrumentation tools built for field technicians and engineers — open one file in a browser and get to work.

## Tools Included

| Tool | File | What it does |
| --- | --- | --- |
| **4-20mA Calculator** | `4-20mA_Calc.html` | Converts engineering units to mA and back, with live calculation as you type. |
| **Loop Check SOP** | `LoopCheck_SOP.html` | Generates an interactive, step-by-step procedure for field loop verification. |
| **Drift Analysis** | `Drift_Analysis.html` | Takes pasted CSV calibration data and flags instruments that are out of tolerance. |

| **TSTI / JSA Permit Drafter** | `safety-permit-pwa/` | Offline PWA for drafting PTW, TSTI/JSA, and permit closure with Morris site rules enforced. Has a build step; see its README. |

`index.html` is the launcher: a card grid that links to each tool and shows its status.

## Tech Stack

- **Pure HTML, CSS, and JavaScript** — no frameworks, no build step.
- **Zero dependencies** — no npm packages, CDNs, or external requests.
- **Single-file deployment** — each tool is one self-contained `.html` file. Copy it to a laptop, a shared drive, or a USB stick and it runs offline in any modern browser.

To use the workbench, clone the repo and open `index.html`.

## Roadmap

Planned:

- **Control Valve Sizing** — quick reference and calculation tool for Cv and flow characteristics.

Under consideration:

- RTD / thermocouple lookup (resistance and millivolt to temperature)
- Pressure and level unit conversions, including DP level with specific gravity
- Calibration sheet generator with as-found / as-left records

New tools follow the same pattern: one self-contained HTML file, plus a card in `index.html`.

## Why

Field I&E work runs on knowledge that rarely gets written down well: the scaling math done on the back of a work order, the loop check sequence a senior tech carries in their head, the judgment call on whether a transmitter has drifted far enough to matter.

This project is an attempt to bridge that field expertise with product-minded technical writing. Each tool takes a task technicians actually perform and turns it into something clear, repeatable, and usable at the instrument — documentation that does the work with you instead of sitting in a binder.
