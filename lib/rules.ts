export const RULE = "pdf-word-2026.1";
export const res = [
  "No oxygen or pulmonary medication",
  "Intermittent oxygen / pulmonary medication",
  "Continuous low-flow nasal cannula (<2 L/min)",
  "Continuous oxygen, not nasal cannula",
  "Pressure support: nCPAP / high-flow ≥2 L/min",
  "Mechanical ventilation",
];
export function oa(n: number) {
  if (!Number.isInteger(n) || n < 21 || n > 100) return null;
  return n === 21
    ? 1
    : n <= 30
      ? 2
      : n <= 40
        ? 3
        : n <= 50
          ? 4
          : n <= 60
            ? 5
            : 6;
}
export function normalize(d: any) {
  d = structuredClone(d);
  for (const k of ["start", "end", "baselineTime"])
    if (d[k] && Number.isFinite(Date.parse(d[k])))
      d[k] = new Date(d[k]).toISOString();
  if (d.RES1 !== 2) {
    d.RES3 = null;
    d.flow = null;
    d.flowUnit = null;
    d.flowL = null;
  } else {
    d.OA = null;
    d.fio2 = null;
    d.flowL =
      d.flow == null
        ? null
        : Number(d.flow) / (d.flowUnit === "cc/min" ? 1000 : 1);
  }
  if (d.RES1 !== 5) d.RES2 = null;
  if (d.THG1 !== 3) d.THG2 = null;
  if (d.feeds !== "yes") {
    d.FEED1 = null;
    d.FEED2 = [];
  }
  if (d.weighed !== "yes") {
    d.measurements = [];
    d.WEIGHT1 = null;
  } else {
    d.WEIGHT1 = d.measurements?.length
      ? Math.round(Math.min(...d.measurements.map((x: any) => Number(x.value))))
      : null;
  }
  d.score = null;
  d.ruleVersion = RULE;
  return d;
}
export function validate(d: any, complete = false) {
  let e: string[] = [];
  if (
    !d.start ||
    !d.end ||
    !Number.isFinite(Date.parse(d.start)) ||
    Date.parse(d.end) <= Date.parse(d.start)
  )
    e.push("Invalid shift interval");
  if (
    d.RES1 === 2 &&
    (d.flow == null ||
      !Number.isFinite(d.flowL) ||
      d.flowL < 0 ||
      d.flowL >= 2 ||
      ![1, 2].includes(d.RES3))
  )
    e.push("Low-flow requires source and flow <2 L/min");
  if (d.RES1 !== 2 && d.fio2 != null) {
    if (!Number.isFinite(d.fio2) || d.fio2 < 21 || d.fio2 > 100)
      e.push("FiO2 must be 21–100%");
    if (oa(Number(d.fio2)) == null && (!d.OA || !d.oaEvidence))
      e.push("Decimal FiO₂ requires evidenced manual category");
    else if (oa(Number(d.fio2)) != null && oa(Number(d.fio2)) !== d.OA)
      e.push("FiO₂ category mismatch");
  }
  for (const k of ["ABD1_1", "ABD1_2", "ABD2_1", "ABD2_2", "ABD3_1", "ABD3_2"])
    if (d[k] != null && (!Number.isInteger(d[k]) || d[k] < 0))
      e.push(k + ": non-negative integer required");
  for (const m of d.measurements || [])
    if (
      !m.time ||
      !Number.isFinite(Date.parse(m.time)) ||
      Date.parse(m.time) < Date.parse(d.start) ||
      Date.parse(m.time) >= Date.parse(d.end) ||
      !(Number(m.value) > 0)
    )
      e.push("Weight must be positive and inside shift");
  if (
    d.baselineWeight != null &&
    (!(d.baselineWeight > 0) ||
      !d.baselineTime ||
      !Number.isFinite(Date.parse(d.baselineTime)) ||
      Date.parse(d.baselineTime) >= Date.parse(d.start))
  )
    e.push("Baseline weight must precede shift");
  if (complete) {
    for (const k of [
      "RES1",
      "THG1",
      "ABD1_1",
      "ABD1_2",
      "ABD2_1",
      "ABD2_2",
      "ABD3_1",
      "ABD3_2",
      "ABD2",
      "ABD3",
    ])
      if (d[k] == null) e.push(k + ": missing");
    if (d.RES1 !== 2 && !d.OA) e.push("OA missing");
    if (!["yes", "no"].includes(d.feeds)) e.push("Feeding unknown");
    if (d.feeds === "yes" && !d.FEED1) e.push("FEED1 missing");
    if (!["yes", "no"].includes(d.weighed)) e.push("Weight assessment missing");
    if (d.weighed === "yes" && !d.measurements?.length)
      e.push("Weight measurements missing");
    if (!["yes", "no"].includes(d.caffeine))
      e.push("Prescription status missing");
    if (d.caffeine === "yes" && !d.drug) e.push("Drug name missing");
  }
  for (const [k, values] of Object.entries({
    RES1: [0, 1, 2, 3, 4, 5],
    RES2: [1, 2, 3],
    RES3: [1, 2],
    OA: [1, 2, 3, 4, 5, 6],
    THG1: [1, 2, 3],
    THG2: [1, 2],
    FEED1: [1, 2, 3, 4, 5, 6],
  }))
    if (d[k] != null && !values.includes(d[k]))
      e.push(k + ": invalid response code");
  if (d.ABD2 != null && (d.ABD2 < 1 || d.ABD2 > 300))
    e.push("Heart rate threshold out of range");
  if (d.ABD3 != null && (d.ABD3 < 1 || d.ABD3 > 100))
    e.push("SpO2 threshold out of range");
  if (d.RES1 === 2 && !["cc/min", "L/min"].includes(d.flowUnit))
    e.push("Flow unit required");
  return e;
}
export function overlaps(a: any, b: any) {
  return (
    Date.parse(a.start) < Date.parse(b.end) &&
    Date.parse(a.end) > Date.parse(b.start)
  );
}
export function extract(text: string) {
  let child = "unassigned",
    noteTime: string | null = null,
    section = "";
  const seen = new Set<string>();
  let offset = 0;
  return text.split("\n").flatMap((line, i) => {
    const lineOffset = offset;
    offset += line.length + 1;
    const id = line.match(/【研究ID[：:]\s*([^】]+)】/);
    if (id) {
      child = id[1];
      noteTime = null;
      section = "";
    }
    const stamp = line.match(
      /(\d{4})[-/](\d{1,2})[-/](\d{1,2})[ T]+(\d{1,2}):(\d{2})/,
    );
    if (stamp) {
      const raw = `${stamp[1]}-${stamp[2].padStart(2, "0")}-${stamp[3].padStart(2, "0")}T${stamp[4].padStart(2, "0")}:${stamp[5]}:00+08:00`;
      noteTime = Number.isFinite(Date.parse(raw))
        ? new Date(raw).toISOString()
        : null;
    }
    if (
      /^(?:\s*)(?:Plan|History|Past history|Weekly summary|Summary|Therapeutic|Diagnostic)[ :：]/i.test(
        line,
      )
    )
      section = line.trim();
    if (
      /^\s*(?:Current|Objective|Vital|Assessment|Progress|Present)[ :：]/i.test(
        line,
      )
    )
      section = "";
    const context =
      /\b(no|not|denied|without|plan|history|previous|weekly|summary)\b|否認|無|計畫/i.test(
        line + " " + section,
      );
    const patterns: [string, RegExp][] = [
      ["RES1", /\bnCPAP\b/i],
      [
        "mechanical",
        /\b(?:endotracheal|tracheostomy|mechanical ventilation)\b/i,
      ],
      [
        "flow",
        /(?:nasal cannula|HFNC|NC)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(L\/min|cc\/min)/i,
      ],
      ["fio2", /FiO[₂2]\s*[:=]?\s*(\d+(?:\.\d+)?)\s*%/i],
      ["weight", /(?:weight|BW)\s*[:=]?\s*(\d{3,4})\s*(?:g|gm)/i],
      ["feeding", /\b(TPN|OG|NG|tube feeding|breast|bottle)\b/i],
    ];
    return patterns.flatMap(([field, re]) => {
      const m = line.match(re);
      if (!m) return [];
      const key = child + field + line.trim();
      if (seen.has(key)) return [];
      seen.add(key);
      const value = field === "RES1" ? 4 : field === "mechanical" ? 5 : m[1];
      const unit =
        field === "flow"
          ? m[2]
          : field === "weight"
            ? "g"
            : field === "fio2"
              ? "%"
              : null;
      const flowL =
        field === "flow"
          ? Number(value) / (unit?.toLowerCase() === "cc/min" ? 1000 : 1)
          : null;
      return [
        {
          child,
          field: field === "mechanical" ? "RES1" : field,
          value,
          unit,
          flowL,
          suggestedLevel: flowL == null ? null : flowL >= 2 ? 4 : null,
          line: i + 1,
          offset: lineOffset + (m.index || 0),
          quote: line,
          noteTime,
          eventTime: null,
          method: "regex-v1",
          status: context ? "insufficient" : "pending",
          contextWarning: context,
        },
      ];
    });
  });
}
export function csv(rows: any[]) {
  const esc = (v: any) => '"' + String(v ?? "").replaceAll('"', '""') + '"';
  return "\uFEFF" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
}
