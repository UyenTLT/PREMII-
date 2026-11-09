import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
const dir = mkdtempSync(tmpdir() + "/premii-");
const port = 3197;
let output = "";
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "-p",
    String(port),
    "--hostname",
    "127.0.0.1",
  ],
  {
    env: { ...process.env, DATABASE_PATH: dir + "/test.sqlite" },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
server.stdout.on("data", (x) => (output += x));
server.stderr.on("data", (x) => (output += x));
let cookie = "";
let checks = 0;
async function api(path, b, expected = 200, c = cookie) {
  const r = await fetch("http://127.0.0.1:" + port + "/api/" + path, {
    method: b ? "POST" : "GET",
    headers: {
      ...(b ? { "Content-Type": "application/json" } : {}),
      cookie: c,
    },
    body: b ? JSON.stringify(b) : undefined,
  });
  const text = await r.text();
  assert.equal(r.status, expected, path + ": " + text);
  checks++;
  return {
    data: r.headers.get("content-type")?.includes("application/json")
      ? JSON.parse(text)
      : text,
    cookie: r.headers.get("set-cookie")?.split(";")[0],
  };
}
try {
  let connected = false;
  for (let i = 0; i < 150; i++) {
    try {
      await fetch("http://127.0.0.1:" + port + "/api/session");
      connected = true;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  if (!connected) throw Error(output);
  await api("data", null, 401);
  await api("setup", {
    name: "Synthetic Admin",
    password: "SyntheticPassword123!",
  });
  cookie = (
    await api("login", { id: "admin", password: "SyntheticPassword123!" })
  ).cookie;
  await api("users", {
    id: "entry",
    name: "Entry",
    role: "entry",
    password: "SyntheticPassword123!",
  });
  await api("users", {
    id: "reviewer",
    name: "Reviewer",
    role: "reviewer",
    password: "SyntheticPassword123!",
  });
  const admin = cookie;
  const entry = (
    await api("login", { id: "entry", password: "SyntheticPassword123!" })
  ).cookie;
  const reviewer = (
    await api("login", { id: "reviewer", password: "SyntheticPassword123!" })
  ).cookie;
  const infant = (
    await api(
      "infants",
      {
        code: "測試-001",
        birth: "2026-10-01T00:00:00Z",
        admitted: "2026-10-01T01:00:00Z",
        gaWeeks: 28,
        gaDays: 3,
        birthWeight: 1100,
        status: "active",
      },
      200,
      entry,
    )
  ).data;
  const base = {
    infantId: infant.id,
    start: "2026-11-01T15:00:00.000Z",
    end: "2026-11-01T23:00:00.000Z",
    RES1: 4,
    fio2: 30,
    OA: 2,
    THG1: 3,
    THG2: 2,
    feeds: "no",
    weighed: "no",
    caffeine: "no",
    ABD1_1: 0,
    ABD1_2: 0,
    ABD2: 80,
    ABD2_1: 0,
    ABD2_2: 0,
    ABD3: 85,
    ABD3_1: 0,
    ABD3_2: 0,
    baselineWeight: 1200,
    baselineTime: "2026-11-01T14:00:00Z",
  };
  let s = (await api("shifts", { ...base, action: "draft" }, 200, entry)).data;
  assert.equal(s.score, null);
  await api("shifts", { ...base, action: "draft" }, 400, entry);
  await api("shifts", { ...s, action: "confirm" }, 400, entry);
  await api(
    "users",
    {
      id: "hacker",
      name: "x",
      role: "admin",
      password: "SyntheticPassword123!",
    },
    400,
    entry,
  );
  await api("shifts", { ...s, action: "draft" }, 400, reviewer);
  s = (await api("shifts", { ...s, action: "submit" }, 200, entry)).data;
  await api(
    "shifts",
    { ...s, version: s.version - 1, action: "draft" },
    409,
    entry,
  );
  s = (await api("shifts", { ...s, action: "changes" }, 200, reviewer)).data;
  assert.equal(s.status, "changes");
  s = (await api("shifts", { ...s, action: "submit" }, 200, entry)).data;
  s = (await api("shifts", { ...s, action: "confirm" }, 200, reviewer)).data;
  assert.equal(s.reviewedBy, "reviewer");
  await api("shifts", { ...s, action: "draft" }, 400, entry);
  s = (await api("shifts", { ...s, action: "revise" }, 200, entry)).data;
  assert.equal(s.status, "draft");
  s = (await api("shifts", { ...s, action: "submit" }, 200, entry)).data;
  s = (await api("shifts", { ...s, action: "confirm" }, 200, reviewer)).data;
  const text =
    "【研究ID：SYN-001】\nNo nCPAP planned\n2026-11-01 23:30 FiO2 30%\nBW 1230 g";
  const imp = (
    await api("imports", { name: "synthetic.txt", text }, 200, entry)
  ).data;
  await api("imports", { name: "duplicate.txt", text }, 400, entry);
  assert.equal(imp.suggestions[0].status, "insufficient");
  await api(
    "evidence",
    {
      importId: imp.id,
      expectedVersion: 1,
      index: 1,
      status: "accepted",
      infantId: infant.id,
      shiftId: s.id,
      eventTime: "2026-11-01T15:30:00Z",
    },
    200,
    reviewer,
  );
  const csv = (await api("export?status=confirmed")).data;
  assert.ok(csv.includes("測試-001"));
  assert.ok(csv.includes("pdf-word-2026.1"));
  assert.ok(csv.includes('"skipped"'));
  const d = (await api("data")).data;
  assert.equal(d.shifts.length, 1);
  assert.ok(
    d.audit.some((a) => JSON.parse(a.afterData)?.status === "confirmed"),
  );
  assert.ok(d.audit.some((a) => JSON.parse(a.afterData)?.status === "draft"));
  await api("logout", {}, 200, entry);
  await api("data", null, 401, entry);
  console.log(
    "PASS " +
      checks +
      " API assertions plus persisted-record, CSV and audit checks",
  );
} catch (e) {
  console.error(e);
  console.error(output);
  process.exitCode = 1;
} finally {
  server.kill("SIGTERM");
  await new Promise((r) => server.once("exit", r));
  rmSync(dir, { recursive: true, force: true });
}
