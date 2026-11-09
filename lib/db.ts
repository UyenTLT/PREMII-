import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { Pool, type PoolClient } from "pg";

type Transaction = { postgres?: PoolClient; sqlite?: true };
const current = new AsyncLocalStorage<Transaction>();
let sqlite: DatabaseSync | undefined;
let postgres: Pool | undefined;
let postgresReady: Promise<void> | undefined;
let sqliteQueue: Promise<void> = Promise.resolve();

async function withSqliteLock<T>(fn: () => Promise<T> | T): Promise<T> {
  if (current.getStore()?.sqlite) return fn();
  const previous = sqliteQueue;
  let release!: () => void;
  sqliteQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await fn();
  } finally {
    release();
  }
}
function getSqlite() {
  if (process.env.RENDER === "true" && !process.env.DATABASE_URL)
    throw Error("Render requires DATABASE_URL; ephemeral SQLite is disabled");
  if (sqlite) return sqlite;
  const path = process.env.DATABASE_PATH || "./data/premii.sqlite";
  mkdirSync(dirname(path), { recursive: true });
  const connection = new DatabaseSync(path);
  try {
    connection.exec(
      "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;",
    );
    connection.exec(
      readFileSync(join(process.cwd(), "migrations/001.sql"), "utf8"),
    );
    sqlite = connection;
    return connection;
  } catch (error) {
    connection.close();
    throw error;
  }
}
async function getPostgres() {
  if (!postgres)
    postgres = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    });
  if (!postgresReady) {
    postgresReady = (async () => {
      const client = await postgres!.connect();
      let locked = false;
      try {
        await client.query("SELECT pg_advisory_lock(197131001)");
        locked = true;
        await client.query(
          readFileSync(
            join(process.cwd(), "migrations/postgres/001.sql"),
            "utf8",
          ),
        );
      } finally {
        try {
          if (locked)
            await client.query("SELECT pg_advisory_unlock(197131001)");
        } finally {
          client.release();
        }
      }
    })().catch((error) => {
      postgresReady = undefined;
      throw error;
    });
  }
  await postgresReady;
  return postgres;
}
const rowNames: Record<string, string> = {
  userid: "userId",
  infantid: "infantId",
  beforedata: "beforeData",
  afterdata: "afterData",
};
async function execute(
  sql: string,
  values: any[],
  kind: "get" | "all" | "run",
): Promise<any> {
  if (process.env.DATABASE_URL) {
    let position = 0;
    const statement = sql.replace(/\?/g, () => `$${++position}`);
    const client = current.getStore()?.postgres || (await getPostgres());
    const result = await client.query(statement, values);
    const rows = result.rows.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [
          rowNames[key] || key,
          value,
        ]),
      ),
    );
    return kind === "get"
      ? rows[0]
      : kind === "all"
        ? rows
        : { changes: result.rowCount };
  }
  return withSqliteLock(() => {
    const statement = getSqlite().prepare(sql);
    return statement[kind](...values);
  });
}
export const db = {
  prepare(sql: string) {
    return {
      get: (...values: any[]) => execute(sql, values, "get"),
      all: (...values: any[]) => execute(sql, values, "all"),
      run: (...values: any[]) => execute(sql, values, "run"),
    };
  },
};
export function hash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}
export function verify(password: string, encoded: string) {
  const [salt, value] = encoded.split(":");
  return timingSafeEqual(
    scryptSync(password, salt, 64),
    Buffer.from(value, "hex"),
  );
}
export async function audit(
  entity: string,
  actor: string,
  before: any,
  after: any,
) {
  await db
    .prepare(
      "INSERT INTO audit(entity,actor,time,beforeData,afterData) VALUES(?,?,?,?,?)",
    )
    .run(
      entity,
      actor,
      new Date().toISOString(),
      JSON.stringify(before),
      JSON.stringify(after),
    );
}
export async function tx<T>(fn: () => Promise<T> | T): Promise<T> {
  if (current.getStore()) return fn();
  if (process.env.DATABASE_URL) {
    const client = await (await getPostgres()).connect();
    try {
      await client.query("BEGIN");
      // Serialize mutations across processes so overlap, version and bootstrap checks remain atomic.
      await client.query("SELECT pg_advisory_xact_lock(197131002)");
      const result = await current.run({ postgres: client }, fn);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  return withSqliteLock(async () => {
    const connection = getSqlite();
    connection.exec("BEGIN IMMEDIATE");
    try {
      const result = await current.run({ sqlite: true }, fn);
      connection.exec("COMMIT");
      return result;
    } catch (error) {
      connection.exec("ROLLBACK");
      throw error;
    }
  });
}
