# PREMII file-only workspace

English / Traditional Chinese website for extracting documented PREMII observations from uploaded medical records. There is **no manual assessment form**. The workflow is upload → automatic extraction → inspect read-only evidence → export PDF/Excel/JSON/CSV.

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
- **Export selected PDF** opens the browser print dialog; choose Save as PDF, A4, with browser headers/footers disabled. The compact report uses one or two pages: a clinical summary grouped into respiratory/oxygen support, thermoregulation, feeding, ABD events and weight, then source evidence on page two for dense summaries or more than four unique excerpts. Missing values, not-applicable fields and conflicts are explicitly distinguished by the legend. Only the recorded choices are listed. A maximum of eight shortened excerpts is printed; full evidence remains in JSON. One selected source note is exported, with its source timestamp and any explicit shift boundaries. No shift is inferred.

- Excel (.xlsx) and CSV export all observations with only the 33 PREMII clinical fields in columns A–AG. It excludes internal IDs, filenames, source offsets, extraction status, schema versions, evidence and missingness metadata. JSON retains that audit metadata separately. Complete original note text is excluded from exports, but evidence excerpts can contain health data. Save exports securely. Session data disappears on refresh/close. Only the interface language preference persists in local storage.

These reports are source-note summaries. Without documented shift boundaries, they are **not validated per-shift PREMII measurements**. No validated total-score algorithm was supplied; the app does not calculate a total. Translation and extraction require clinical review. There are no accounts, persistent clinical storage, cross-visitor shared records or multi-user synchronization.

## Checks

```bash
npm run check
python3 -m unittest discover -s tests -v
```

With Playwright and Chromium available, start the local server and run `node tests/test-browser.cjs`. Optional `PREMII_TEST_URL` selects a test server and `CHROMIUM_PATH` selects Chromium. The browser check generates synthetic TXT/DOCX/PDF patient documents and verifies automatic extraction, no manual-entry fields, unknown vs zero values, bilingual switching, mobile width and one/two-page PDFs. It never publishes patient files.

## Hosting

This legacy static site uses render.yaml on branch fix/legacy-import-results, publishing only public/. The repository main branch now contains a separate Next.js Tracker application; do not point this static service at main. The public service is https://premii-workspace.onrender.com . GitHub Pages is https://uyentlt.github.io/PREMII-/ ; after committing public/ changes, `bash scripts/deploy-pages.sh` publishes the committed static assets to gh-pages. Medical examples, original uploaded source documents and exported assessments must never be added to public/ or Git.

[Deploy on Render](https://render.com/deploy?repo=https://github.com/UyenTLT/PREMII-)

## Sources and attribution

Based on the supplied English PREMature Infant Index Questionnaire and the item-code document “PREMII 建立資料用”. © 2018 Shire Human Genetic Therapies, Inc. PREMII is a trademark of Shire, a Takeda company. The original questionnaire states reproduction permission from Shire; this project does not assert independent distribution permission or clinical certification. The report is adapted, not a pixel-identical or licensed original form. Mammoth/PDF.js/JSZip licenses are in public/vendor.

## Import result visibility

Successful imports show a Results ready panel with the observation/infant counts, direct View results/PDF/Excel/CSV actions, and an automatic scroll to the output. Selected results appear before the observation list, with a bounded scrollable evidence panel. The list shows 20 records/page and Previous/Next controls. Failed imports remain explicit and never report a successful output. Assets have a release query to prevent mixed cached script versions, and upload is disabled until document-import scripts initialize.

`node tests/import-batch-browser.cjs` checks a synthetic 65-record batch, pagination, visible output, exports and failed uploads. You can pass private TXT files as command arguments with independently known PREMII_EXPECTED_RECORDS and PREMII_EXPECTED_INFANTS counts; source files and generated artifacts must stay outside this checkout.

`node tests/report-browser.cjs` validates actual physical PDF page counts with pdfinfo and checks English/Traditional Chinese content for short, missing-data, dense and long-text cases.

## Excel export

Export Excel (.xlsx) is available beside the quick export actions and above the observation list. It downloads a genuine Open XML workbook generated entirely in the browser, with one PREMII sheet and exactly 33 clinical columns A–AG. Study identifiers are text (leading zeros preserved), numeric codes/counts/weights are numeric, absent values are blank, and source dates/times remain ISO text. The header is formatted, frozen and filterable. String cells are explicitly typed and cannot become formulas. Internal metadata and evidence do not appear in the workbook.

`node tests/excel-browser.cjs` tests the two buttons and reads back the downloaded workbooks with Python openpyxl, including both interface languages, zeros/blanks, numeric types, Unicode, leading zeros and literal formula-like IDs. Playwright, Chromium and openpyxl must be available in the test environment.
