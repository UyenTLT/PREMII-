import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { strings, options } from "../lib/i18n.ts";
const dir = mkdtempSync(tmpdir() + "/premii-i18n-");
const url = "http://127.0.0.1:3196";
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "-p",
    "3196",
    "--hostname",
    "127.0.0.1",
  ],
  {
    env: {
      ...process.env,
      DATABASE_URL: process.env.TEST_DATABASE_URL || "",
      DATABASE_PATH: dir + "/i18n.sqlite",
      SETUP_TOKEN: "SyntheticLanguageTestToken",
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
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    timezoneId: "Asia/Taipei",
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.setDefaultTimeout(12000);
  const tr = (lang, key) => strings[lang][key];
  const button = (name, root = page) =>
    root.getByRole("button", { name, exact: true });
  const switchTo = async (lang, root = page) => {
    await root.locator(".language").click();
    await page.waitForFunction(
      (expected) => document.documentElement.lang === expected,
      lang === "en" ? "en" : "zh-Hant",
    );
  };
  // Check visible interface text and accessible attributes, excluding unchanged source records.
  async function checkMode(lang, title) {
    const parts = await page.evaluate(() => {
      const texts = [],
        walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n; (n = walk.nextNode());) {
        const el = n.parentElement;
        if (
          el?.closest("script, style, .language, .user-content") ||
          !el?.getClientRects().length
        )
          continue;
        texts.push(n.textContent.trim());
      }
      for (const el of document.querySelectorAll(
        "[placeholder], [aria-label], [title]",
      )) {
        if (
          !el.getClientRects().length ||
          el.closest(".language, .user-content")
        )
          continue;
        for (const attr of ["placeholder", "aria-label", "title"])
          if (el.hasAttribute(attr)) texts.push(el.getAttribute(attr));
      }
      return texts.filter(Boolean);
    });
    if (lang === "en")
      assert.deepEqual(
        parts.filter((x) => /\p{Script=Han}/u.test(x)),
        [],
        title,
      );
    else {
      const english = new Set(
        [
          ...Object.values(strings.en),
          ...Object.values(options.en).flat(),
        ].filter(
          (x) =>
            x.length >= 4 &&
            /[A-Za-z]/.test(x) &&
            x !== strings.en.setupTokenHelp,
        ),
      );
      assert.deepEqual(
        parts.filter((x) => english.has(x)),
        [],
        title,
      );
    }
    checks.push(title);
  }
  await page.goto(url);
  await button(tr("zh", "createAndSignIn")).waitFor();
  await checkMode("zh", "Traditional Chinese setup screen");
  await page
    .getByPlaceholder(tr("zh", "name"), { exact: true })
    .fill("Synthetic Language QA");
  await switchTo("en");
  assert.equal(
    await page.getByPlaceholder("Name", { exact: true }).inputValue(),
    "Synthetic Language QA",
  );
  await checkMode(
    "en",
    "English setup screen; typed form state preserved on switch",
  );
  await page.reload();
  await button(tr("en", "createAndSignIn")).waitFor();
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  checks.push("Language preference survives reload before login");
  await page
    .getByPlaceholder("Name", { exact: true })
    .fill("Synthetic Language QA");
  await page
    .getByPlaceholder("Password", { exact: true })
    .fill("SyntheticLanguageQA123!");
  await page
    .getByPlaceholder("Setup token", { exact: true })
    .fill("SyntheticLanguageTestToken");
  await button(tr("en", "createAndSignIn")).click();
  await page.locator(".shell").waitFor();
  await page
    .locator(".asidebottom")
    .getByRole("button", { name: /Study settings/ })
    .click();
  await button(tr("en", "seed")).click();
  await page.getByRole("status").waitFor();
  for (const lang of ["en", "zh"]) {
    if (lang === "zh") await switchTo("zh");
    for (const key of [
      "dashboard",
      "infants",
      "shifts",
      "evidence",
      "trends",
      "exports",
    ]) {
      const nav = page.locator("nav button").filter({ hasText: tr(lang, key) });
      await nav.click();
      await checkMode(lang, lang + " " + key + " page");
    }
    await page
      .locator(".asidebottom button")
      .filter({ hasText: tr(lang, "settings") })
      .click();
    // Include raw audit entries in the DOM; record text is explicitly excluded by the scanner.
    for (const details of await page.locator("details").all())
      await details.evaluate((el) => (el.open = true));
    await checkMode(lang, lang + " settings, roles, rules and audit labels");
    await button("＋ " + tr(lang, "newInfant")).click();
    const infant = page.locator(".modal");
    await infant
      .getByLabel(tr(lang, "study"), { exact: true })
      .fill("SYNTHETIC-UNSAVED");
    await checkMode(lang, lang + " infant form");
    await switchTo(lang === "en" ? "zh" : "en", infant);
    assert.equal(
      await infant
        .getByLabel(tr(lang === "en" ? "zh" : "en", "study"), { exact: true })
        .inputValue(),
      "SYNTHETIC-UNSAVED",
    );
    await switchTo(lang, infant);
    await button(tr(lang, "close"), infant).click();
    await button("＋ " + tr(lang, "newShift")).click();
    const modal = page.locator(".modal.wide");
    await button(tr(lang, "validate"), modal).click();
    await checkMode(
      lang,
      lang + " assessment form, missing states and validation errors",
    );
    for (const res of ["5", "2", "4"]) {
      await modal
        .getByLabel("RES1 · " + tr(lang, "resp"), { exact: true })
        .selectOption(res);
      await checkMode(lang, lang + " respiratory branch " + res);
    }
    await modal.getByLabel("FiO₂ (%)", { exact: true }).fill("21.5");
    await modal.getByLabel("THG1", { exact: true }).selectOption("3");
    await modal
      .getByLabel(tr(lang, "prescribed"), { exact: true })
      .selectOption("yes");
    await modal
      .getByLabel(tr(lang, "anyFeeds"), { exact: true })
      .selectOption("yes");
    await modal
      .getByLabel(tr(lang, "weighedDuringShift"), { exact: true })
      .selectOption("yes");
    await button(tr(lang, "addMeasurement"), modal).click();
    await checkMode(
      lang,
      lang + " oxygen, incubator, medication, feeding and weight branches",
    );
    await switchTo(lang === "en" ? "zh" : "en", modal);
    assert.equal(
      await modal.getByLabel("FiO₂ (%)", { exact: true }).inputValue(),
      "21.5",
    );
    await checkMode(
      lang === "en" ? "zh" : "en",
      "Modal language switch retains observations and translates existing errors",
    );
    await switchTo(lang, modal);
    await button(tr(lang, "close"), modal).click();
  }
  // Source notes stay intact while all review controls follow the selected language.
  await page
    .locator("nav button")
    .filter({ hasText: tr("zh", "evidence") })
    .click();
  const source =
    "【研究ID：SYNTHETIC】\n2026-11-06 01:00 FiO2 30%\nNo nCPAP planned\n原始病歷不得因介面語言而變更";
  await page.locator("input[type=file]").setInputFiles({
    name: "synthetic-language.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(source),
  });
  await checkMode("zh", "Chinese source import preview");
  await button(tr("zh", "confirmImport")).click();
  await page.locator(".suggestion").first().waitFor();
  await button(
    tr("zh", "accepted"),
    page.locator(".suggestion").first(),
  ).click();
  await page.locator(".error[role=alert]").waitFor();
  await checkMode(
    "zh",
    "Chinese evidence controls, warnings and assignment error",
  );
  await switchTo("en");
  await checkMode(
    "en",
    "English evidence controls and existing assignment error",
  );
  assert.ok(
    (await page.locator(".user-content").allTextContents()).some((text) =>
      text.includes("原始病歷不得因介面語言而變更"),
    ),
  );
  const data = await (await page.request.get(url + "/api/data")).json();
  assert.equal(data.imports[0].text, source);
  checks.push(
    "Source text and saved clinical codes stay unchanged across language switches",
  );
  mkdirSync("docs/screenshots", { recursive: true });
  await page.locator("nav button").filter({ hasText: "Overview" }).click();
  await page.screenshot({
    path: "docs/screenshots/english-mode.png",
    fullPage: true,
  });
  await switchTo("zh");
  await page.screenshot({
    path: "docs/screenshots/chinese-mode.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1024, height: 768 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  checks.push("Chinese tablet layout has no horizontal page overflow");
  await button(tr("zh", "logout")).click();
  await button(tr("zh", "signIn")).waitFor();
  await page
    .getByPlaceholder(tr("zh", "password"), { exact: true })
    .fill("WrongSyntheticPassword");
  await button(tr("zh", "signIn")).click();
  await page.getByText(tr("zh", "errorCredentials"), { exact: true }).waitFor();
  await checkMode("zh", "Chinese sign-in and invalid-credentials error");
  await switchTo("en");
  await page.getByText(tr("en", "errorCredentials"), { exact: true }).waitFor();
  await checkMode(
    "en",
    "English sign-in and translated invalid-credentials error",
  );
  await page.reload();
  await button(tr("en", "signIn")).waitFor();
  checks.push("Preference persists after logout and reload");
  assert.deepEqual(errors, []);
  const report = {
    date: new Date().toISOString(),
    status: "passed",
    checks,
    consoleErrors: errors,
    fixtures: "Synthetic records in an isolated temporary database only.",
  };
  writeFileSync("docs/i18n-test-results.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (e) {
  console.error(e);
  console.error(logs);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
  await new Promise((r) => server.once("exit", r));
  rmSync(dir, { recursive: true, force: true });
}
