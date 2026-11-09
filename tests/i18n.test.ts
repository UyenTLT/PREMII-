import test from "node:test";
import assert from "node:assert/strict";
import {
  strings,
  options,
  translate,
  localizeError,
  formatDateTime,
} from "../lib/i18n";

test("English and Traditional Chinese catalogs cover the same interface and response choices", () => {
  assert.deepEqual(
    Object.keys(strings.en).sort(),
    Object.keys(strings.zh).sort(),
  );
  for (const [key, value] of Object.entries(strings.en)) {
    assert.ok(value.trim(), key);
    assert.doesNotMatch(value, /\p{Script=Han}/u, key);
    assert.ok(strings.zh[key as keyof typeof strings.zh].trim(), key);
  }
  for (const key of ["res", "thermal", "feed"] as const) {
    assert.equal(options.en[key].length, options.zh[key].length);
    options.en[key].forEach((value) =>
      assert.doesNotMatch(value, /\p{Script=Han}/u),
    );
  }
});

test("validation and API errors switch language without changing canonical codes", () => {
  assert.equal(
    localizeError("Invalid credentials", "zh"),
    "帳號或密碼不正確。",
  );
  assert.match(
    localizeError("CONFLICT: record changed; reload before saving", "zh"),
    /變更/,
  );
  assert.match(
    localizeError("Database unavailable; please retry", "zh"),
    /資料庫/,
  );
  const errors =
    "RES1: missing; ABD1_1: non-negative integer required; THG1: invalid response code; Feeding unknown";
  const zh = localizeError(errors, "zh");
  assert.match(zh, /RES1：請填寫資料/);
  assert.match(zh, /ABD1_1：請輸入零或正整數/);
  assert.doesNotMatch(zh, /missing|non-negative|invalid|unknown/);
  assert.match(localizeError(errors, "en"), /RES1: a value is required/);
  assert.equal(
    localizeError("unrecognized server detail", "zh"),
    translate("zh", "errorGeneric"),
  );
});

test("locale changes date presentation and keeps Taipei time and midnight boundaries", () => {
  const instant = "2026-11-08T16:05:00Z";
  assert.equal(formatDateTime(instant, "en"), "09/11/2026, 00:05:00");
  assert.equal(
    formatDateTime(instant, "zh").replace(/\s+/g, " "),
    "2026/11/09 00:05:00",
  );
  assert.equal(formatDateTime(null, "en"), "—");
  assert.equal(formatDateTime("invalid", "zh"), "—");
});
