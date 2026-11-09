# Export dictionary

UTF-8 BOM, CRLF, RFC4180 quoted fields; long format, one variable per shift per row. Study identifiers are pseudonyms.

Columns: study_id, shift_start_utc, shift_end_utc, status, form_version, rule_version, variable, value, unit, missing_state.

- `RES1`: 0–5 response code (see crosswalk); `RES2`: mechanical device supplement; `RES3`: low-flow gas source; `flow`: original numeric; `flowUnit`: L/min or cc/min; `flowL`: normalized L/min.
- `OA`: 1–6 oxygen category; `fio2`: highest observed percent; `oaEvidence`: manual categorization evidence is retained in form/audit.
- `ABD1_1`, `ABD1_2`: apnea with/without intervention; `ABD2_1/2`: bradycardia; `ABD3_1/2`: desaturation. Null unknown; zero is explicit zero.
- `ABD2`: HR event threshold, beats/min; `ABD3`: saturation event threshold, percent.
- `caffeine`: prescription yes/no/unknown; `drug`: name; `administered`: yes/no/unknown independently.
- `THG1`: thermal response 1–3; `THG2`: supplementary device.
- `feeds`: yes/no/unknown; `FEED1`: worst feeding level 1–6; `FEED2`: JSON array, 2 breast / 1 bottle; `routes`: extra route description.
- `weighed`: yes/no/unknown; `WEIGHT1`: minimum recorded shift weight, g; `measurements`: JSON array of original value and UTC measurement time; `baselineWeight`, `baselineTime`: last prior measurement.
- `score`: null until a complete validated formula is approved.
- `missing_state`: value / unknown / not_recorded / not_measured / skipped. Conditional skip overrides entered values.
- `form_version`: increments with every persisted operation; `rule_version`: pdf-word-2026.1. Audit retains before/after inputs and author/time, including data removed from current branch.

Shift intervals are [start,end), so adjacent shifts are permitted and overlapping shifts for the same infant rejected. Date-range export includes only shifts fully contained in the chosen interval.
