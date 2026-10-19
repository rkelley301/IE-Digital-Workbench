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
```

## Data layout (`src/db`)

- `types.ts` — record types for every table
- `schema.ts` — Dexie database and indexes
- `seed/reference.ts` — hardcoded PPE, hazard library, Morris site rules
- `seed/training.ts` — training scenarios ported from `Site_Safety_Sim.html`
- `seed/index.ts` — loads reference data on startup (bump `SEED_VERSION` after edits)

All data stays on the device. There is no backend. The `outbox` table records changes
so a sync target can be added later without a schema change.
