import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
const dir = mkdtempSync(tmpdir() + "/premii-render-"),
  port = 3199,
  origin = `http://127.0.0.1:${port}`;
const setupToken = "SyntheticRenderBootstrapToken";
let server,
  logs = "";
const checks = [];
async function start(databasePath) {
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1"],
    {
      env: {
        ...process.env,
        PORT: String(port),
        RENDER: "true",
        NODE_ENV: "production",
        DATABASE_PATH: databasePath,
        SETUP_TOKEN: setupToken,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout.on("data", (x) => (logs += x));
  server.stderr.on("data", (x) => (logs += x));
  for (let i = 0; i < 100; i++) {
    try {
      await fetch(origin + "/api/health");
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw Error("Server did not start");
}
async function stop() {
  if (server && server.exitCode === null && server.signalCode === null) {
    const p = new Promise((r) => server.once("exit", r));
    server.kill("SIGTERM");
    await p;
  }
}
async function api(path, body, cookie = "") {
  return fetch(origin + "/api/" + path, {
    ...(body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json", cookie },
          body: JSON.stringify(body),
        }
      : { headers: { cookie } }),
  });
}
try {
  const path = dir + "/persistent/premii.sqlite";
  await start(path);
  const health = await api("health");
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, "ok");
  checks.push("Health check initializes runtime disk database and returns 200");
  const session = await (await api("session")).json();
  assert.equal(session.setupTokenRequired, true);
  assert.equal(
    (
      await api("setup", {
        name: "Synthetic Render Admin",
        password: "SyntheticPassword123!",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await api("setup", {
        name: "Synthetic Render Admin",
        password: "SyntheticPassword123!",
        setupToken,
      })
    ).status,
    200,
  );
  checks.push("Hosted first-admin setup requires the configured secret");
  const login = await api("login", {
    id: "admin",
    password: "SyntheticPassword123!",
  });
  assert.equal(login.status, 200);
  assert.match(login.headers.get("set-cookie"), /; Secure/i);
  assert.match(login.headers.get("set-cookie"), /; HttpOnly/i);
  const cookie = login.headers.get("set-cookie").split(";")[0];
  checks.push("Render sessions set Secure and HttpOnly cookies");
  const infant = await api(
    "infants",
    {
      code: "RENDER-SYNTHETIC-001",
      birth: "2026-10-01T00:00:00Z",
      admitted: "2026-10-01T01:00:00Z",
      gaWeeks: 28,
      gaDays: 3,
      birthWeight: 1100,
      status: "active",
    },
    cookie,
  );
  assert.equal(infant.status, 200);
  await stop();
  await start(path);
  const persisted = await api("data", null, cookie);
  assert.equal(persisted.status, 200);
  assert.equal(
    (await persisted.json()).infants[0].code,
    "RENDER-SYNTHETIC-001",
  );
  checks.push(
    "Infant, administrator and session survive a full server restart using the same disk",
  );
  await stop();
  writeFileSync(dir + "/blocked-file", "synthetic storage failure fixture");
  await start(dir + "/blocked-file/premii.sqlite");
  const unavailable = await api("health");
  assert.equal(unavailable.status, 503);
  assert.deepEqual(await unavailable.json(), { status: "unavailable" });
  checks.push(
    "Health check returns 503 without database internals when storage is unavailable",
  );
  console.log(JSON.stringify({ status: "passed", checks }, null, 2));
} catch (e) {
  console.error(e);
  console.error(logs);
  process.exitCode = 1;
} finally {
  await stop();
  rmSync(dir, { recursive: true, force: true });
}
