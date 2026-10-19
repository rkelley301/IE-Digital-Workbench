# TSTI / JSA Permit Drafter (PWA)

Offline-first drafting tool for Morris site PTW 1, TSTI pages 1–2, and permit closure.
**Technician is final authority. App is a drafting tool.**

Unlike the other workbench tools, this one has a build step: React + TypeScript (Vite),
Tailwind, Dexie (IndexedDB), and vite-plugin-pwa (service worker precaches the app shell).

```sh
npm install
npm run dev      # local dev server
npm run build    # typecheck + production build to dist/
npm run preview  # serve dist/ to test install + offline
npm test         # safety engine, validation, and migration tests
```

## Forms

`src/forms/templates.ts` holds the exact wording of the paper forms (PTW 1, Form 2,
TSTI Page 1 and 2). Components render from it; edit it only to match the paper.
Sections marked "App only" in the UI (site rule triggers, rule requirements, gas tests,
STOP Work acknowledgment, closure sign-off) are not on the paper forms.

## Data layout (`src/db`)

- `types.ts` — record types for every table
- `schema.ts` — Dexie database and indexes
- `seed/reference.ts` — hardcoded PPE, hazard library, Morris site rules
- `seed/training.ts` — training scenarios ported from `Site_Safety_Sim.html`
- `seed/index.ts` — loads reference data on startup (bump `SEED_VERSION` after edits)
- `repo.ts` — the only write path: records changes in the outbox, refuses to delete rule-mandated items

All data stays on the device. There is no backend. The `outbox` table records changes
so a sync target can be added later without a schema change.
