import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const dir = mkdtempSync(tmpdir() + "/premii-browser-");
const port = 3198,
  url = `http://127.0.0.1:${port}`;
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
    env: {
      ...process.env,
      DATABASE_URL: process.env.TEST_DATABASE_URL || "",
      DATABASE_PATH: dir + "/browser.sqlite",
      SETUP_TOKEN: "SyntheticSetupTokenForBrowserTests",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let logs = "",
  browser;
const errors = [],
  checks = [];
server.stdout.on("data", (x) => (logs += x));
server.stderr.on("data", (x) => (logs += x));
const screenshotDir = "docs/screenshots";
mkdirSync(screenshotDir, { recursive: true });
try {
  let ready = false;
  for (let i = 0; i < 150; i++) {
    try {
      await fetch(url + "/api/session");
      ready = true;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  assert.ok(ready, logs);
  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    timezoneId: "Asia/Taipei",
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.setDefaultTimeout(12000);
  const click = async (name) =>
    page.getByRole("button", { name, exact: true }).click();
  const data = async () =>
    await (await page.request.get(url + "/api/data")).json();
  async function waitRecord(fn) {
    for (let i = 0; i < 60; i++) {
      const d = await data();
      if (fn(d)) return d;
      await page.waitForTimeout(100);
    }
    throw Error(
      "Record did not reach expected state: " +
        (await page.locator(".error").allTextContents()),
    );
  }
  await page.goto(url);
  await page.locator(".language").click();
  await page.getByPlaceholder("Name").fill("Synthetic QA");
  await page
    .getByPlaceholder("Password", { exact: true })
    .fill("SyntheticBrowserTest123!");
  await page
    .getByPlaceholder("Setup token", { exact: true })
    .fill("SyntheticSetupTokenForBrowserTests");
  await click("Create and sign in");
  await page.locator(".shell").waitFor();
  checks.push("First-admin setup and login");
  await page.getByRole("button", { name: /Study settings/ }).click();
  await page.getByRole("button", { name: /Seed synthetic data/ }).click();
  await waitRecord((d) => d.infants.length === 8);
  checks.push("Synthetic demo seed through UI");
  await click("＋ Add infant");
  let modal = page.locator(".modal");
  await modal.getByLabel("Study ID", { exact: true }).fill("DEMO-UI-001");
  await modal.getByLabel("Birth", { exact: true }).fill("2026-10-01T08:00");
  await modal
    .getByLabel("Admission time", { exact: true })
    .fill("2026-10-01T09:00");
  await modal.getByLabel("Gestational age (weeks)", { exact: true }).fill("28");
  await modal.getByLabel("Gestational age (days)", { exact: true }).fill("3");
  await modal.getByLabel("Birth weight (g)", { exact: true }).fill("1100");
  await modal.getByRole("button", { name: "Save draft", exact: true }).click();
  let d = await waitRecord((d) =>
    d.infants.some((i) => i.code === "DEMO-UI-001"),
  );
  const infant = d.infants.find((i) => i.code === "DEMO-UI-001");
  await modal.waitFor({ state: "hidden" });
  checks.push("Create infant through UI");
  await click("＋ New assessment");
  modal = page.locator(".modal.wide");
  await modal.getByLabel("Study ID", { exact: true }).selectOption(infant.id);
  await modal
    .getByLabel("Start time", { exact: true })
    .fill("2026-11-05T23:00");
  await modal.getByLabel("End time", { exact: true }).fill("2026-11-06T07:00");
  await modal
    .getByLabel("RES1 · Respiratory support", { exact: true })
    .selectOption("4");
  await modal.getByLabel("FiO₂ (%)", { exact: true }).fill("30");
  await modal.getByLabel("Bradycardia threshold", { exact: true }).fill("80");
  await modal.getByLabel("Desaturation threshold", { exact: true }).fill("85");
  for (const [key, label] of [
    ["ABD1_1", "Apnea with intervention"],
    ["ABD1_2", "Apnea without intervention"],
    ["ABD2_1", "Bradycardia with intervention"],
    ["ABD2_2", "Bradycardia without intervention"],
    ["ABD3_1", "Desaturation with intervention"],
    ["ABD3_2", "Desaturation without intervention"],
  ])
    await modal.getByLabel(key + " · " + label, { exact: true }).fill("0");
  await modal
    .getByLabel("Caffeine / stimulant prescribed", { exact: true })
    .selectOption("no");
  await modal
    .getByLabel("Medication administered", { exact: true })
    .selectOption("no");
  await modal.getByLabel("THG1", { exact: true }).selectOption("3");
  await modal.getByLabel("THG2 · Device", { exact: true }).selectOption("2");
  await modal
    .getByLabel("Any feeds, including amino acid / lipid IV nutrition?", {
      exact: true,
    })
    .selectOption("no");
  await modal
    .getByLabel("First assessment: prior weight", { exact: true })
    .fill("1200");
  await modal
    .getByLabel("Prior measurement time", { exact: true })
    .fill("2026-11-05T22:00");
  await modal
    .getByLabel("Weighed during shift?", { exact: true })
    .selectOption("yes");
  await modal
    .getByRole("button", { name: "＋ Add measurement", exact: true })
    .click();
  await modal
    .getByLabel("Weight measurement time", { exact: true })
    .fill("2026-11-06T01:00");
  await modal.getByLabel("Weight (g)", { exact: true }).fill("1250");
  await modal
    .getByRole("button", { name: "＋ Add measurement", exact: true })
    .click();
  await modal
    .getByLabel("Weight measurement time", { exact: true })
    .nth(1)
    .fill("2026-11-06T04:00");
  await modal.getByLabel("Weight (g)", { exact: true }).nth(1).fill("1230");
  await modal.getByRole("button", { name: "Save draft", exact: true }).click();
  d = await waitRecord((d) => d.shifts.some((s) => s.infantId === infant.id));
  let shift = d.shifts.find((s) => s.infantId === infant.id);
  assert.equal(shift.WEIGHT1, 1230);
  assert.equal(shift.status, "draft");
  checks.push(
    "Overnight shift, draft save, explicit zero events, multiple weights and minimum selection",
  );
  await modal
    .getByLabel("RES1 · Respiratory support", { exact: true })
    .selectOption("2");
  await modal.getByLabel("Gas source", { exact: true }).selectOption("1");
  await modal.getByLabel("Maximum flow", { exact: true }).fill("1000");
  await modal.getByLabel("Unit", { exact: true }).selectOption("cc/min");
  assert.equal(await modal.getByLabel("FiO₂ (%)", { exact: true }).count(), 0);
  await modal.getByRole("button", { name: "Save draft", exact: true }).click();
  d = await waitRecord(
    (d) => d.shifts.find((s) => s.id === shift.id)?.RES1 === 2,
  );
  shift = d.shifts.find((s) => s.id === shift.id);
  assert.equal(shift.OA, null);
  assert.equal(shift.flowL, 1);
  checks.push("Low-flow branch hides OA and clears it in backend");
  await modal.screenshot({ path: screenshotDir + "/assessment.png" });
  await modal.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: /Source review/ }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "synthetic-ui.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(
      "【研究ID：DEMO-UI-001】\n2026-11-06 01:00 FiO2 30%\nNo nCPAP planned\n2026-11-06 04:00 BW 1230 g",
    ),
  });
  await click("Confirm import");
  d = await waitRecord((d) => d.imports.length === 1);
  const imported = d.imports[0];
  assert.equal(
    imported.suggestions.find((s) => s.field === "RES1").status,
    "insufficient",
  );
  let suggestion = page
    .locator(".suggestion")
    .filter({ has: page.locator("b", { hasText: "Weight →" }) });
  await suggestion
    .getByLabel("Infant", { exact: true })
    .selectOption(infant.id);
  await suggestion
    .getByLabel("Assessment", { exact: true })
    .selectOption(shift.id);
  await suggestion
    .getByLabel("Event time", { exact: true })
    .fill("2026-11-06T04:00");
  await suggestion.getByRole("button", { name: "Accept", exact: true }).click();
  d = await waitRecord((d) =>
    d.imports[0].suggestions.some(
      (s) => s.field === "weight" && s.status === "accepted",
    ),
  );
  checks.push(
    "TXT upload preview, source review, negation warning and evidence assignment",
  );
  await page.screenshot({
    path: screenshotDir + "/evidence.png",
    fullPage: true,
  });
  await click("＋ New assessment");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: /PREMII assessments/ }).click();
  await page.getByPlaceholder("Search study ID…").fill("DEMO-UI-001");
  await page
    .getByRole("button", { name: "Open assessment ↗", exact: true })
    .click();
  modal = page.locator(".modal.wide");
  assert.ok(
    (await modal.getByText("Linked evidence", { exact: false }).count()) > 0,
  );
  await modal
    .getByRole("button", { name: "Submit for review", exact: true })
    .click();
  await waitRecord(
    (d) => d.shifts.find((s) => s.id === shift.id)?.status === "pending",
  );
  await modal
    .getByRole("button", { name: "Confirm assessment", exact: true })
    .click();
  await waitRecord(
    (d) => d.shifts.find((s) => s.id === shift.id)?.status === "confirmed",
  );
  checks.push("Submit and confirm assessment through UI with linked source");
  await modal.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: /Trends/, exact: false }).click();
  await page.locator(".toolbar select").first().selectOption(infant.id);
  assert.ok((await page.locator(".chart .bar").count()) > 0);
  await page.locator(".chart .bar").first().click();
  await page.locator(".modal.wide").waitFor();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  checks.push("Infant-specific trends and point-to-form navigation");
  await page.getByRole("button", { name: /Data export/ }).click();
  await page.locator(".toolbar select").first().selectOption(infant.id);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Download CSV ↓", exact: true }).click(),
  ]);
  const stream = await download.createReadStream();
  let chunks = [];
  for await (const c of stream) chunks.push(c);
  const csv = Buffer.concat(chunks).toString("utf8");
  assert.ok(csv.includes("DEMO-UI-001"));
  assert.ok(csv.includes("pdf-word-2026.1"));
  assert.ok(csv.includes('"skipped"'));
  checks.push(
    "Browser CSV download includes study, rule version and conditional missingness",
  );
  await page.getByRole("button", { name: /Overview/ }).click();
  await page.screenshot({
    path: screenshotDir + "/dashboard.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1024, height: 768 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: screenshotDir + "/tablet.png",
    fullPage: true,
  });
  checks.push(
    "Desktop and tablet screenshots; no tablet horizontal document overflow",
  );
  assert.deepEqual(errors, []);
  checks.push("No uncaught browser JavaScript errors");
  const report = {
    date: new Date().toISOString(),
    browser: "Chromium",
    checks,
    status: "passed",
    consoleErrors: errors,
    record:
      "Synthetic data only; isolated temporary database removed after run.",
  };
  writeFileSync(
    "docs/browser-test-results.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} catch (e) {
  console.error(e);
  console.error(logs);
  if (browser) {
    try {
      await browser
        .contexts()[0]
        ?.pages()[0]
        ?.screenshot({ path: dir + "/failure.png", fullPage: true });
      console.error("Failure screenshot:", dir + "/failure.png");
    } catch {}
  }
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
  await new Promise((r) => server.once("exit", r));
  if (!process.exitCode) rmSync(dir, { recursive: true, force: true });
}
