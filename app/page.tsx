"use client";

import { useState, useEffect } from "react";
import { options, translate, localizeError, formatDateTime } from "../lib/i18n";
import { oa, validate, normalize } from "../lib/rules";
const local = (s: string) =>
  s ? new Date(Date.parse(s) + 28800000).toISOString().slice(0, 16) : "";
const utc = (s: string) => (s ? new Date(s + "+08:00").toISOString() : "");
export default function App() {
  const [lang, L] = useState<"zh" | "en">("zh"),
    [page, P] = useState("dashboard"),
    [session, U] = useState<any>(null),
    [setup, SSetup] = useState(false),
    [setupTokenRequired, RequireSetupToken] = useState(false),
    [ready, R] = useState(false),
    [data, D] = useState<any>({
      infants: [],
      shifts: [],
      imports: [],
      users: [],
      audit: [],
    }),
    [msg, M] = useState(""),
    [err, E] = useState(""),
    [busy, B] = useState(false),
    [query, Q] = useState(""),
    [status, ST] = useState(""),
    [selected, SEL] = useState(""),
    [form, F] = useState<any>(null),
    [inf, IF] = useState<any>(null),
    [detail, DET] = useState<any>(null),
    [preview, PV] = useState<any>(null),
    [source, SRC] = useState(""),
    [evidenceShift, ES] = useState(""),
    [from, FR] = useState(""),
    [to, TO] = useState(""),
    [auth, A] = useState<any>({
      id: "admin",
      name: "",
      password: "",
    });
  const t = (k: string) => translate(lang, k);
  const fmt = (s: string) => formatDateTime(s, lang);
  const [localeReady, setLocaleReady] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("premii.language");
      if (saved === "en" || saved === "zh") L(saved);
    } catch {}
    setLocaleReady(true);
  }, []);
  useEffect(() => {
    if (!localeReady) return;
    document.documentElement.lang = lang === "en" ? "en" : "zh-Hant";
    try {
      localStorage.setItem("premii.language", lang);
    } catch {}
  }, [lang, localeReady]);
  const languageSwitch = (
    <button
      type="button"
      className="language"
      aria-label={t("language")}
      onClick={() => L(lang === "zh" ? "en" : "zh")}
    >
      ◎ {lang === "zh" ? "English" : "繁體中文"}
    </button>
  );
  const op = options[lang];
  async function api(path: string, b?: any) {
    const r = await fetch(
      "/api/" + path,
      b
        ? {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(b),
          }
        : {},
    );
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    return d;
  }
  async function refresh() {
    D(await api("data"));
  }
  async function act(fn: () => Promise<any>) {
    B(true);
    E("");
    M("");
    try {
      await fn();
      M("saved");
    } catch (e: any) {
      E(e.message);
    } finally {
      B(false);
    }
  }
  useEffect(() => {
    api("session")
      .then(async (x) => {
        U(x.user);
        SSetup(x.setup);
        RequireSetupToken(x.setupTokenRequired);
        if (x.user) await refresh();
      })
      .catch((e) => E(e.message))
      .finally(() => R(true));
  }, []);
  function nav(p: string, s = "") {
    if (p === "shifts" && s) SEL("");
    if (p === "trends" && !selected && data.infants.length)
      SEL(data.infants[0].id);
    P(p);
    ST(s);
    Q("");
    DET(null);
  }
  const list = data.shifts.filter(
    (s: any) =>
      (!status || s.status === status) &&
      (!selected || s.infantId === selected) &&
      (!from || s.start >= utc(from)) &&
      (!to || s.end <= utc(to)) &&
      (!query ||
        data.infants
          .find((i: any) => i.id === s.infantId)
          ?.code.toLowerCase()
          .includes(query.toLowerCase())),
  );
  function set(k: string, v: any) {
    F((s: any) => ({
      ...s,
      [k]: v,
    }));
  }
  function updateSuggestion(importId: string, index: number, patch: any) {
    D((previous: any) => ({
      ...previous,
      imports: previous.imports.map((item: any) =>
        item.id !== importId
          ? item
          : {
              ...item,
              suggestions: item.suggestions.map(
                (suggestion: any, position: number) =>
                  position === index
                    ? {
                        ...suggestion,
                        ...patch,
                      }
                    : suggestion,
              ),
            },
      ),
    }));
  }
  function num(k: string, label: string, unit = "") {
    return (
      <label>
        {label} {unit && <small>{unit}</small>}
        <input
          type="number"
          aria-label={label}
          step="any"
          value={form[k] ?? ""}
          placeholder={t("unknown")}
          onChange={(e) =>
            set(k, e.target.value === "" ? null : Number(e.target.value))
          }
        />
        {form[k] == null && (
          <select
            aria-label={label + t("missingStateSuffix")}
            value={form.missingStates?.[k] || "unknown"}
            onChange={(e) =>
              set("missingStates", {
                ...form.missingStates,
                [k]: e.target.value,
              })
            }
          >
            <option value="unknown">{t("unknown")}</option>
            <option value="not_recorded">{t("notRecorded")}</option>
            <option value="not_measured">{t("notMeasured")}</option>
          </select>
        )}
      </label>
    );
  }
  function choice(k: string, label: string, items: any[]) {
    return (
      <label>
        {label}
        <select
          aria-label={label}
          value={form[k] ?? ""}
          onChange={(e) =>
            set(
              k,
              e.target.value === ""
                ? null
                : typeof items[0]?.[0] === "number"
                  ? Number(e.target.value)
                  : e.target.value,
            )
          }
        >
          <option value="">{t("unknown")}</option>
          {items.map(([v, s]) => (
            <option key={v} value={v}>
              {s}
            </option>
          ))}
        </select>
      </label>
    );
  }
  const yn = [
    ["yes", t("yes")],
    ["no", t("no")],
    ["unknown", t("unknown")],
  ];
  const badge = (s: string) => (
    <span className={"badge " + s}>
      {t(
        s === "changes"
          ? "changesStatus"
          : ["accepted", "edited", "rejected"].includes(s)
            ? s + "Status"
            : s,
      )}
    </span>
  );
  function openShift(s: any) {
    F(structuredClone(s));
    E("");
  }
  function newShift() {
    F({
      infantId: selected || data.infants[0]?.id,
      start: "",
      end: "",
      version: 0,
      status: "draft",
      feeds: "unknown",
      weighed: "unknown",
      caffeine: "unknown",
      administered: "unknown",
      measurements: [],
      FEED2: [],
    });
  }
  async function save(action: string) {
    await act(async () => {
      const s = await api("shifts", {
        ...form,
        action,
      });
      F(s);
      await refresh();
    });
  }
  if (!ready || !localeReady)
    return <div className="loading">{t("loading")}</div>;
  if (!session)
    return (
      <main className="login">
        {languageSwitch}
        <div className="brandmark">＋</div>
        <h1>CGMH PREMII Tracker</h1>
        <p>{t("loginSubtitle")}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            act(async () => {
              if (setup) {
                await api("setup", auth);
                SSetup(false);
              }
              await api("login", auth);
              U((await api("session")).user);
              await refresh();
            });
          }}
        >
          <h2>{setup ? t("createAdmin") : t("signIn")}</h2>
          {setup && (
            <input
              required
              placeholder={t("name")}
              value={auth.name}
              onChange={(e) =>
                A({
                  ...auth,
                  name: e.target.value,
                })
              }
            />
          )}
          <input
            required
            readOnly={setup}
            placeholder={t("accountId")}
            value={auth.id}
            onChange={(e) =>
              A({
                ...auth,
                id: e.target.value,
              })
            }
          />
          <input
            required
            minLength={setup ? 12 : 1}
            type="password"
            placeholder={t("password")}
            value={auth.password}
            onChange={(e) =>
              A({
                ...auth,
                password: e.target.value,
              })
            }
          />
          {setup && setupTokenRequired && (
            <label>
              {t("setupTokenHelp")}
              <input
                required
                type="password"
                autoComplete="off"
                placeholder={t("setupToken")}
                value={auth.setupToken || ""}
                onChange={(e) =>
                  A({
                    ...auth,
                    setupToken: e.target.value,
                  })
                }
              />
            </label>
          )}
          <button disabled={busy}>
            {setup ? t("createAndSignIn") : t("signIn")}
          </button>
          {err && <p className="error">{localizeError(err, lang)}</p>}
          <small>{t("passwordHint")}</small>
        </form>
      </main>
    );
  return (
    <div className="shell">
      <aside>
        <div className="brand">
          <div className="brandmark">＋</div>
          <div>
            CGMH <b>PREMII</b>
            <small>{t("brandSubtitle")}</small>
          </div>
        </div>
        <div className="workspace">
          {t("workspace")}
          <span>{t("workspaceCaption")}</span>
        </div>
        <nav>
          {[
            ["dashboard", "◫"],
            ["infants", "♧"],
            ["shifts", "▤"],
            ["evidence", "⇄"],
            ["trends", "⌁"],
            ["exports", "⇩"],
          ].map(([k, icon]) => (
            <button
              key={k}
              className={page === k ? "active" : ""}
              onClick={() => nav(k)}
            >
              <i>{icon}</i>
              {t(k)}
              {k === "shifts" && (
                <em>
                  {
                    data.shifts.filter((s: any) => s.status === "pending")
                      .length
                  }
                </em>
              )}
            </button>
          ))}
        </nav>
        <div className="asidebottom">
          <button onClick={() => nav("settings")}>⚙　{t("settings")}</button>
          <div className="secure">
            {t("privateWorkspace")}
            <br />
            <small>Asia/Taipei · UTC+08:00</small>
          </div>
          <div className="profile">
            <span>{session.name.slice(0, 1)}</span>
            <div>
              {session.name}
              <small>{t(session.role)}</small>
            </div>
            <button
              aria-label={t("logout")}
              onClick={() =>
                act(async () => {
                  await api("logout", {});
                  U(null);
                })
              }
            >
              ↪
            </button>
          </div>
        </div>
      </aside>
      <div className="main">
        <header>
          <span>
            NICU <span className="muted">/</span> {t(page)}
          </span>
          <div>
            <span className="demo">{t("demoLabel")}</span>
            {languageSwitch}
          </div>
        </header>
        <main>
          <div className="title">
            <div>
              <div className="eyebrow">{t("researchEyebrow")}</div>
              <h1>{t(page)}</h1>
              <p>{page === "dashboard" ? t("welcome") : t("subtitle")}</p>
            </div>
            <div className="actions">
              <button
                className="secondary"
                onClick={() =>
                  IF({
                    code: "",
                    birth: "",
                    admitted: "",
                    gaWeeks: 28,
                    gaDays: 0,
                    birthWeight: 1000,
                    status: "active",
                  })
                }
              >
                ＋ {t("newInfant")}
              </button>
              <button disabled={!data.infants.length} onClick={newShift}>
                ＋ {t("newShift")}
              </button>
            </div>
          </div>
          {err && (
            <div role="alert" className="error">
              {localizeError(err, lang)}
              <button aria-label={t("dismiss")} onClick={() => E("")}>
                ×
              </button>
            </div>
          )}
          {msg && (
            <div role="status" className="success">
              ✓ {t(msg)}
            </div>
          )}
          {page === "dashboard" && (
            <>
              <div className="stats">
                {[
                  ["infants", data.infants.length, t("infantMetric"), "♧"],
                  [
                    "draft",
                    data.shifts.filter((s: any) => s.status === "draft").length,
                    t("draft"),
                    "▤",
                  ],
                  [
                    "pending",
                    data.shifts.filter((s: any) => s.status === "pending")
                      .length,
                    t("pending"),
                    "◷",
                  ],
                  [
                    "confirmed",
                    data.shifts.filter((s: any) => s.status === "confirmed")
                      .length,
                    t("confirmed"),
                    "✓",
                  ],
                ].map(([k, n, label, icon]) => (
                  <button
                    className="stat"
                    key={k}
                    onClick={() =>
                      nav(
                        k === "infants" ? "infants" : "shifts",
                        k === "infants" ? "" : String(k),
                      )
                    }
                  >
                    <div>
                      {label}
                      <span>{icon}</span>
                    </div>
                    <strong>{n}</strong>
                    <small>
                      {k === "pending"
                        ? t("reviewMetricHint")
                        : "PREMII · NICU"}
                    </small>
                  </button>
                ))}
              </div>
              <div className="notice">
                <span>ⓘ</span>
                <div>
                  <b>{t("score")}</b>
                  <p>
                    {t("scoreHint")}
                    <span className="muted"> {t("ruleVersionCaption")}</span>
                  </p>
                </div>
                <button className="text" onClick={() => nav("settings")}>
                  {t("viewRules")}
                </button>
              </div>
              <div className="sectionhead">
                <h2>
                  {t("recentAssessments")}
                  <small>{t("recentCaption")}</small>
                </h2>
                <button className="text" onClick={() => nav("shifts")}>
                  {t("all")} →
                </button>
              </div>
              {table(list.slice(0, 6))}
              <div className="twocol">
                <section className="card">
                  <h2>{t("missing")}</h2>
                  <p className="muted">{t("missingHint")}</p>
                  {data.shifts
                    .filter((s: any) => validate(normalize(s), true).length)
                    .slice(0, 3)
                    .map((s: any) => (
                      <button
                        className="attention"
                        key={s.id}
                        onClick={() => openShift(s)}
                      >
                        <b>
                          {
                            data.infants.find((i: any) => i.id === s.infantId)
                              ?.code
                          }
                        </b>
                        <span>
                          {validate(normalize(s), true).length}{" "}
                          {t("incompleteSuffix")}
                        </span>
                      </button>
                    ))}
                  {!data.shifts.length && <p>{t("empty")}</p>}
                </section>
                <section className="card protocol">
                  <span className="eyebrow">{t("researchProtocol")}</span>
                  <h2>{t("traceableTitle")}</h2>
                  <p>
                    {t("traceableBody")}
                    <br />
                    {t("traceableDetails")}
                  </p>
                  <div>{t("traceableFlow")}</div>
                </section>
              </div>
            </>
          )}
          {page === "infants" && (
            <>
              <div className="toolbar">
                <input
                  placeholder={t("search")}
                  value={query}
                  onChange={(e) => Q(e.target.value)}
                />
                <select
                  aria-label={t("status")}
                  value={status}
                  onChange={(e) => ST(e.target.value)}
                >
                  <option value="">{t("all")}</option>
                  {["active", "closed"].map((x) => (
                    <option key={x} value={x}>
                      {t(x)}
                    </option>
                  ))}
                </select>
                <input
                  aria-label={t("from")}
                  type="date"
                  value={from.slice(0, 10)}
                  onChange={(e) =>
                    FR(e.target.value ? e.target.value + "T00:00" : "")
                  }
                />
                <input
                  aria-label={t("to")}
                  type="date"
                  value={to.slice(0, 10)}
                  onChange={(e) =>
                    TO(e.target.value ? e.target.value + "T23:59" : "")
                  }
                />
              </div>
              <div className="tablewrap">
                <table>
                  <thead>
                    <tr>
                      {[
                        "study",
                        "birth",
                        "gestationalAge",
                        "birthWeight",
                        "ages",
                        "status",
                        "",
                      ].map((x) => (
                        <th key={x}>{t(x)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.infants
                      .filter(
                        (i: any) =>
                          (!query ||
                            i.code
                              .toLowerCase()
                              .includes(query.toLowerCase())) &&
                          (!status || i.status === status) &&
                          (!from || i.admitted >= utc(from)) &&
                          (!to || i.admitted <= utc(to)),
                      )
                      .map((i: any) => {
                        const days = Math.max(
                          0,
                          Math.floor(
                            (Date.now() - Date.parse(i.birth)) / 86400000,
                          ),
                        );
                        const pma = i.gaWeeks * 7 + i.gaDays + days;
                        return (
                          <tr key={i.id}>
                            <td>
                              <button
                                className="text"
                                onClick={() => {
                                  DET(i);
                                  SEL(i.id);
                                }}
                              >
                                {i.code}
                              </button>
                            </td>
                            <td>{fmt(i.birth)}</td>
                            <td>
                              {i.gaWeeks}
                              {t("weeksShort")} {i.gaDays}
                              {t("daysShort")}
                            </td>
                            <td>{i.birthWeight} g</td>
                            <td>
                              {days}
                              {t("daysShort")} / {Math.floor(pma / 7)}
                              {t("weeksShort")} {pma % 7}
                              {t("daysShort")}
                            </td>
                            <td>{badge(i.status)}</td>
                            <td>
                              <button className="text" onClick={() => IF(i)}>
                                {t("edit")}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              {detail && (
                <section className="card">
                  <h2>{detail.code}</h2>
                  <p>{t("ageConvention")}</p>
                  {table(
                    data.shifts.filter((s: any) => s.infantId === detail.id),
                  )}
                  <p className="user-content">
                    {data.imports
                      .flatMap((x: any) =>
                        x.suggestions
                          .filter((s: any) => s.infantId === detail.id)
                          .map((s: any) => s.quote),
                      )
                      .join("\n") || t("empty")}
                  </p>
                  <button onClick={() => nav("trends")}>{t("trends")}</button>
                </section>
              )}
            </>
          )}
          {page === "shifts" && (
            <>
              {filters()}
              {table(list)}
            </>
          )}
          {page === "evidence" && (
            <>
              <div className="toolbar">
                <label className="upload">
                  ＋ {t("import")}
                  <input
                    type="file"
                    accept=".txt,text/plain"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        PV({
                          name: f.name,
                          text: await f.text(),
                        });
                        E("");
                      }
                    }}
                  />
                </label>
                <input
                  placeholder={t("searchSource")}
                  value={source}
                  onChange={(e) => SRC(e.target.value)}
                />
              </div>
              {preview && (
                <section className="card">
                  <h2>{preview.name}</h2>
                  <p>
                    {t("sourceIds")}{" "}
                    {[...preview.text.matchAll(/【研究ID[：:]\s*([^】]+)】/g)]
                      .map((x: any) => x[1])
                      .join(", ") || t("unassigned")}{" "}
                    {t("assignAfterImport")}
                  </p>
                  <pre className="user-content">
                    {preview.text.slice(0, 18000)}
                  </pre>
                  <button
                    onClick={() =>
                      act(async () => {
                        await api("imports", preview);
                        PV(null);
                        await refresh();
                      })
                    }
                  >
                    {t("confirmImport")}
                  </button>
                  <button className="secondary" onClick={() => PV(null)}>
                    {t("cancel")}
                  </button>
                </section>
              )}
              <div className="reviewgrid">
                <section className="card">
                  <h2>{t("notes")}</h2>
                  {data.imports.map((x: any) => (
                    <details key={x.id} open>
                      <summary>
                        {x.name} · {x.suggestions.length}
                      </summary>
                      <pre className="user-content">
                        {x.text
                          .split("\n")
                          .map((l: string, i: number) =>
                            !source ||
                            l.toLowerCase().includes(source.toLowerCase())
                              ? `${i + 1} │ ${l}`
                              : null,
                          )
                          .filter(Boolean)
                          .join("\n")}
                      </pre>
                    </details>
                  ))}
                  {!data.imports.length && <p>{t("empty")}</p>}
                </section>
                <section className="card">
                  <h2>PREMII · {t("evidence")}</h2>
                  <label>
                    {t("selectShift")}
                    <select
                      value={evidenceShift}
                      onChange={(e) => ES(e.target.value)}
                    >
                      <option value="">{t("all")}</option>
                      {data.shifts.map((d: any) => (
                        <option key={d.id} value={d.id}>
                          {
                            data.infants.find((i: any) => i.id === d.infantId)
                              ?.code
                          }{" "}
                          · {fmt(d.start)}
                        </option>
                      ))}
                    </select>
                  </label>
                  {evidenceShift &&
                    (() => {
                      const sh = data.shifts.find(
                        (d: any) => d.id === evidenceShift,
                      );
                      return sh ? (
                        <div className="notice">
                          <div>
                            <b>
                              {badge(sh.status)} · RES1 {sh.RES1 ?? "—"} · OA{" "}
                              {sh.OA ?? "—"}
                            </b>
                            <p>
                              THG1 {sh.THG1 ?? "—"} / FEED1 {sh.FEED1 ?? "—"} /{" "}
                              {sh.WEIGHT1 ?? "—"} g
                            </p>
                            <button onClick={() => openShift(sh)}>
                              {t("review")}
                            </button>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  <p>{t("evidenceHint")}</p>
                  {data.imports.flatMap((x: any) =>
                    x.suggestions.map((s: any, index: number) =>
                      evidenceShift &&
                      s.shiftId &&
                      s.shiftId !== evidenceShift ? null : (
                        <article className="suggestion" key={x.id + index}>
                          <b>
                            {s.field === "weight"
                              ? t("weight")
                              : s.field === "fio2"
                                ? "FiO₂"
                                : s.field}{" "}
                            → {String(s.value)}
                          </b>
                          {badge(s.status)}
                          <blockquote className="user-content">
                            {s.quote}
                          </blockquote>
                          <small>
                            {x.name} {t("sourceLine")} {s.line}{" "}
                            {t("sourceOffset")} {s.offset} ·{" "}
                            {s.method === "regex-v1"
                              ? t("extractionMethod")
                              : s.method}
                            <br />
                            {t("noteTime")}{" "}
                            {s.noteTime ? fmt(s.noteTime) : t("unknown")}{" "}
                            {t("eventTimeDivider")}{" "}
                            {s.eventTime ? fmt(s.eventTime) : t("unknown")}
                            <br />
                            {t("sourceStudyId")}{" "}
                            {s.child === "unassigned"
                              ? t("unassigned")
                              : s.child}
                            {s.contextWarning && t("contextWarning")}
                          </small>
                          <label>
                            {t("infant")}
                            <select
                              aria-label={t("infant")}
                              value={s.infantId || ""}
                              onChange={(e) =>
                                updateSuggestion(x.id, index, {
                                  infantId: e.target.value,
                                  shiftId: null,
                                })
                              }
                            >
                              <option value="">—</option>
                              {data.infants.map((i: any) => (
                                <option key={i.id} value={i.id}>
                                  {i.code}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            {t("assessment")}
                            <select
                              aria-label={t("assessment")}
                              value={s.shiftId || ""}
                              onChange={(e) =>
                                updateSuggestion(x.id, index, {
                                  shiftId: e.target.value,
                                })
                              }
                            >
                              <option value="">—</option>
                              {data.shifts
                                .filter(
                                  (d: any) =>
                                    !s.infantId || d.infantId === s.infantId,
                                )
                                .map((d: any) => (
                                  <option key={d.id} value={d.id}>
                                    {fmt(d.start)}
                                  </option>
                                ))}
                            </select>
                          </label>
                          <label>
                            {t("eventTime")}
                            <input
                              type="datetime-local"
                              value={local(s.eventTime)}
                              onChange={(e) =>
                                updateSuggestion(x.id, index, {
                                  eventTime: utc(e.target.value),
                                })
                              }
                            />
                          </label>
                          <label>
                            {t("observedValue")}
                            <input
                              value={s.value}
                              onChange={(e) =>
                                updateSuggestion(x.id, index, {
                                  value: e.target.value,
                                })
                              }
                            />
                          </label>
                          <div className="actions">
                            {[
                              "accepted",
                              "edited",
                              "rejected",
                              "insufficient",
                            ].map((k) => (
                              <button
                                className="secondary"
                                key={k}
                                onClick={() =>
                                  act(async () => {
                                    if (
                                      ["accepted", "edited"].includes(k) &&
                                      (!s.infantId ||
                                        !s.shiftId ||
                                        !s.eventTime)
                                    )
                                      throw Error(
                                        "Assign infant, shift and event time before accepting",
                                      );
                                    await api("evidence", {
                                      ...s,
                                      index,
                                      expectedVersion: x.version,
                                      importId: x.id,
                                      status: k,
                                    });
                                    await refresh();
                                  })
                                }
                              >
                                {t(k)}
                              </button>
                            ))}
                          </div>
                        </article>
                      ),
                    ),
                  )}
                </section>
              </div>
            </>
          )}
          {page === "trends" && (
            <>
              {filters()}
              <div className="charts">
                {[
                  ["WEIGHT1", t("weight"), "g"],
                  ["RES1", t("resp"), t("levelUnit")],
                  ["fio2", "FiO₂", "%"],
                  ["ABD1_1", t("apneaIntervention"), t("eventUnit")],
                  ["ABD1_2", t("apneaNoIntervention"), t("eventUnit")],
                  ["ABD2_1", t("bradyIntervention"), t("eventUnit")],
                  ["ABD2_2", t("bradyNoIntervention"), t("eventUnit")],
                  ["ABD3_1", t("desatIntervention"), t("eventUnit")],
                  ["ABD3_2", t("desatNoIntervention"), t("eventUnit")],
                ].map(([k, label, unit]) => {
                  const sorted = [
                    ...list.filter(
                      (s: any) =>
                        s.infantId === (selected || data.infants[0]?.id),
                    ),
                  ].sort((a: any, b: any) => a.start.localeCompare(b.start));
                  const max = Math.max(1, ...sorted.map((s: any) => s[k] || 0));
                  return (
                    <section className="card" key={k}>
                      <h2>
                        {label}
                        <small>{unit}</small>
                      </h2>
                      <div className="chart">
                        {sorted.map((s: any) => (
                          <button
                            title={`${fmt(s.start)}: ${s[k] ?? t("missingObservation")}`}
                            key={s.id}
                            className={
                              "bar " + (s[k] == null ? "missingbar" : "")
                            }
                            style={{
                              height:
                                s[k] == null
                                  ? "100%"
                                  : `${Math.max(4, (s[k] / max) * 95)}%`,
                              left: `${sorted.length < 2 ? 3 : ((Date.parse(s.start) - Date.parse(sorted[0].start)) / (Date.parse(sorted.at(-1).start) - Date.parse(sorted[0].start))) * 90 + 2}%`,
                            }}
                            onClick={() => openShift(s)}
                          >
                            {s[k] ?? "?"}
                          </button>
                        ))}
                      </div>
                      <p className="muted">
                        {sorted.length
                          ? `${fmt(sorted[0].start)} — ${fmt(sorted.at(-1).end)}`
                          : t("noData")}
                      </p>
                      <small>{t("chartMissingHint")}</small>
                    </section>
                  );
                })}
              </div>
            </>
          )}
          {page === "exports" && (
            <section className="card">
              <h2>
                {t("researchExport")}
                <small>UTF-8 · CSV</small>
              </h2>
              {filters()}
              <p>{t("exportHint")}</p>
              <a
                className="button"
                href={
                  "/api/export?" +
                  new URLSearchParams({
                    infant: selected,
                    status,
                    from: from ? utc(from) : "",
                    to: to ? utc(to) : "",
                  })
                }
              >
                {t("download")} ↓
              </a>
              <h3>{t("dataDictionary")}</h3>
              <p>
                {t("dictionaryResp")}
                <br />
                {t("dictionaryEvents")}
                <br />
                {t("dictionaryOther")}
                <br />
                {t("dictionaryMissing")}
              </p>
            </section>
          )}
          {page === "settings" && (
            <>
              <section className="card">
                <h2>{t("rulesTitle")}</h2>
                <p>{t("score")}</p>
                <p>{t("respRules")}</p>
                <p>{t("oxygenRules")}</p>
                <p>{t("medicationRules")}</p>
                {session.role === "admin" && (
                  <button
                    onClick={() =>
                      act(async () => {
                        await api("seed", {});
                        await refresh();
                      })
                    }
                  >
                    {t("seed")}
                  </button>
                )}
              </section>
              {session.role === "admin" && (
                <section className="card">
                  <h2>{t("accounts")}</h2>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      act(async () => {
                        await api("users", Object.fromEntries(fd));
                        await refresh();
                      });
                    }}
                    className="formgrid"
                  >
                    <input name="id" required placeholder={t("accountId")} />
                    <input name="name" required placeholder={t("name")} />
                    <input
                      name="password"
                      type="password"
                      minLength={12}
                      required
                      placeholder={t("passwordMinimum")}
                    />
                    <select name="role" aria-label={t("role")}>
                      <option value="entry">{t("entry")}</option>
                      <option value="reviewer">{t("reviewer")}</option>
                      <option value="admin">{t("admin")}</option>
                    </select>
                    <button>{t("createAccount")}</button>
                  </form>
                  {data.users.map((u: any) => (
                    <p key={u.id}>
                      {u.id} · {u.name} · {t(u.role)}
                    </p>
                  ))}
                </section>
              )}
              <section className="card">
                <h2>{t("audit")}</h2>
                {data.audit
                  .slice(-30)
                  .reverse()
                  .map((a: any) => (
                    <details key={a.id}>
                      <summary>
                        {fmt(a.time)} · {a.actor} · {a.entity}
                      </summary>
                      <pre>
                        {t("before")}
                        <span className="user-content">{a.beforeData}</span>
                        <br />
                        {t("after")}
                        <span className="user-content">{a.afterData}</span>
                      </pre>
                    </details>
                  ))}
              </section>
            </>
          )}
          <footer>
            CGMH PREMII Tracker <span>{t("footer")}</span>
          </footer>
        </main>
      </div>
      {inf && (
        <div className="overlay">
          <form
            className="modal"
            onSubmit={(e) => {
              e.preventDefault();
              act(async () => {
                await api("infants", inf);
                IF(null);
                await refresh();
              });
            }}
          >
            <div className="modalhead">
              <h2>{t("newInfant")}</h2>
              <div className="modal-controls">
                {languageSwitch}
                <button
                  type="button"
                  className="text"
                  aria-label={t("close")}
                  onClick={() => IF(null)}
                >
                  ×
                </button>
              </div>
            </div>
            <div className="formgrid">
              <label>
                {t("study")}
                <input
                  required
                  value={inf.code}
                  onChange={(e) =>
                    IF({
                      ...inf,
                      code: e.target.value,
                    })
                  }
                />
              </label>
              {[
                ["birth", t("birth")],
                ["admitted", t("admission")],
                ["ended", t("followupEnd")],
              ].map(([k, label]) => (
                <label key={k}>
                  {label}
                  <input
                    required={k !== "ended"}
                    type="datetime-local"
                    value={local(inf[k])}
                    onChange={(e) =>
                      IF({
                        ...inf,
                        [k]: utc(e.target.value),
                      })
                    }
                  />
                </label>
              ))}
              {[
                ["gaWeeks", t("gaWeeks")],
                ["gaDays", t("gaDays")],
                ["birthWeight", t("birthWeightGrams")],
              ].map(([k, label]) => (
                <label key={k}>
                  {label}
                  <input
                    required
                    type="number"
                    value={inf[k]}
                    onChange={(e) =>
                      IF({
                        ...inf,
                        [k]: Number(e.target.value),
                      })
                    }
                  />
                </label>
              ))}
              <label>
                {t("status")}
                <select
                  value={inf.status}
                  onChange={(e) =>
                    IF({
                      ...inf,
                      status: e.target.value,
                    })
                  }
                >
                  <option value="active">{t("active")}</option>
                  <option value="closed">{t("closed")}</option>
                </select>
              </label>
            </div>
            <button disabled={busy}>{t("save")}</button>
            {err && <p className="error">{localizeError(err, lang)}</p>}
          </form>
        </div>
      )}
      {form && (
        <div className="overlay">
          <div className="modal wide">
            <div className="modalhead">
              <div>
                <small>
                  PREMII · v{form.version} ·{" "}
                  {form.ruleVersion || "pdf-word-2026.1"}
                </small>
                <h2>
                  {t("shifts")} {badge(form.status)}
                </h2>
              </div>
              <div className="modal-controls">
                {languageSwitch}
                <button
                  className="text"
                  aria-label={t("close")}
                  onClick={() => F(null)}
                >
                  ×
                </button>
              </div>
            </div>
            <div className="notice compact">
              {t("score")} {t("allTimes")}
            </div>
            <fieldset disabled={form.status === "confirmed" || busy}>
              <div className="formgrid">
                <label>
                  {t("study")}
                  <select
                    aria-label={t("study")}
                    value={form.infantId}
                    onChange={(e) => set("infantId", e.target.value)}
                  >
                    {data.infants.map((i: any) => (
                      <option key={i.id} value={i.id}>
                        {i.code}
                      </option>
                    ))}
                  </select>
                </label>
                {["start", "end"].map((k) => (
                  <label key={k}>
                    {t(k)}
                    <input
                      type="datetime-local"
                      value={local(form[k])}
                      onChange={(e) => set(k, utc(e.target.value))}
                    />
                  </label>
                ))}
              </div>
              <h3>01　{t("resp")}</h3>
              {choice(
                "RES1",
                "RES1 · " + t("resp"),
                op.res.map((x, i) => [i, x]),
              )}
              {form.RES1 === 5 &&
                choice("RES2", t("device"), [
                  [3, t("endotracheal")],
                  [2, t("tracheostomy")],
                  [1, t("mask")],
                ])}
              {form.RES1 === 2 && (
                <div className="formgrid">
                  {choice("RES3", t("gasSource"), [
                    [2, t("airMeter")],
                    [1, t("oxygenMeter")],
                  ])}
                  {num("flow", t("maximumFlow"))}
                  {choice("flowUnit", t("unit"), [
                    ["L/min", "L/min"],
                    ["cc/min", "cc/min"],
                  ])}
                  <p>{t("oaSkipped")}</p>
                </div>
              )}
              {form.RES1 !== 2 && (
                <>
                  <h3>02　{t("oxygen")}</h3>
                  <div className="formgrid">
                    <label>
                      FiO₂ (%)
                      <input
                        type="number"
                        step="any"
                        value={form.fio2 ?? ""}
                        onChange={(e) => {
                          const v =
                            e.target.value === ""
                              ? null
                              : Number(e.target.value);
                          F({
                            ...form,
                            fio2: v,
                            OA: v == null ? null : oa(v),
                          });
                        }}
                      />
                    </label>
                    {choice("OA", t("oaCategory"), [
                      [1, "21%"],
                      [2, "22–30%"],
                      [3, "31–40%"],
                      [4, "41–50%"],
                      [5, "51–60%"],
                      [6, "≥61%"],
                    ])}
                    <label>
                      {t("manualEvidence")}
                      <input
                        value={form.oaEvidence || ""}
                        onChange={(e) => set("oaEvidence", e.target.value)}
                      />
                    </label>
                  </div>
                </>
              )}
              <h3>03　{t("events")}</h3>
              <div className="formgrid">
                {num("ABD2", t("bradyThreshold"), "beats/min")}
                {num("ABD3", t("desatThreshold"), "%")}
                {[
                  "ABD1_1",
                  "ABD1_2",
                  "ABD2_1",
                  "ABD2_2",
                  "ABD3_1",
                  "ABD3_2",
                ].map((k, i) => (
                  <div key={k}>
                    {num(
                      k,
                      k +
                        " · " +
                        [
                          t("apneaIntervention"),
                          t("apneaNoIntervention"),
                          t("bradyIntervention"),
                          t("bradyNoIntervention"),
                          t("desatIntervention"),
                          t("desatNoIntervention"),
                        ][i],
                    )}
                  </div>
                ))}
                {choice("caffeine", t("prescribed"), yn)}
                <label>
                  {t("drugName")}
                  <input
                    value={form.drug || ""}
                    onChange={(e) => set("drug", e.target.value)}
                  />
                </label>
                {choice("administered", t("administered"), yn)}
              </div>
              <h3>04　{t("thermal")}</h3>
              <div className="formgrid">
                {choice(
                  "THG1",
                  "THG1",
                  op.thermal.map((x, i) => [i + 1, x]),
                )}
                {form.THG1 === 3 &&
                  choice("THG2", t("thermalDevice"), [
                    [2, t("incubator")],
                    [1, t("radiantWarmer")],
                  ])}
              </div>
              <h3>05　{t("feeding")}</h3>
              {choice("feeds", t("anyFeeds"), yn)}
              {form.feeds === "yes" && (
                <>
                  {choice(
                    "FEED1",
                    t("feedingWorst"),
                    op.feed.map((x, i) => [i + 1, x]),
                  )}
                  <div className="checks">
                    {[
                      [2, t("breast")],
                      [1, t("bottle")],
                    ].map(([v, label]) => (
                      <label key={v}>
                        <input
                          type="checkbox"
                          checked={form.FEED2?.includes(v)}
                          onChange={(e) =>
                            set(
                              "FEED2",
                              e.target.checked
                                ? [...(form.FEED2 || []), v]
                                : form.FEED2.filter((x: any) => x !== v),
                            )
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  <label>
                    {t("additionalRoutes")}
                    <textarea
                      value={form.routes || ""}
                      onChange={(e) => set("routes", e.target.value)}
                    />
                  </label>
                </>
              )}
              <h3>06　{t("weight")}</h3>
              <div className="formgrid">
                {num("baselineWeight", t("priorWeight"), "g")}
                <label>
                  {t("priorMeasurementTime")}
                  <input
                    type="datetime-local"
                    value={local(form.baselineTime)}
                    onChange={(e) => set("baselineTime", utc(e.target.value))}
                  />
                </label>
                {choice("weighed", t("weighedDuringShift"), yn)}
              </div>
              {form.weighed === "yes" && (
                <>
                  <p>{t("weightHint")}</p>
                  {form.measurements?.map((m: any, i: number) => (
                    <div className="formgrid" key={i}>
                      <input
                        aria-label={t("weightTime")}
                        type="datetime-local"
                        value={local(m.time)}
                        onChange={(e) =>
                          set(
                            "measurements",
                            form.measurements.map((x: any, j: number) =>
                              j === i
                                ? {
                                    ...x,
                                    time: utc(e.target.value),
                                  }
                                : x,
                            ),
                          )
                        }
                      />
                      <input
                        aria-label={t("weightGrams")}
                        type="number"
                        value={m.value}
                        onChange={(e) =>
                          set(
                            "measurements",
                            form.measurements.map((x: any, j: number) =>
                              j === i
                                ? {
                                    ...x,
                                    value: Number(e.target.value),
                                  }
                                : x,
                            ),
                          )
                        }
                      />
                      <button
                        className="secondary"
                        onClick={() =>
                          set(
                            "measurements",
                            form.measurements.filter(
                              (_: any, j: number) => j !== i,
                            ),
                          )
                        }
                      >
                        {t("remove")}
                      </button>
                    </div>
                  ))}
                  <button
                    className="secondary"
                    onClick={() =>
                      set("measurements", [
                        ...(form.measurements || []),
                        {
                          time: form.start,
                          value: "",
                        },
                      ])
                    }
                  >
                    {t("addMeasurement")}
                  </button>
                </>
              )}
              <label>
                {t("reviewNotes")}
                <textarea
                  value={form.notes || ""}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </label>
            </fieldset>
            {err && <p className="error">{localizeError(err, lang)}</p>}
            <div className="modalfoot">
              <div>
                {form.enteredBy} {form.reviewedBy && "→ " + form.reviewedBy}
              </div>
              <div className="actions">
                {form.status === "confirmed" ? (
                  <button disabled={busy} onClick={() => save("revise")}>
                    {t("revise")}
                  </button>
                ) : (
                  <>
                    <button
                      className="secondary"
                      onClick={() => {
                        const es = validate(normalize(form), true);
                        es.length ? E(es.join("; ")) : M("validationPassed");
                      }}
                    >
                      {t("validate")}
                    </button>
                    <button className="secondary" onClick={() => save("draft")}>
                      {t("save")}
                    </button>
                    <button onClick={() => save("submit")}>
                      {t("submit")}
                    </button>
                    {["reviewer", "admin"].includes(session.role) &&
                      form.status === "pending" && (
                        <>
                          <button onClick={() => save("changes")}>
                            {t("changes")}
                          </button>
                          <button onClick={() => save("confirm")}>
                            {t("confirm")}
                          </button>
                        </>
                      )}
                  </>
                )}
              </div>
            </div>
            <section>
              <h3>{t("linkedEvidence")}</h3>
              {data.imports.flatMap((x: any) =>
                x.suggestions
                  .filter((s: any) => s.shiftId === form.id)
                  .map((s: any, i: number) => (
                    <blockquote key={x.id + i}>
                      <b>
                        {x.name} · L{s.line} · {s.field} {badge(s.status)}
                      </b>
                      <p className="user-content">{s.quote}</p>
                      <small>
                        {t("noteTime")}
                        {fmt(s.noteTime)} {t("eventTimeDivider")}{" "}
                        {fmt(s.eventTime)}
                      </small>
                    </blockquote>
                  )),
              )}
            </section>
            <details>
              <summary>{t("history")}</summary>
              {data.audit
                .filter((a: any) => a.entity === form.id)
                .map((a: any) => (
                  <pre key={a.id}>
                    {fmt(a.time)} · {a.actor}
                    <br />
                    {a.beforeData}
                    <br />→ {a.afterData}
                  </pre>
                ))}
            </details>
          </div>
        </div>
      )}
    </div>
  );
  function filters() {
    return (
      <div className="toolbar">
        <input
          placeholder={t("search")}
          value={query}
          onChange={(e) => Q(e.target.value)}
        />
        <select
          aria-label={t("infant")}
          value={selected}
          onChange={(e) => SEL(e.target.value)}
        >
          <option value="">
            {t("all")} · {t("infants")}
          </option>
          {data.infants.map((i: any) => (
            <option key={i.id} value={i.id}>
              {i.code}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => ST(e.target.value)}>
          <option value="">
            {t("all")} · {t("status")}
          </option>
          {["draft", "pending", "changes", "confirmed"].map((x) => (
            <option key={x} value={x}>
              {t(x)}
            </option>
          ))}
        </select>
        <input
          aria-label={t("from")}
          type="datetime-local"
          value={from}
          onChange={(e) => FR(e.target.value)}
        />
        <input
          aria-label={t("to")}
          type="datetime-local"
          value={to}
          onChange={(e) => TO(e.target.value)}
        />
      </div>
    );
  }
  function table(rows: any[]) {
    return (
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              {["study", "start", "end", "resp", "status", ""].map((x) => (
                <th key={x}>{t(x)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((s: any) => (
              <tr key={s.id}>
                <td>
                  <b>
                    {data.infants.find((i: any) => i.id === s.infantId)?.code}
                  </b>
                  <small className="muted">v{s.version}</small>
                </td>
                <td>{fmt(s.start)}</td>
                <td>{fmt(s.end)}</td>
                <td>{s.RES1 == null ? "—" : op.res[s.RES1]}</td>
                <td>{badge(s.status)}</td>
                <td>
                  <button className="text" onClick={() => openShift(s)}>
                    {t("review")} ↗
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="empty">{t("empty")}</div>}
      </div>
    );
  }
}
