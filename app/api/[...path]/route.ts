import { NextRequest, NextResponse } from "next/server";
import { db, hash, verify, audit, tx } from "../../../lib/db";
import {
  normalize,
  validate,
  overlaps,
  extract,
  csv,
  RULE,
} from "../../../lib/rules";
import {
  randomBytes,
  randomUUID,
  createHash,
  timingSafeEqual,
} from "node:crypto";
export const runtime = "nodejs";
const all = (table: string) =>
  db.prepare("SELECT * FROM " + table).all() as any[];
export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}
async function handle(req: NextRequest) {
  try {
    const path = req.nextUrl.pathname.slice(5);
    const b = req.method === "POST" ? await req.json() : {};
    if (path === "setup") {
      if (all("users").length)
        return NextResponse.json(
          { error: "Already configured" },
          { status: 409 },
        );
      const setupToken = process.env.SETUP_TOKEN;
      if (process.env.RENDER === "true" && !setupToken)
        return NextResponse.json(
          {
            error:
              "Configure SETUP_TOKEN in Render Environment before first-admin setup",
          },
          { status: 503 },
        );
      if (
        setupToken &&
        (typeof b.setupToken !== "string" ||
          !timingSafeEqual(
            createHash("sha256").update(b.setupToken).digest(),
            createHash("sha256").update(setupToken).digest(),
          ))
      )
        return NextResponse.json(
          { error: "Setup token required or invalid" },
          { status: 403 },
        );
      if (!b.name || String(b.password).length < 12)
        throw Error("Name and password ≥12 characters required");
      db.prepare("INSERT INTO users VALUES(?,?,?,?)").run(
        "admin",
        b.name,
        "admin",
        hash(b.password),
      );
      return NextResponse.json({ ok: true });
    }
    if (path === "login") {
      const u = db.prepare("SELECT * FROM users WHERE id=?").get(b.id) as any;
      if (!u || !verify(b.password, u.password))
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 },
        );
      const token = randomBytes(32).toString("hex");
      db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
        token,
        u.id,
        Date.now() + 28800000,
      );
      const r = NextResponse.json({ ok: true });
      r.cookies.set("session", token, {
        httpOnly: true,
        sameSite: "strict",
        secure:
          process.env.RENDER === "true" || req.nextUrl.protocol === "https:",
        path: "/",
        maxAge: 28800,
      });
      return r;
    }
    if (path === "session") {
      const u = user(req);
      return NextResponse.json({
        user: u,
        setup: !all("users").length,
        setupTokenRequired:
          !!process.env.SETUP_TOKEN || process.env.RENDER === "true",
      });
    }
    const u = user(req);
    if (!u)
      return NextResponse.json({ error: "Please sign in" }, { status: 401 });
    if (
      req.method === "POST" &&
      req.headers.get("origin") &&
      new URL(req.headers.get("origin")!).host !== req.headers.get("host")
    )
      return NextResponse.json({ error: "Origin rejected" }, { status: 403 });
    if (path === "logout") {
      const r = NextResponse.json({ ok: true });
      db.prepare("DELETE FROM sessions WHERE token=?").run(
        req.cookies.get("session")?.value || "",
      );
      r.cookies.delete("session");
      return r;
    }
    if (path === "data")
      return NextResponse.json({
        infants: all("infants").map((x) => JSON.parse(x.data)),
        shifts: all("shifts").map((x) => JSON.parse(x.data)),
        imports: all("imports").map((x) => ({
          id: x.id,
          name: x.name,
          ...JSON.parse(x.data),
        })),
        users:
          u.role === "admin" ? all("users").map(({ password, ...x }) => x) : [],
        audit: all("audit"),
      });
    if (path === "users") {
      if (u.role !== "admin") throw Error("Admin required");
      if (
        !["entry", "reviewer", "admin"].includes(b.role) ||
        !b.id ||
        !b.name ||
        String(b.password).length < 12
      )
        throw Error("Valid account and password ≥12 required");
      db.prepare("INSERT INTO users VALUES(?,?,?,?)").run(
        b.id,
        b.name,
        b.role,
        hash(b.password),
      );
      audit(b.id, u.id, null, { role: b.role });
      return NextResponse.json({ ok: true });
    }
    if (path === "infants") {
      if (u.role === "reviewer") throw Error("Entry role required");
      if (
        !b.code ||
        typeof b.code !== "string" ||
        !b.birth ||
        !b.admitted ||
        !Number.isFinite(Date.parse(b.birth)) ||
        !Number.isFinite(Date.parse(b.admitted)) ||
        Date.parse(b.admitted) < Date.parse(b.birth) ||
        (b.ended &&
          (!Number.isFinite(Date.parse(b.ended)) ||
            Date.parse(b.ended) < Date.parse(b.admitted))) ||
        !Number.isInteger(b.gaWeeks) ||
        !Number.isInteger(b.gaDays) ||
        b.gaWeeks < 20 ||
        b.gaWeeks > 45 ||
        b.gaDays < 0 ||
        b.gaDays > 6 ||
        !(b.birthWeight > 0)
      )
        throw Error("Invalid baseline");
      if (
        all("infants").some((x) => {
          const a = JSON.parse(x.data);
          return a.code === b.code && a.id !== b.id;
        })
      )
        throw Error("Study ID already exists");
      const d = {
        ...b,
        birth: new Date(b.birth).toISOString(),
        admitted: new Date(b.admitted).toISOString(),
        ended: b.ended ? new Date(b.ended).toISOString() : null,
        id: b.id || randomUUID(),
      };
      const oldInf = db
        .prepare("SELECT data FROM infants WHERE id=?")
        .get(d.id) as any;
      return NextResponse.json(
        tx(() => {
          db.prepare(
            "INSERT INTO infants VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
          ).run(d.id, JSON.stringify(d));
          audit(d.id, u.id, oldInf ? JSON.parse(oldInf.data) : null, d);
          return d;
        }),
      );
    }
    if (path === "shifts")
      return NextResponse.json(
        tx(() => {
          const old = b.id
            ? (db.prepare("SELECT * FROM shifts WHERE id=?").get(b.id) as any)
            : null;
          const before = old ? JSON.parse(old.data) : null;
          if (old && old.version !== b.version)
            throw Error("CONFLICT: record changed; reload before saving");
          const action = b.action || "draft";
          if (
            ["confirm", "changes"].includes(action) &&
            !["reviewer", "admin"].includes(u.role)
          )
            throw Error("Reviewer required");
          if (["draft", "submit"].includes(action) && u.role === "reviewer")
            throw Error("Entry role required");
          if (before?.status === "confirmed" && action !== "revise")
            throw Error("Create revision before editing confirmed form");
          if (
            action === "revise" &&
            (!before || before.status !== "confirmed" || u.role === "reviewer")
          )
            throw Error("Revision unavailable");
          if (action === "confirm" && before?.status !== "pending")
            throw Error("Only pending forms can be confirmed");
          if (action === "changes" && before?.status !== "pending")
            throw Error("Only pending forms can be returned");
          let d = normalize({
            ...b,
            id: b.id || randomUUID(),
            version: (old?.version || 0) + 1,
            status:
              action === "confirm"
                ? "confirmed"
                : action === "submit"
                  ? "pending"
                  : action === "changes"
                    ? "changes"
                    : "draft",
            enteredBy: before?.enteredBy || u.id,
            reviewedBy: action === "confirm" ? u.id : null,
            updatedAt: new Date().toISOString(),
          });
          delete d.action;
          if (!db.prepare("SELECT id FROM infants WHERE id=?").get(d.infantId))
            throw Error("Infant missing");
          const errors = validate(d, ["confirm", "submit"].includes(action));
          if (
            !all("shifts").some(
              (x) => x.infantId === d.infantId && x.id !== d.id,
            )
          ) {
            if (
              ["confirm", "submit"].includes(action) &&
              (!d.baselineWeight || !d.baselineTime)
            )
              errors.push("First assessment requires baseline weight and time");
          }
          if (errors.length) throw Error(errors.join("; "));
          if (
            all("shifts").some(
              (x) =>
                x.id !== d.id &&
                x.infantId === d.infantId &&
                overlaps(d, JSON.parse(x.data)),
            )
          )
            throw Error("Shift overlaps existing shift");
          db.prepare(
            "INSERT INTO shifts VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET version=excluded.version,data=excluded.data",
          ).run(d.id, d.infantId, d.version, JSON.stringify(d));
          audit(d.id, u.id, before, d);
          return d;
        }),
      );
    if (path === "imports") {
      if (u.role === "reviewer") throw Error("Entry role required");
      if (typeof b.text !== "string" || b.text.length > 5000000)
        throw Error("TXT size limit 5 MB");
      const h = createHash("sha256")
        .update(b.text.replaceAll("\r\n", "\n"))
        .digest("hex");
      if (db.prepare("SELECT id FROM imports WHERE hash=?").get(h))
        throw Error("Duplicate file");
      const id = randomUUID();
      const d = {
        version: 1,
        text: b.text,
        suggestions: extract(b.text),
        assignments: b.assignments || {},
        createdAt: new Date().toISOString(),
      };
      db.prepare("INSERT INTO imports VALUES(?,?,?,?)").run(
        id,
        h,
        b.name,
        JSON.stringify(d),
      );
      audit(id, u.id, null, { name: b.name });
      return NextResponse.json({ id, ...d });
    }
    if (path === "evidence")
      return NextResponse.json(
        tx(() => {
          if (!["reviewer", "admin"].includes(u.role))
            throw Error("Reviewer required");
          const x = db
            .prepare("SELECT * FROM imports WHERE id=?")
            .get(b.importId) as any;
          if (!x) throw Error("Import missing");
          const d = JSON.parse(x.data);
          if (b.expectedVersion !== d.version)
            throw Error("CONFLICT: source review changed; reload");
          const before = structuredClone(d);
          const s = d.suggestions[b.index];
          if (!s) throw Error("Suggestion missing");
          if (
            !["accepted", "edited", "rejected", "insufficient"].includes(
              b.status,
            )
          )
            throw Error("Invalid decision");
          if (["accepted", "edited"].includes(b.status)) {
            const sh = db
              .prepare("SELECT * FROM shifts WHERE id=?")
              .get(b.shiftId) as any;
            const shift = sh ? JSON.parse(sh.data) : null;
            if (
              !shift ||
              shift.infantId !== b.infantId ||
              !b.eventTime ||
              Date.parse(b.eventTime) < Date.parse(shift.start) ||
              Date.parse(b.eventTime) >= Date.parse(shift.end) ||
              !Number.isFinite(Date.parse(b.eventTime))
            )
              throw Error(
                "Evidence must match infant, shift and an event time within shift",
              );
          }
          d.version++;
          s.status = b.status;
          s.reviewedBy = u.id;
          s.reviewedAt = new Date().toISOString();
          s.shiftId = b.shiftId || null;
          s.eventTime = b.eventTime || null;
          s.noteTime = b.noteTime || s.noteTime;
          s.value = b.value ?? s.value;
          s.infantId = b.infantId || null;
          db.prepare("UPDATE imports SET data=? WHERE id=?").run(
            JSON.stringify(d),
            x.id,
          );
          audit(x.id, u.id, before.suggestions[b.index], s);
          return { ok: true };
        }),
      );
    if (path === "export") {
      const q = req.nextUrl.searchParams;
      const rows: any[] = [
        [
          "study_id",
          "shift_start_utc",
          "shift_end_utc",
          "status",
          "form_version",
          "rule_version",
          "variable",
          "value",
          "unit",
          "missing_state",
        ],
      ];
      for (const x of all("shifts")) {
        const d = normalize(JSON.parse(x.data));
        d.RES3_1 = d.flowL == null ? null : d.flowL * 1000;
        d.ABD4 = d.caffeine === "yes" ? 1 : d.caffeine === "no" ? 0 : null;
        d.ABD4_1 = d.drug;
        if (
          (q.get("infant") && d.infantId !== q.get("infant")) ||
          (q.get("status") && d.status !== q.get("status")) ||
          (q.get("from") && d.start < q.get("from")!) ||
          (q.get("to") && d.end > q.get("to")!)
        )
          continue;
        const inf = JSON.parse(
          (
            db
              .prepare("SELECT data FROM infants WHERE id=?")
              .get(d.infantId) as any
          ).data,
        );
        for (const k of [
          "RES1",
          "RES2",
          "RES3",
          "flow",
          "RES3_1",
          "flowUnit",
          "flowL",
          "oaEvidence",
          "OA",
          "fio2",
          "ABD1_1",
          "ABD1_2",
          "ABD2",
          "ABD2_1",
          "ABD2_2",
          "ABD3",
          "ABD3_1",
          "ABD3_2",
          "caffeine",
          "ABD4",
          "drug",
          "ABD4_1",
          "administered",
          "THG1",
          "THG2",
          "feeds",
          "FEED1",
          "FEED2",
          "routes",
          "weighed",
          "WEIGHT1",
          "baselineWeight",
          "baselineTime",
          "measurements",
          "score",
        ]) {
          let skip = ["OA", "fio2", "oaEvidence"].includes(k)
            ? d.RES1 === 2
            : ["RES3", "RES3_1", "flow", "flowUnit", "flowL"].includes(k)
              ? d.RES1 !== 2
              : k === "RES2"
                ? d.RES1 !== 5
                : k === "THG2"
                  ? d.THG1 !== 3
                  : k.startsWith("FEED") || k === "routes"
                    ? d.feeds !== "yes"
                    : k === "WEIGHT1" || k === "measurements"
                      ? d.weighed === "no"
                      : false;
          rows.push([
            inf.code,
            d.start,
            d.end,
            d.status,
            d.version,
            RULE,
            k,
            skip ? "" : typeof d[k] === "object" ? JSON.stringify(d[k]) : d[k],
            k === "flowL"
              ? "L/min"
              : k === "RES3_1"
                ? "cc/min"
                : /weight|WEIGHT/i.test(k)
                  ? "g"
                  : k === "fio2"
                    ? "%"
                    : "",
            skip
              ? "skipped"
              : d[k] == null || d[k] === "unknown"
                ? d.missingStates?.[k] ||
                  (k === "WEIGHT1" && d.weighed === "no"
                    ? "not_measured"
                    : "unknown")
                : "value",
          ]);
        }
      }
      return new NextResponse(csv(rows), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="premii.csv"',
        },
      });
    }
    if (path === "seed") {
      if (u.role !== "admin" || all("infants").length)
        throw Error("Seed requires empty database and admin");
      tx(() => {
        for (let i = 1; i <= 8; i++) {
          const id = "demo-" + i;
          const d = {
            id,
            code: "DEMO-" + String(i).padStart(3, "0"),
            birth: "2026-10-12T00:00:00.000Z",
            admitted: "2026-10-12T00:00:00.000Z",
            gaWeeks: 27 + (i % 4),
            gaDays: i % 7,
            birthWeight: 850 + i * 90,
            status: "active",
          };
          db.prepare("INSERT INTO infants VALUES(?,?)").run(
            id,
            JSON.stringify(d),
          );
          for (let j = 0; j < 3; j++) {
            let s = normalize({
              id: id + "-" + j,
              infantId: id,
              version: 1,
              start: `2026-11-0${j + 1}T00:00:00.000Z`,
              end: `2026-11-0${j + 1}T08:00:00.000Z`,
              status: j === 0 ? "confirmed" : j === 1 ? "pending" : "draft",
              RES1: 4,
              fio2: 25 + i,
              OA: oaSeed(25 + i),
              THG1: 3,
              THG2: 2,
              feeds: "yes",
              FEED1: 6,
              FEED2: [],
              weighed: "yes",
              measurements: [
                {
                  time: `2026-11-0${j + 1}T02:00:00Z`,
                  value: 1000 + i * 90 + j * 25,
                },
              ],
              baselineWeight: 990 + i * 90,
              baselineTime: "2026-10-31T16:00:00Z",
              ABD1_1: 0,
              ABD1_2: 1,
              ABD2: 80,
              ABD2_1: 0,
              ABD2_2: 0,
              ABD3: 85,
              ABD3_1: 1,
              ABD3_2: 2,
              caffeine: "yes",
              drug: "Caffeine citrate",
              administered: "unknown",
              enteredBy: u.id,
            });
            db.prepare("INSERT INTO shifts VALUES(?,?,?,?)").run(
              s.id,
              id,
              1,
              JSON.stringify(s),
            );
          }
        }
      });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: e.message.includes("CONFLICT") ? 409 : 400 },
    );
  }
}
function oaSeed(v: number) {
  return v <= 30 ? 2 : 3;
}
function user(req: NextRequest): any {
  const s = db
    .prepare("SELECT userId FROM sessions WHERE token=? AND expires>?")
    .get(req.cookies.get("session")?.value || "", Date.now()) as any;
  if (!s) return null;
  const u = db
    .prepare("SELECT id,name,role FROM users WHERE id=?")
    .get(s.userId);
  return u || null;
}
