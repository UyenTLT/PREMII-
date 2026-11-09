# CGMH PREMII Tracker

A research prototype using Next.js + TypeScript + backend SQLite (Node 24 built-in). SQLite is the environment-appropriate equivalent to PostgreSQL for a single-server research workspace. It stores records on disk; browser storage is not used for clinical records.

## Run

```
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000, create the first administrator with a password of at least 12 characters. Settings → Seed synthetic data populates eight fictitious infants and 24 shifts. Add entry and reviewer accounts from Settings. No default credentials. Production: `npm run build && npm start`.

Database schema migration is in `migrations/001.sql`; startup applies the same idempotent schema. Back up the complete data directory using SQLite backup facilities or with server stopped; do not copy a live WAL database piecemeal. Use a persistent volume for `DATABASE_PATH`, HTTPS and hospital network controls. Do not run this SQLite edition on ephemeral/serverless storage. PostgreSQL migration and institutional identity integration are future deployment work.

## Validation

```
npm test
npm run typecheck
npm run build
npm run test:api
# First run on your own machine:
npx playwright install chromium
npm run test:browser
```

Browser tests run a real Chromium against a temporary Next.js server and synthetic database. Set `CHROMIUM_PATH=/usr/bin/chromium` to use an installed system Chromium. The text report is in `docs/browser-test-results.json`; screenshots are generated locally under the ignored `docs/screenshots/` directory.

API smoke starts a temporary local server/database, verifies authentication/roles, CRUD, overlap, review, revisions, conflict checks, imports and CSV, then removes test artifacts. It does not publish clinical data.

## Features

Dashboard; infant creation/search/filter and details; arbitrary shifts crossing midnight; draft/submit/request changes/confirm; confirmed revisions and audit history; timestamped source review and multi-infant TXT suggestions; response branching; raw measurement trends; UTF8 CSV export and dictionary; server-side roles; optimistic version checks and transactional shift updates. Passwords are scrypt-hashed; sessions use HTTP-only SameSite cookies and expire in 8h.

## Rules

See `docs/DOCUMENT_CROSSWALK.md` and `docs/DATA_DICTIONARY.md`. Total score is intentionally disabled. Original source files are not included. The app does not upload clinical notes to an AI service.

## Known limits and production readiness

- This is a research prototype, not a certified clinical device. Final research rule approval remains pending.
- Browser UI verification passed on Chromium: setup/login, synthetic seed, infant creation, overnight assessment, conditional OA, source review, confirmation, trend navigation, CSV download and tablet layout. No uncaught page JavaScript errors were observed.
- A live application preview URL is unavailable because the managed preview relay is not running. The private download Site serves the source ZIP; it is a separate download page. Run this application using the instructions above. GitHub Pages and static hosting cannot run its persistent backend.
- UI has centralized main navigation/status labels in Traditional Chinese and English. Some detailed clinical/help labels remain bilingual rather than fully translated.
- Regex extraction is deliberately conservative and limited to nCPAP/mechanical ventilation, explicit cannula flows, FiO2%, weight and feeding terms. It does not automatically populate forms, infer shift assignment, parse every respiratory device or count events. Humans review source and enter final observations. Context warnings are heuristic and are not clinical inference.
- Review UI associates evidence decisions with infants/shifts and preserves source line/offset. Concurrent evidence review and shifts both use optimistic version checks. Import confirmation is hash-deduplicated; source review and form update are separate actions.
- Trend charts show individual observations and missing values without interpolation. Horizontal point positions use actual timestamps; empty intervals are left blank. A dedicated gap timeline is not included.
- No password reset, account deactivation, login rate limiting, external SSO, encrypted-at-rest database, automated retention or production backup scheduler. First-admin bootstrap must be performed on a trusted private network before broader access.
- PDF/Word supplementary mappings are documented, but raw dictionary names include `flow`/`caffeine` rather than every legacy Word alias. Export includes first weight, all measurements and missing state.

## Sources and attribution

Based on the supplied English PREMature Infant Index Questionnaire and “PREMII 建立資料用”. © 2018 Shire Human Genetic Therapies, Inc. PREMII is a trademark of Shire, a Takeda company. The supplied questionnaire states reproduction permission from Shire; this project does not assert independent distribution permission or clinical certification. The source records and original questionnaire files are not redistributed.
