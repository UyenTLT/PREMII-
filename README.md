# PREMII file-only workspace

English / Traditional Chinese website for extracting documented PREMII observations from uploaded medical records. There is **no manual assessment form**. The workflow is upload → automatic extraction → inspect read-only evidence → export PDF/JSON/CSV.

## Run and build

Python 3.12+ serves the site locally:

```bash
cd /workspace/PREMII-
python3 server.py --host 0.0.0.0 --port 3000
```

Document readers are bundled locally in public/vendor. Node.js 24+ refreshes them:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run build
```

No database, API credentials or external inference service is required by the website. All documents are read in the visitor's browser.

## File-only workflow

- Select one or more TXT (UTF-8 or Big5), DOCX or text-based PDF files. Maximum 10 MB/file, 200 PDF pages, 2 million extracted characters/file and 3000 source observations/session. Scanned PDFs require OCR first. Blank PREMII questionnaire templates are not patient records.
- Processing starts automatically. Explicit study/infant ID headings and standalone dated note headings separate source observations. Identifiers retain leading zeros. Unknown IDs, dates, shifts, start/end times and event counts remain null; no current date or shift schedule is invented. Source note timestamps are not shift boundaries.
- Supported explicit item codes and recognizable current support/FiO2/weight/TPN/warming/caffeine observations are extracted with evidence. Text rules are conservative and can miss or misread clinical context, history and negation. Unrecognized information remains **Not found in source**, rather than normal, zero or No. Conflicting explicit codes remain unresolved. Nothing is clinically verified merely because extraction succeeded.
- **View source results** selects a source note to inspect, without entering or completing data. Results and the source text are read-only. There is no Save assessment step; records are created automatically during import.
- **Export selected PDF** opens the browser print dialog; choose Save as PDF, A4, with browser headers/footers disabled. An adapted seven-page report follows the source questionnaire sections and four-column layout. An explicit shift is put in its correct column; an unspecified shift is labeled as an observation, not assigned a shift number. One selected source note is exported, preventing unrelated patients/dates from being combined.
- JSON/CSV export all observations, including source filenames, extraction evidence and per-field missingness. Complete original note text is excluded from exports, but evidence excerpts can contain health data. Save exports securely. Session data disappears on refresh/close. Only the interface language preference persists in local storage.

These reports are source-note summaries. Without documented shift boundaries, they are **not validated per-shift PREMII measurements**. No validated total-score algorithm was supplied; the app does not calculate a total. Translation and extraction require clinical review. There are no accounts, persistent clinical storage, cross-visitor shared records or multi-user synchronization.

## Checks

```bash
npm run check
python3 -m unittest discover -s tests -v
```

With Playwright and Chromium available, start the local server and run `node tests/test-browser.cjs`. Optional `PREMII_TEST_URL` selects a test server and `CHROMIUM_PATH` selects Chromium. The browser check generates synthetic TXT/DOCX/PDF patient documents and verifies automatic extraction, no manual-entry fields, unknown vs zero values, bilingual switching, mobile width and seven-page PDFs. It never publishes patient files.

## Hosting

Render uses render.yaml and builds the main branch, publishing only public/. The public service is https://premii-workspace.onrender.com . GitHub Pages is https://uyentlt.github.io/PREMII-/ ; after committing public/ changes, `bash scripts/deploy-pages.sh` publishes the committed static assets to gh-pages. Medical examples, original uploaded source documents and exported assessments must never be added to public/ or Git.

[Deploy on Render](https://render.com/deploy?repo=https://github.com/UyenTLT/PREMII-)

## Sources and attribution

Based on the supplied English PREMature Infant Index Questionnaire and the item-code document “PREMII 建立資料用”. © 2018 Shire Human Genetic Therapies, Inc. PREMII is a trademark of Shire, a Takeda company. The original questionnaire states reproduction permission from Shire; this project does not assert independent distribution permission or clinical certification. The report is adapted, not a pixel-identical or licensed original form. Mammoth/PDF.js licenses are in public/vendor.
