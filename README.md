# PREMII measurement workspace

English / Traditional Chinese bilingual research prototype based on the supplied English PREMII questionnaire and Chinese data-entry codebook. Records the worst observation per shift, including respiratory support, oxygen, apnea/bradycardia/desaturation, thermoregulation, feeding and weight. Item codes are **not a validated total score**. Translation and scoring need clinical review before clinical use.

## Run

Requires Python 3.12+ to serve locally. Document readers are bundled in public/vendor and run entirely in the browser. To refresh them, use Node.js 24+, `npm ci --ignore-scripts` and `npm run build`. No database, API credentials or runtime external services are required.

```bash
cd /workspace/PREMII-
python3 server.py --host 0.0.0.0 --port 3000
```

Open the server in a suitable browser environment. `curl -fsS http://127.0.0.1:3000/` checks serving. `python3 -m unittest discover -s tests -v` runs the HTTP smoke tests. Port and bind address can be overridden with `--port` / `--host`.

## Languages

Use the English / 繁體中文 selector in the header. English is the default; only the language preference is saved in local storage. Switching languages preserves form values and session records. Exports use stable field names, item codes and shift numbers independent of interface language.

## Data and limits

Records exist in tab memory only; refresh/close clears them. Export JSON (full structured records) or CSV before leaving. No patient data is transmitted or persisted by the server. Use deidentified research identifiers. Uploaded example medical records are deliberately excluded from web assets and Git. There is no authentication, persistent storage or multi-user synchronization; these require a separate production implementation.

Low-flow nasal cannula skips OA; no feeds skips FEED1. Supplemental details do not contribute to any score. First-assessment baseline weight and within-shift weight are separate. CSV values are quoted and protected against common spreadsheet formula prefixes. Overnight shifts may have an end time earlier than start time; date is the start date.

Sources: supplied PREMII English questionnaire, © 2018 Shire Human Genetic Therapies, Inc.; PREMII is a trademark of Shire Human Genetic Therapies, Inc., a Takeda company. The original document states reproduction permission from Shire; this project does not assert independent distribution permission. The supplied data-entry document establishes item codes, not a validated aggregate scoring algorithm.

## Import and PDF reports

Upload your own TXT (UTF-8 or Big5), DOCX or text-based PDF, up to 10 MB (PDF: 200 pages). Files are parsed locally with pinned Mammoth and PDF.js browser libraries. No uploaded medical records are bundled or sent to a service. Scan-only PDFs need external OCR first.

Select the relevant infant/shift passage, click **Use selected passage**, then **Suggest PREMII items**. Conservative rules propose supported explicit item codes and recognizable respiratory support, FiO2, weight, TPN, warming and caffeine statements. These rules are not an AI clinical interpreter: they can miss or misread negation, history, dates and context. Unknown values remain blank. Review the evidence, check proposals to apply, finish missing fields and confirm source verification before saving. Minimum weight is taken only within the chosen excerpt; it does not establish the measurement date or time. Supplemental low-flow source is not inferred.

Export PDF opens the browser print dialog; choose **Save as PDF**, A4, with browser headers/footers disabled. The adapted seven-page report follows the supplied questionnaire sections and four-shift columns. Reports are grouped by infant/date, with additional groups after four saved observations, and use the selected language. This is a recreated report, not a pixel-identical or licensed reproduction of the original file. Source excerpts are not printed. JSON exports include the applied proposals and their evidence for audit; keep exports secure.

`node tests/test-suggestions.cjs` verifies text proposal rules. The document readers' licenses are bundled in public/vendor.

## Free static hosting

Publish the contents of `public/` to a static host such as GitHub Pages. The Python server is for local development only. GitHub Pages can publish a `gh-pages` branch at its root; configure this in repository Settings → Pages. Only app assets belong in that branch, never attachments, source medical records or exported assessments. Static hosting does not add accounts, persistent patient storage or synchronization.
