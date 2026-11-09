import { test } from "node:test";
import assert from "node:assert/strict";
import { oa, normalize, validate, overlaps, extract, csv } from "../lib/rules";
const base = {
  start: "2026-11-01T15:00:00Z",
  end: "2026-11-01T23:00:00Z",
  RES1: 4,
  fio2: 30,
  OA: 2,
};
test("Taipei midnight-crossing interval and overlap boundaries", () => {
  assert.deepEqual(validate(base), []);
  assert.equal(
    overlaps(base, {
      start: "2026-11-01T23:00:00Z",
      end: "2026-11-02T01:00:00Z",
    }),
    false,
  );
  assert.equal(
    overlaps(base, {
      start: "2026-11-01T22:59:00Z",
      end: "2026-11-02T01:00:00Z",
    }),
    true,
  );
  assert.ok(validate({ ...base, end: base.start }).length);
});
test("nCPAP is pressure support; 2 L/min cannot be low-flow", () => {
  assert.equal(extract("nCPAP in use")[0].value, 4);
  assert.ok(
    validate(
      normalize({ ...base, RES1: 2, RES3: 1, flow: 2000, flowUnit: "cc/min" }),
    ).length,
  );
  assert.deepEqual(
    validate(
      normalize({ ...base, RES1: 2, RES3: 1, flow: 1999, flowUnit: "cc/min" }),
    ),
    [],
  );
});
test("branch switch clears OA and clears invalid low-flow variables", () => {
  const d = normalize({
    ...base,
    RES1: 2,
    RES3: 2,
    flow: 1000,
    flowUnit: "cc/min",
  });
  assert.equal(d.OA, null);
  assert.equal(d.fio2, null);
  assert.equal(d.flowL, 1);
  assert.equal(normalize({ ...d, RES1: 4 }).flow, null);
});
test("all oxygen boundaries and decimal gaps", () => {
  for (const [v, c] of [
    [21, 1],
    [22, 2],
    [30, 2],
    [31, 3],
    [40, 3],
    [41, 4],
    [50, 4],
    [51, 5],
    [60, 5],
    [61, 6],
    [100, 6],
  ])
    assert.equal(oa(v), c);
  for (const v of [20, 101, 30.5, 60.5]) assert.equal(oa(v), null);
  assert.ok(validate({ ...base, fio2: 30.5, OA: 3 }).length);
  assert.deepEqual(
    validate({
      ...base,
      fio2: 30.5,
      OA: 3,
      oaEvidence: "CGMH reviewed category",
    }),
    [],
  );
});
test("no feeds skipped, unknown distinct", () => {
  assert.equal(normalize({ ...base, feeds: "no", FEED1: 6 }).FEED1, null);
  assert.ok(
    validate(normalize({ ...base, feeds: "unknown" }), true).includes(
      "Feeding unknown",
    ),
  );
});
test("not weighed and multiple measurements", () => {
  assert.equal(
    normalize({ ...base, weighed: "no", measurements: [{ value: 1200 }] })
      .WEIGHT1,
    null,
  );
  assert.equal(
    normalize({
      ...base,
      weighed: "yes",
      measurements: [{ value: 1200 }, { value: 1180 }],
    }).WEIGHT1,
    1180,
  );
  assert.ok(
    validate({
      ...base,
      measurements: [{ value: 1000, time: "2026-11-01T10:00:00Z" }],
    }).length,
  );
});
test("event zero distinct from missing and count must be integer", () => {
  assert.equal(normalize({ ...base, ABD1_1: 0 }).ABD1_1, 0);
  assert.equal(normalize(base).ABD1_1, undefined);
  assert.ok(validate({ ...base, ABD1_1: -1 }).length);
  assert.ok(validate({ ...base, ABD1_1: 0.5 }).length);
});
test("negation/plan/history never auto-accepted, duplicated text not event count", () => {
  const s = extract("No nCPAP planned\nnCPAP in use\nnCPAP in use");
  assert.equal(s.length, 2);
  assert.equal(s[0].status, "insufficient");
  assert.equal(s[1].status, "pending");
  assert.ok(!s.some((x) => x.field.startsWith("ABD")));
});
test("multi-infant split and exact evidence position", () => {
  const s = extract("【研究ID：A】\nFiO2 30%\n【研究ID：B】\nBW 1200 g");
  assert.equal(s[0].child, "A");
  assert.equal(s[1].child, "B");
  assert.equal(s[0].line, 2);
});
test("UTF8 Chinese CSV and quotation", () => {
  const s = csv([["研究", 'a,"b']]);
  assert.ok(s.startsWith("\uFEFF"));
  assert.ok(s.includes("研究"));
  assert.ok(s.includes('"a,""b"'));
});
test("no unsupported total score", () =>
  assert.equal(normalize({ ...base, score: 123 }).score, null));
test("invalid oxygen cannot be legalized by manual category evidence", () =>
  assert.ok(
    validate({ ...base, fio2: 101, OA: 6, oaEvidence: "manual" }).length,
  ));
test("invalid measurement timestamps and flow NaN rejected", () => {
  assert.ok(
    validate({ ...base, measurements: [{ time: "bad", value: 1200 }] }).length,
  );
  assert.ok(
    validate(
      normalize({
        ...base,
        RES1: 2,
        RES3: 1,
        flow: "invalid",
        flowUnit: "L/min",
      }),
    ).length,
  );
});
test("overlap compares absolute instants across timezone offsets", () =>
  assert.equal(
    overlaps(
      { start: "2026-11-01T23:00:00+08:00", end: "2026-11-02T07:00:00+08:00" },
      { start: "2026-11-01T16:00:00Z", end: "2026-11-01T17:00:00Z" },
    ),
    true,
  ));
