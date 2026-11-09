import { Client } from "pg";
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const base = process.env.POSTGRES_QA_URL;
if (!base)
  throw Error(
    "POSTGRES_QA_URL must point to a disposable local PostgreSQL test instance",
  );
const parsed = new URL(base);
if (!["127.0.0.1", "localhost"].includes(parsed.hostname))
  throw Error(
    "QA creates and drops a test database; only a local test instance is allowed",
  );
const admin = new Client({ connectionString: base });
await admin.connect();
const database = "premii_qa_existing_" + Date.now();
const url = new URL(base);
url.pathname = "/" + database;
let existing;
const checks = [];
try {
  await admin.query(`CREATE DATABASE "${database}"`);
  existing = new Client({ connectionString: url.toString() });
  await existing.connect();
  // This table belongs to another application and deliberately has an incompatible shape.
  await existing.query("CREATE TABLE public.users (marker TEXT PRIMARY KEY)");
  await existing.query(
    "INSERT INTO public.users VALUES ('unrelated-application-data')",
  );
  for (const suite of ["api", "browser", "render"]) {
    const schema = "premii_qa_" + suite;
    await new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          "tests/" +
            (suite === "api"
              ? "api-smoke"
              : suite === "browser"
                ? "browser-smoke"
                : "render-smoke") +
            ".mjs",
        ],
        {
          stdio: "inherit",
          env: {
            ...process.env,
            TEST_DATABASE_URL: url.toString(),
            DATABASE_SCHEMA: schema,
          },
        },
      );
      child.on("exit", (code) =>
        code === 0 ? resolve() : reject(Error(suite + " failed: " + code)),
      );
      child.on("error", reject);
    });
    assert.deepEqual(
      (await existing.query("SELECT * FROM public.users")).rows,
      [{ marker: "unrelated-application-data" }],
    );
    const result = await existing.query(
      `SELECT count(*)::int AS count FROM "${schema}".users`,
    );
    assert.ok(result.rows[0].count > 0);
    checks.push(
      suite +
        " passed against a reused PostgreSQL database with isolated schema; unrelated public.users preserved",
    );
  }
  const report = {
    date: new Date().toISOString(),
    backend: "PostgreSQL",
    status: "passed",
    checks,
    fixtures:
      "One disposable local database with unrelated existing data; deleted after the run. No user databases accessed.",
  };
  writeFileSync(
    "docs/postgres-test-results.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (existing) await existing.end();
  await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
  await admin.end();
}
