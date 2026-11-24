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
    "Ventilation: 6/15 intubated IMV[40%, 50, 15/6] → NIMV[21% 25 15 5]",
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
    { infant: "SYN-02", date: "2023-06-16", oa: null, fio2: [] },
  ]);
});
