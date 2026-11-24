import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createContext, runInContext } from "node:vm";

const browser = createContext({});
for (const name of ["suggestions", "extraction"]) {
  const script = new URL(`../public/workspace/${name}.js`, import.meta.url);
  runInContext(readFileSync(script, "utf8"), browser);
}

test("Workspace extracts FiO₂ from varied ventilator settings across infants and dates", () => {
  const source = [
    "Infant ID: SYN-01",
    "2024/01/24   19:56",
    "＠ Venti: NIMV 1/22[21% 25 17 5] 1/23[21% 20 14 5] CPAP 1/23-24[21% 5]",
    "2024/01/25   08:00",
    "Respiratory support: NIV [25% 25 15 5]",
    "Infant ID: SYN-02",
    "2023/06/15   09:00",
    "＠ Vent IMV 40% 40 18/5＝＞ 6/15 NIMV 21% 30 16/5",
    "2023/06/15   15:60",
    "Venti: CPAP[21%, 5]",
    "2023/06/16   09:00",
    "SpO2 92%; Plan: NIMV[30% 20 10 5]",
  ].join("\n");
  const rows = browser.extractFileRecords(source, "synthetic.txt");
  const values = Array.from(rows, (row: any) => ({
    infant: row.infant,
    date: row.date,
    oa: row.OA,
    fio2: Array.from(row.fio2Readings, (reading: any) => [
      reading.percent,
      reading.referenceDate,
    ]),
  }));
  assert.deepEqual(values, [
    { infant: "SYN-01", date: "2024-01-24", oa: "1", fio2: [[21, "1/22"], [21, "1/23"], [21, null]] },
    { infant: "SYN-01", date: "2024-01-25", oa: "2", fio2: [[25, null]] },
    { infant: "SYN-02", date: "2023-06-15", oa: "3", fio2: [[40, null], [21, null]] },
    { infant: "SYN-02", date: "2023-06-15", oa: "1", fio2: [[21, null]] },
    { infant: "SYN-02", date: "2023-06-16", oa: null, fio2: [] },
  ]);
});

test("Workspace links explicitly dated settings to blank rows for the same infant", () => {
  const source = [
    "Infant ID: SYN-01",
    "2024/01/21   08:00",
    "SpO2 95%",
    "2024/01/22   08:00",
    "Weight: 1200 g",
    "2024/01/23   08:00",
    "FiO2: 30%",
    "2024/01/24   08:00",
    "Weight: 1220 g",
    "2024/01/25   08:00",
    "Venti: NIMV 1/22[25% 20 14 5] CPAP 1/23-24[21% 5]",
    "Infant ID: SYN-02",
    "2024/01/22   08:00",
    "Weight: 1250 g",
  ].join("\n");
  const rows = browser.extractFileRecords(source, "synthetic.txt");
  const linked = Array.from(rows, (row: any) => ({
    oa: row.OA,
    readings: Array.from(row.fio2Readings, (reading: any) => [
      reading.percent,
      reading.documentedIn ?? null,
    ]),
  }));
  assert.deepEqual(linked, [
    { oa: null, readings: [] },
    { oa: null, readings: [[25, "2024-01-25"]] },
    { oa: "2", readings: [[30, null]] },
    { oa: null, readings: [[21, "2024-01-25"]] },
    { oa: null, readings: [[25, null], [21, null]] },
    { oa: null, readings: [] },
  ]);
});

test("Workspace reads short ventilator settings with a documented percent", () => {
  const rows = browser.extractFileRecords([
    "Infant ID: SYN-03",
    "2024/02/01   08:00",
    "Vent: IMV 25%",
    "2024/02/02   08:00",
    "Venti: NIMV 2/1 FiO2 30% → CPAP 2/2 21%",
    "2024/02/03   08:00",
    "Vent: NIMV; SpO2 95%",
  ].join("\n"), "synthetic.txt");
  assert.deepEqual(Array.from(rows, (record: any) =>
    Array.from(record.fio2Readings, (reading: any) => [reading.percent, reading.referenceDate])
  ), [
    [[25, null]],
    [[30, "2/1"], [21, null]],
    [],
  ]);
});
