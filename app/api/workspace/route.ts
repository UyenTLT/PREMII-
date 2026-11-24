import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db, tx } from "../../../lib/db";

export const runtime = "nodejs";
const fields = [
  "infant",
  "date",
  "noteTime",
  "shift",
  "start",
  "end",
  "RES1",
  "RES2",
  "RES3",
  "RES3_1",
  "OA",
  "bradyThreshold",
  "desatThreshold",
  "ABD1_1",
  "ABD1_2",
  "ABD2_1",
  "ABD2_2",
  "ABD3_1",
  "ABD3_2",
  "ABD4",
  "ABD4_1",
  "THG1",
  "THG2",
  "fed",
  "FEED1",
  "FEED2",
  "first",
  "baselineWeight",
  "baselineDate",
  "baselineTime",
  "weighed",
  "WEIGHT1",
  "WEIGHT2",
  "WEIGHT3",
] as const;

function respond(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function owner(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;
  const row = await db
    .prepare(
      "SELECT users.id FROM sessions JOIN users ON users.id=sessions.userId WHERE sessions.token=? AND sessions.expires>?",
    )
    .get(token, Date.now());
  return row?.id as string | undefined;
}

const codes: Record<string, readonly string[]> = {
  shift: ["1", "2", "3", "4"],
  RES1: ["0", "1", "2", "3", "4", "5"],
  RES2: ["1", "2", "3"],
  RES3: ["1", "2"],
  OA: ["1", "2", "3", "4", "5", "6"],
  ABD4: ["0", "1"],
  THG1: ["1", "2", "3"],
  THG2: ["1", "2"],
  FEED1: ["1", "2", "3", "4", "5", "6"],
  FEED2: ["1", "2", "both"],
  fed: ["yes", "no"],
  weighed: ["yes", "no"],
  first: ["on", "off"],
};

const numbers: Record<string, readonly [number, number, boolean]> = {
  RES3_1: [0, 1999.99, false],
  bradyThreshold: [1, 300, true],
  desatThreshold: [1, 100, true],
  baselineWeight: [1, 20000, true],
  WEIGHT1: [1, 20000, true],
};

function fio2Readings(input: unknown) {
  if (input == null) return [];
  if (!Array.isArray(input) || input.length > 3000) return null;
  const readings = new Map<string, { percent: number; referenceDate?: string; documentedIn?: string }>();
  for (const item of input) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const { percent, referenceDate, documentedIn } = item;
    if (typeof percent !== "number" || !Number.isFinite(percent) || percent < 21 || percent > 100)
      return null;
    if (referenceDate != null) {
      if (typeof referenceDate !== "string") return null;
      const short = /^(\d{1,2})\/(\d{1,2})$/.exec(referenceDate);
      const iso = short
        ? `2000-${short[1].padStart(2, "0")}-${short[2].padStart(2, "0")}`
        : referenceDate;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
      const date = new Date(iso + "T00:00:00Z");
      if (!Number.isFinite(+date) || date.toISOString().slice(0, 10) !== iso)
        return null;
    }
    if (documentedIn != null) {
      if (referenceDate != null || typeof documentedIn !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(documentedIn))
        return null;
      const date = new Date(documentedIn + "T00:00:00Z");
      if (!Number.isFinite(+date) || date.toISOString().slice(0, 10) !== documentedIn)
        return null;
    }
    const reading = referenceDate ? { percent, referenceDate } :
      documentedIn ? { percent, documentedIn } : { percent };
    readings.set(JSON.stringify(reading), reading);
  }
  return [...readings.values()];
}

function observation(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const source = input as Record<string, unknown>;
  const data: Record<string, string | null> = {};
  for (const field of fields) {
    const value = source[field];
    if (value != null && (typeof value !== "string" || value.length > 512))
      return null;
    data[field] = typeof value === "string" ? value.trim() || null : null;
  }
  if (!data.infant || data.infant.length > 128) return null;
  for (const field of ["date", "WEIGHT2", "baselineDate"]) {
    const value = data[field];
    if (!value) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(value + "T00:00:00Z");
    if (!Number.isFinite(+date) || date.toISOString().slice(0, 10) !== value)
      return null;
  }
  for (const field of ["noteTime", "start", "end", "WEIGHT3", "baselineTime"]) {
    if (data[field] && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(data[field]!))
      return null;
  }
  for (const [field, value] of Object.entries(data)) {
    if (value === null) continue;
    if (codes[field] && !codes[field].includes(value)) return null;
    const range =
      numbers[field] ||
      (/^ABD[1-3]_[12]$/.test(field)
        ? [0, Number.MAX_SAFE_INTEGER, true]
        : null);
    if (range) {
      const [min, max, integer] = range;
      const number = Number(value);
      if (
        !/^\d+(?:\.\d+)?$/.test(value) ||
        !Number.isFinite(number) ||
        number < min ||
        number > max ||
        (integer && !Number.isInteger(number))
      )
        return null;
      data[field] = String(number);
    }
  }
  const readings = fio2Readings(source.fio2Readings);
  if (!readings) return null;
  return readings.length ? { ...data, fio2Readings: readings } : data;
}

async function handle(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (
    req.method !== "GET" &&
    origin &&
    new URL(origin).host !== req.headers.get("host")
  )
    return respond({ error: "origin_rejected" }, 403);
  const account = await owner(req);
  if (!account) return respond({ error: "sign_in_required" }, 401);
  let body: Record<string, unknown> = {};
  if (req.method === "POST") {
    const maximumBytes = 8_000_000;
    if (Number(req.headers.get("content-length")) > maximumBytes)
      return respond({ error: "invalid_record" }, 413);
    const raw = await req.text();
    if (Buffer.byteLength(raw) > maximumBytes)
      return respond({ error: "invalid_record" }, 413);
    try {
      body = JSON.parse(raw);
      if (!body || typeof body !== "object" || Array.isArray(body))
        throw Error();
    } catch {
      return respond({ error: "invalid_record" }, 400);
    }
  }
  if (req.method === "GET") {
    const rows = await db
      .prepare(
        "SELECT id,saved_at,data FROM workspace_records WHERE owner=? ORDER BY saved_at DESC,id DESC",
      )
      .all(account);
    return respond({
      records: rows.map(
        (row: { id: string; saved_at: string; data: string }) => ({
          id: row.id,
          savedAt: row.saved_at,
          observation: JSON.parse(row.data),
        }),
      ),
    });
  }
  if (req.method === "POST" && body.action === "save_batch") {
    const input = body.observations;
    if (!Array.isArray(input) || !input.length || input.length > 3000)
      return respond({ error: "invalid_record" }, 400);
    const rows = input.map(observation).filter((data) => data !== null);
    const invalid = input.length - rows.length;
    const saved = await tx(async () => {
      let count = 0;
      const time = new Date().toISOString();
      for (let offset = 0; offset < rows.length; offset += 100) {
        const batch = rows.slice(offset, offset + 100);
        const parameters = batch.flatMap((data) => {
          const json = JSON.stringify(data);
          return [
            randomUUID(),
            account,
            createHash("sha256").update(json).digest("hex"),
            time,
            json,
          ];
        });
        const placeholders = batch.map(() => "(?,?,?,?,?)").join(",");
        const result = await db
          .prepare(
            "INSERT INTO workspace_records VALUES " +
              placeholders +
              " ON CONFLICT(owner,fingerprint) DO NOTHING",
          )
          .run(...parameters);
        count += Number(result.changes);
      }
      return count;
    });
    return respond({ saved, duplicates: rows.length - saved, invalid });
  }
  if (req.method === "POST" && body.action === "save") {
    const data = observation(body.observation);
    if (!data) return respond({ error: "invalid_record" }, 400);
    const json = JSON.stringify(data);
    const fingerprint = createHash("sha256").update(json).digest("hex");
    const id = randomUUID();
    const result = await db
      .prepare(
        "INSERT INTO workspace_records VALUES(?,?,?,?,?) ON CONFLICT(owner,fingerprint) DO NOTHING",
      )
      .run(id, account, fingerprint, new Date().toISOString(), json);
    return respond({ duplicate: !result.changes }, result.changes ? 201 : 200);
  }
  if (req.method === "DELETE") {
    const id = req.nextUrl.searchParams.get("id");
    if (!id || !/^[a-f0-9-]{36}$/.test(id))
      return respond({ error: "invalid_record" }, 400);
    const result = await db
      .prepare("DELETE FROM workspace_records WHERE id=? AND owner=?")
      .run(id, account);
    return result.changes
      ? respond({ ok: true })
      : respond({ error: "not_found" }, 404);
  }
  return respond({ error: "invalid_record" }, 400);
}

async function request(req: NextRequest) {
  try {
    return await handle(req);
  } catch {
    return respond({ error: "database_unavailable" }, 503);
  }
}

export const GET = request;
export const POST = request;
export const DELETE = request;
