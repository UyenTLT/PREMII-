import { Client } from "pg";
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const base = process.env.POSTGRES_QA_URL;
if (!base)
  throw Error(
    "POSTGRES_QA_URL must point to a disposable local PostgreSQL test instance",
  );
const parsed = new URL(base);
if (!["127.0.0.1", "localhost"].includes(parsed.hostname))
  throw Error(
    "QA creates and drops test databases; only a local test instance is allowed",
  );
const admin = new Client({ connectionString: base });
await admin.connect();
const checks = [];
try {
  for (const suite of ["api", "browser", "render"]) {
    const database = "premii_qa_" + suite + "_" + Date.now();
    await admin.query(`CREATE DATABASE "${database}"`);
    const url = new URL(base);
    url.pathname = "/" + database;
    try {
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
            env: { ...process.env, TEST_DATABASE_URL: url.toString() },
          },
        );
        child.on("exit", (code) =>
          code === 0 ? resolve() : reject(Error(suite + " failed: " + code)),
        );
        child.on("error", reject);
      });
      checks.push(suite + " passed against PostgreSQL");
    } finally {
      await admin.query(`DROP DATABASE "${database}" WITH (FORCE)`);
    }
  }
  const report = {
    date: new Date().toISOString(),
    backend: "PostgreSQL",
    status: "passed",
    checks,
    fixtures:
      "Synthetic data in disposable local databases; all test databases removed.",
  };
  writeFileSync(
    "docs/postgres-test-results.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await admin.end();
}
