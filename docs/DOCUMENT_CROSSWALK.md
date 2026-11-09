# Document crosswalk — 2026-11-09

All six uploaded files were available and read. Original clinical TXT files remain outside source and demo.

| PDF question / page                             | Observation field              | Word variable / response codes                                                                                             | Applicability                                            |
| ----------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Greatest respiratory support, p2–3              | RES1                           | 5 mechanical; 4 pressure; 3 continuous O2 not cannula; 2 continuous low-flow cannula; 1 intermittent O2/medication; 0 none | Worst/greatest during shift                              |
| Mechanical device                               | RES2                           | 3 endotracheal; 2 tracheostomy; 1 mask                                                                                     | Word supplement, RES1=5 only                             |
| Low-flow source, p2–3                           | RES3                           | 2 air flow meter; 1 oxygen flow meter                                                                                      | RES1=2 only                                              |
| Greatest low-flow setting, p3                   | flow, flowUnit, flowL          | Word RES3_1 in cc/min                                                                                                      | Retain original; flowL=cc/min÷1000; <2 L/min             |
| Highest oxygen, p4                              | fio2, OA, oaEvidence           | 1=21;2=22–30;3=31–40;4=41–50;5=51–60;6≥61                                                                                  | Skip continuous low-flow; no decimal rounding inferred   |
| Events needing / not needing intervention, p4–5 | ABD1_1/2, ABD2_1/2, ABD3_1/2   | Nonnegative integers                                                                                                       | Zero requires confirmed observation; blank unknown       |
| Bradycardia / desaturation threshold, p4        | ABD2, ABD3                     | beats/min; %                                                                                                               | Retained for each shift                                  |
| Currently prescribed stimulant, p5              | caffeine, drug, administered   | ABD4 yes/no; ABD4_1 name                                                                                                   | Prescription distinct from administered                  |
| Worst thermal support, p5–6                     | THG1                           | 3 heated incubator/radiant;2 open extra heat;1 open no extra heat                                                          | Greatest during shift                                    |
| Thermal device                                  | THG2                           | 2 incubator;1 radiant                                                                                                      | Word supplement when THG1=3                              |
| Any feeds including IV amino acids/lipids, p6   | feeds                          | No direct Word variable                                                                                                    | yes/no/unknown; no skips level                           |
| Worst feeding, p6–7                             | FEED1                          | 6 IV/all tube;5 mixed problematic;4 mixed no problem;3 oral problematic;2 oral >30min;1 all oral ≤30min                    | Only if feeds yes                                        |
| Feeding methods                                 | FEED2, routes                  | 2 breast;1 bottle                                                                                                          | Multi-select supplement; routes free text                |
| Last prior weight, first administration, p7     | baselineWeight, baselineTime   | WEIGHT1/2/3 overloaded in Word                                                                                             | Baseline stored separately from shift weight             |
| Weighed and lowest shift weight, p7             | weighed, measurements, WEIGHT1 | grams + original measurement UTC times                                                                                     | Preserve measurements; min in shift; not weighed skipped |

## Decisions and pending confirmation

- PDF uses **continuous low-flow nasal cannula**. Word incorrectly uses “Ncpap” in low-flow and non-cannula descriptions. PDF wording governs: nCPAP is pressure support regardless of recorded flow. Exactly 2 L/min is high-flow / pressure support. CGMH must approve this interpretation.
- Word contains response codes, not an adequately specified validated total scoring formula. No weighting, aggregation over shifts, weight component or missing-data method supplied. **Total scoring remains disabled.** Codes do not claim to be validated scores.
- PDF is “currently prescribed” caffeine; Word suggests “taking.” Store both prescription and administration, never infer administration from prescription.
- PDF integer oxygen ranges leave decimal gaps. No rounding is invented. Manual category requires evidence; local clinical approval of evidence remains a human responsibility.
- Weight nearest whole gram: app retains entered raw measurements and rounds selected export weight to nearest integer (positive .5 rounds up).
- Time: save ISO UTC, display Asia/Taipei. PNA=floor(elapsed 24-hour periods since birth), birth day=0. PMA=birth GA in days + PNA. Not calendar-day age; CGMH confirmation needed.
- TXT files use `【研究ID：…】`, admission/discharge/medication/order blocks, English/Chinese notes, date/time strings and copied summaries. Dates and note vs event times can be ambiguous; extraction leaves event time unresolved until reviewed. Never count keyword mentions as clinical event counts.
- No external AI integration is active. Real TXT sources are excluded from source, seed, tests, screenshots, public assets and application logs.
