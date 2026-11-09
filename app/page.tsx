"use client";
import { useState, useEffect } from "react";
import { strings, options } from "../lib/i18n";
import { oa, validate, normalize } from "../lib/rules";
const fmt = (s: string) =>
  s
    ? new Date(s).toLocaleString("zh-TW", {
        timeZone: "Asia/Taipei",
        hour12: false,
      })
    : "—";
const local = (s: string) =>
  s ? new Date(Date.parse(s) + 28800000).toISOString().slice(0, 16) : "";
const utc = (s: string) => (s ? new Date(s + "+08:00").toISOString() : "");
export default function App() {
  const [lang, L] = useState<"zh" | "en">("zh"),
    [page, P] = useState("dashboard"),
    [session, U] = useState<any>(null),
    [setup, SSetup] = useState(false),
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
    [auth, A] = useState<any>({ id: "admin", name: "", password: "" });
  const t = (k: string) => (strings[lang] as any)[k] || k;
  const op = options[lang];
  async function api(path: string, b?: any) {
    const r = await fetch(
      "/api/" + path,
      b
        ? {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
      M(t("saved"));
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
    F((s: any) => ({ ...s, [k]: v }));
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
                  position === index ? { ...suggestion, ...patch } : suggestion,
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
            aria-label={label + " missing state"}
            value={form.missingStates?.[k] || "unknown"}
            onChange={(e) =>
              set("missingStates", {
                ...form.missingStates,
                [k]: e.target.value,
              })
            }
          >
            <option value="unknown">未知 / Unknown</option>
            <option value="not_recorded">未記錄 / Not recorded</option>
            <option value="not_measured">未測量 / Not measured</option>
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
  const badge = (s: string) => <span className={"badge " + s}>{t(s)}</span>;
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
      const s = await api("shifts", { ...form, action });
      F(s);
      await refresh();
    });
  }
  if (!ready) return <div className="loading">{t("loading")}</div>;
  if (!session)
    return (
      <main className="login">
        <div className="brandmark">＋</div>
        <h1>CGMH PREMII Tracker</h1>
        <p>NICU Research Workspace</p>
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
          <h2>
            {setup ? "建立管理員 / Create administrator" : "登入 / Sign in"}
          </h2>
          {setup && (
            <input
              required
              placeholder="姓名 / Name"
              value={auth.name}
              onChange={(e) => A({ ...auth, name: e.target.value })}
            />
          )}
          <input
            required
            readOnly={setup}
            placeholder="Account ID"
            value={auth.id}
            onChange={(e) => A({ ...auth, id: e.target.value })}
          />
          <input
            required
            minLength={setup ? 12 : 1}
            type="password"
            placeholder="Password"
            value={auth.password}
            onChange={(e) => A({ ...auth, password: e.target.value })}
          />
          <button disabled={busy}>{setup ? "建立並登入" : "登入"}</button>
          {err && <p className="error">{err}</p>}
          <small>首次使用請設定至少 12 字元密碼。無預設帳密。</small>
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
            <small>NICU RESEARCH TRACKER</small>
          </div>
        </div>
        <div className="workspace">
          研究工作區 <span>WORKSPACE</span>
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
            ●　Private research workspace
            <br />
            <small>Asia/Taipei · UTC+08:00</small>
          </div>
          <div className="profile">
            <span>{session.name.slice(0, 1)}</span>
            <div>
              {session.name}
              <small>{session.role}</small>
            </div>
            <button
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
            <span className="demo">模擬資料 / DEMO</span>
            <button
              className="language"
              onClick={() => L(lang === "zh" ? "en" : "zh")}
            >
              ◎ {lang === "zh" ? "English" : "繁體中文"}
            </button>
          </div>
        </header>
        <main>
          <div className="title">
            <div>
              <div className="eyebrow">CGMH · PREMII RESEARCH</div>
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
              {err}
              <button onClick={() => E("")}>×</button>
            </div>
          )}
          {msg && (
            <div role="status" className="success">
              ✓ {msg}
            </div>
          )}
          {page === "dashboard" && (
            <>
              <div className="stats">
                {[
                  ["infants", data.infants.length, "研究個案 / INFANTS", "♧"],
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
                      {k === "pending" ? "待研究人員審閱" : "PREMII · NICU"}
                    </small>
                  </button>
                ))}
              </div>
              <div className="notice">
                <span>ⓘ</span>
                <div>
                  <b>{t("score")}</b>
                  <p>
                    PREMII 回答碼與觀察值可用；總分待 CGMH 確認。
                    <span className="muted">　Rule v.pdf-word-2026.1</span>
                  </p>
                </div>
                <button className="text" onClick={() => nav("settings")}>
                  查看規則 ↗
                </button>
              </div>
              <div className="sectionhead">
                <h2>
                  近期評估 <small>RECENT ASSESSMENTS</small>
                </h2>
                <button className="text" onClick={() => nav("shifts")}>
                  {t("all")} →
                </button>
              </div>
              {table(list.slice(0, 6))}
              <div className="twocol">
                <section className="card">
                  <h2>{t("missing")}</h2>
                  <p className="muted">待補齊的觀察，不以零替代缺值。</p>
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
                          {validate(normalize(s), true).length} 項待補充 →
                        </span>
                      </button>
                    ))}
                  {!data.shifts.length && <p>{t("empty")}</p>}
                </section>
                <section className="card protocol">
                  <span className="eyebrow">RESEARCH PROTOCOL</span>
                  <h2>每一筆資料，皆可追溯。</h2>
                  <p>
                    觀察資料、問卷回答碼及計算結果分開保存。
                    <br />
                    保留來源證據、審核狀態與版本紀錄。
                  </p>
                  <div>PDF → 觀察 → 回答碼 → 審核</div>
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
                <select value={status} onChange={(e) => ST(e.target.value)}>
                  <option value="">{t("all")}</option>
                  {["active", "closed"].map((x) => (
                    <option key={x} value={x}>
                      {t(x)}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={from.slice(0, 10)}
                  onChange={(e) =>
                    FR(e.target.value ? e.target.value + "T00:00" : "")
                  }
                />
                <input
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
                        "出生 / Birth",
                        "胎齡 GA",
                        "出生體重",
                        "PNA / PMA",
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
                              {i.gaWeeks}w {i.gaDays}d
                            </td>
                            <td>{i.birthWeight} g</td>
                            <td>
                              {days}d / {Math.floor(pma / 7)}w {pma % 7}d
                            </td>
                            <td>{badge(i.status)}</td>
                            <td>
                              <button className="text" onClick={() => IF(i)}>
                                Edit
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
                  <p>
                    Asia/Taipei · PNA = floor(elapsed hours / 24); PMA = birth
                    GA + PNA
                  </p>
                  {table(
                    data.shifts.filter((s: any) => s.infantId === detail.id),
                  )}
                  <p>
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
                        PV({ name: f.name, text: await f.text() });
                        E("");
                      }
                    }}
                  />
                </label>
                <input
                  placeholder="搜尋來源文字 / Search source"
                  value={source}
                  onChange={(e) => SRC(e.target.value)}
                />
              </div>
              {preview && (
                <section className="card">
                  <h2>{preview.name}</h2>
                  <p>
                    IDs:{" "}
                    {[...preview.text.matchAll(/【研究ID[：:]\s*([^】]+)】/g)]
                      .map((x: any) => x[1])
                      .join(", ") || "unassigned"}{" "}
                    · 請在匯入後逐項分派研究個案。
                  </p>
                  <pre>{preview.text.slice(0, 18000)}</pre>
                  <button
                    onClick={() =>
                      act(async () => {
                        await api("imports", preview);
                        PV(null);
                        await refresh();
                      })
                    }
                  >
                    確認匯入 / Confirm import
                  </button>
                  <button className="secondary" onClick={() => PV(null)}>
                    取消
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
                      <pre>
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
                    選擇評估 / Select shift
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
                            {s.field} → {String(s.value)}
                          </b>
                          {badge(s.status)}
                          <blockquote>{s.quote}</blockquote>
                          <small>
                            {x.name} · Line {s.line} · Offset {s.offset} ·{" "}
                            {s.method}
                            <br />
                            記錄時間 {s.noteTime || "unknown"} / 事件時間{" "}
                            {s.eventTime || "unknown"}
                            <br />
                            研究ID {s.child}
                            {s.contextWarning &&
                              " ⚠ Negation / plan / history: insufficient"}
                          </small>
                          <label>
                            個案 / Infant
                            <select
                              aria-label="個案 / Infant"
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
                            評估 / Shift
                            <select
                              aria-label="評估 / Shift"
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
                            事件時間
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
                            觀察值
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
                  ["RES1", t("resp"), "level"],
                  ["fio2", "FiO₂", "%"],
                  ["ABD1_1", "Apnea + intervention", "events"],
                  ["ABD1_2", "Apnea without intervention", "events"],
                  ["ABD2_1", "Bradycardia + intervention", "events"],
                  ["ABD2_2", "Bradycardia without intervention", "events"],
                  ["ABD3_1", "Desaturation + intervention", "events"],
                  ["ABD3_2", "Desaturation without intervention", "events"],
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
                            title={`${fmt(s.start)}: ${s[k] ?? "missing"}`}
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
                      <small>缺失觀察以 ? 顯示；未填補無評估的時間。</small>
                    </section>
                  );
                })}
              </div>
            </>
          )}
          {page === "exports" && (
            <section className="card">
              <h2>
                研究資料匯出 <small>UTF-8 · CSV</small>
              </h2>
              {filters()}
              <p>
                包含觀察值、回答碼、單位、缺值狀態、UTC 時間、表單及規則版本。
              </p>
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
              <h3>Data dictionary</h3>
              <p>
                RES1: 0–5 · RES2: 1–3 · RES3: 1 oxygen / 2 air · flowL: L/min ·
                OA: 1–6
                <br />
                ABD1_1/2: apnea with/without intervention · ABD2: HR threshold ·
                ABD3: SpO₂ threshold
                <br />
                THG1: 1–3 · THG2: device · FEED1: 1–6 · FEED2: breast/bottle ·
                WEIGHT1: lowest g<br />
                Missing states: value / unknown / skipped. score: always unknown
                until validated.
              </p>
            </section>
          )}
          {page === "settings" && (
            <>
              <section className="card">
                <h2>PDF ↔ Word · 規則版本 pdf-word-2026.1</h2>
                <p>{t("score")}</p>
                <p>
                  PDF supersedes Word's low-flow “Ncpap” wording. nCPAP →
                  RES1=4; continuous low-flow nasal cannula → RES1=2; OA
                  skipped. 2 L/min belongs to pressure support.
                </p>
                <p>
                  OA: 21=1; 22–30=2; 31–40=3; 41–50=4; 51–60=5; ≥61=6. Decimal
                  gaps require manual category + evidence. Codes are response
                  codes, not validated scores.
                </p>
                <p>
                  PDF asks prescribed caffeine; Word implies administration.
                  Both prescription and administration are stored separately.
                </p>
                {session.role === "admin" && (
                  <button
                    onClick={() =>
                      act(async () => {
                        await api("seed", {});
                        await refresh();
                      })
                    }
                  >
                    建立模擬資料 / Seed synthetic data
                  </button>
                )}
              </section>
              {session.role === "admin" && (
                <section className="card">
                  <h2>使用者 / Accounts</h2>
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
                    <input name="id" required placeholder="Account ID" />
                    <input name="name" required placeholder="Name" />
                    <input
                      name="password"
                      type="password"
                      minLength={12}
                      required
                      placeholder="Password ≥12"
                    />
                    <select name="role">
                      <option value="entry">Entry</option>
                      <option value="reviewer">Reviewer</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button>Create account</button>
                  </form>
                  {data.users.map((u: any) => (
                    <p key={u.id}>
                      {u.id} · {u.name} · {u.role}
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
                        Before: {a.beforeData}
                        <br />
                        After: {a.afterData}
                      </pre>
                    </details>
                  ))}
              </section>
            </>
          )}
          <footer>
            CGMH PREMII Tracker{" "}
            <span>研究用途 · Research use　 /　 Asia/Taipei</span>
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
              <button type="button" className="text" onClick={() => IF(null)}>
                ×
              </button>
            </div>
            <div className="formgrid">
              <label>
                {t("study")}
                <input
                  required
                  value={inf.code}
                  onChange={(e) => IF({ ...inf, code: e.target.value })}
                />
              </label>
              {[
                ["birth", "出生時間 / Birth"],
                ["admitted", "入院時間 / Admission"],
                ["ended", "結束追蹤 / Follow-up end"],
              ].map(([k, label]) => (
                <label key={k}>
                  {label}
                  <input
                    required={k !== "ended"}
                    type="datetime-local"
                    value={local(inf[k])}
                    onChange={(e) => IF({ ...inf, [k]: utc(e.target.value) })}
                  />
                </label>
              ))}
              {[
                ["gaWeeks", "GA weeks"],
                ["gaDays", "GA days"],
                ["birthWeight", "Birth weight (g)"],
              ].map(([k, label]) => (
                <label key={k}>
                  {label}
                  <input
                    required
                    type="number"
                    value={inf[k]}
                    onChange={(e) =>
                      IF({ ...inf, [k]: Number(e.target.value) })
                    }
                  />
                </label>
              ))}
              <label>
                {t("status")}
                <select
                  value={inf.status}
                  onChange={(e) => IF({ ...inf, status: e.target.value })}
                >
                  <option value="active">{t("active")}</option>
                  <option value="closed">{t("closed")}</option>
                </select>
              </label>
            </div>
            <button disabled={busy}>{t("save")}</button>
            {err && <p className="error">{err}</p>}
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
              <button className="text" onClick={() => F(null)}>
                ×
              </button>
            </div>
            <div className="notice compact">
              {t("score")} · 所有時間為 Asia/Taipei
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
                choice("RES2", "Device", [
                  [3, "Endotracheal"],
                  [2, "Tracheostomy"],
                  [1, "Mask"],
                ])}
              {form.RES1 === 2 && (
                <div className="formgrid">
                  {choice("RES3", "Gas source", [
                    [2, "Air flow meter"],
                    [1, "Oxygen flow meter"],
                  ])}
                  {num("flow", "Maximum flow")}
                  {choice("flowUnit", "Unit", [
                    ["L/min", "L/min"],
                    ["cc/min", "cc/min"],
                  ])}
                  <p>OA → skipped</p>
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
                          F({ ...form, fio2: v, OA: v == null ? null : oa(v) });
                        }}
                      />
                    </label>
                    {choice("OA", "OA · Category", [
                      [1, "21%"],
                      [2, "22–30%"],
                      [3, "31–40%"],
                      [4, "41–50%"],
                      [5, "51–60%"],
                      [6, "≥61%"],
                    ])}
                    <label>
                      Manual category evidence
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
                {num("ABD2", "Bradycardia threshold", "beats/min")}
                {num("ABD3", "Desaturation threshold", "%")}
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
                          "Apnea + intervention",
                          "Apnea without intervention",
                          "Bradycardia + intervention",
                          "Bradycardia without intervention",
                          "Desaturation + intervention",
                          "Desaturation without intervention",
                        ][i],
                    )}
                  </div>
                ))}
                {choice("caffeine", "Caffeine / stimulant prescribed", yn)}
                <label>
                  Drug name
                  <input
                    value={form.drug || ""}
                    onChange={(e) => set("drug", e.target.value)}
                  />
                </label>
                {choice("administered", "Medication administered", yn)}
              </div>
              <h3>04　{t("thermal")}</h3>
              <div className="formgrid">
                {choice(
                  "THG1",
                  "THG1",
                  op.thermal.map((x, i) => [i + 1, x]),
                )}
                {form.THG1 === 3 &&
                  choice("THG2", "THG2 · Device", [
                    [2, "Incubator"],
                    [1, "Radiant warmer"],
                  ])}
              </div>
              <h3>05　{t("feeding")}</h3>
              {choice(
                "feeds",
                "Any feeds incl. amino acid / lipid IV nutrition?",
                yn,
              )}
              {form.feeds === "yes" && (
                <>
                  {choice(
                    "FEED1",
                    "FEED1 · Worst experience",
                    op.feed.map((x, i) => [i + 1, x]),
                  )}
                  <div className="checks">
                    {[
                      [2, "Breast"],
                      [1, "Bottle"],
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
                    Additional routes observed
                    <textarea
                      value={form.routes || ""}
                      onChange={(e) => set("routes", e.target.value)}
                    />
                  </label>
                </>
              )}
              <h3>06　{t("weight")}</h3>
              <div className="formgrid">
                {num("baselineWeight", "First assessment: prior weight", "g")}
                <label>
                  Prior measurement time
                  <input
                    type="datetime-local"
                    value={local(form.baselineTime)}
                    onChange={(e) => set("baselineTime", utc(e.target.value))}
                  />
                </label>
                {choice("weighed", "Weighed during shift?", yn)}
              </div>
              {form.weighed === "yes" && (
                <>
                  <p>記錄所有測量；自動選擇最低體重。</p>
                  {form.measurements?.map((m: any, i: number) => (
                    <div className="formgrid" key={i}>
                      <input
                        aria-label="Weight time"
                        type="datetime-local"
                        value={local(m.time)}
                        onChange={(e) =>
                          set(
                            "measurements",
                            form.measurements.map((x: any, j: number) =>
                              j === i ? { ...x, time: utc(e.target.value) } : x,
                            ),
                          )
                        }
                      />
                      <input
                        aria-label="Weight grams"
                        type="number"
                        value={m.value}
                        onChange={(e) =>
                          set(
                            "measurements",
                            form.measurements.map((x: any, j: number) =>
                              j === i
                                ? { ...x, value: Number(e.target.value) }
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
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    className="secondary"
                    onClick={() =>
                      set("measurements", [
                        ...(form.measurements || []),
                        { time: form.start, value: "" },
                      ])
                    }
                  >
                    ＋ Measurement
                  </button>
                </>
              )}
              <label>
                Review notes / Missing-state explanations
                <textarea
                  value={form.notes || ""}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </label>
            </fieldset>
            {err && <p className="error">{err}</p>}
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
                        es.length ? E(es.join("; ")) : M("Validation passed");
                      }}
                    >
                      檢查 / Validate
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
              <h3>來源證據 / Linked evidence</h3>
              {data.imports.flatMap((x: any) =>
                x.suggestions
                  .filter((s: any) => s.shiftId === form.id)
                  .map((s: any, i: number) => (
                    <blockquote key={x.id + i}>
                      <b>
                        {x.name} · L{s.line} · {s.field} {badge(s.status)}
                      </b>
                      <p>{s.quote}</p>
                      <small>
                        Note {fmt(s.noteTime)} / Event {fmt(s.eventTime)}
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
        <select value={selected} onChange={(e) => SEL(e.target.value)}>
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
          aria-label="From"
          type="datetime-local"
          value={from}
          onChange={(e) => FR(e.target.value)}
        />
        <input
          aria-label="To"
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
