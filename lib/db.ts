import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

let connection: DatabaseSync | undefined;
function getDatabase() {
  if (connection) return connection;
  // Render disks exist at runtime, not during the Next.js build.
  const path = process.env.DATABASE_PATH || "./data/premii.sqlite";
  mkdirSync(dirname(path), { recursive: true });
  const opened = new DatabaseSync(path);
  try {
    opened.exec(
      "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;",
    );
    opened.exec(
      `CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT,role TEXT,password TEXT);CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,userId TEXT,expires INTEGER);CREATE TABLE IF NOT EXISTS infants(id TEXT PRIMARY KEY,data TEXT);CREATE TABLE IF NOT EXISTS shifts(id TEXT PRIMARY KEY,infantId TEXT,version INTEGER,data TEXT);CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,entity TEXT,actor TEXT,time TEXT,beforeData TEXT,afterData TEXT);CREATE TABLE IF NOT EXISTS imports(id TEXT PRIMARY KEY,hash TEXT UNIQUE,name TEXT,data TEXT);`,
    );
    connection = opened;
    return opened;
  } catch (error) {
    opened.close();
    throw error;
  }
}
export const db = {
  prepare(sql: string) {
    return getDatabase().prepare(sql);
  },
  exec(sql: string) {
    return getDatabase().exec(sql);
  },
};
export function hash(p: string) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(p, salt, 64).toString("hex");
}
export function verify(p: string, h: string) {
  const [s, v] = h.split(":");
  return timingSafeEqual(scryptSync(p, s, 64), Buffer.from(v, "hex"));
}
export function audit(id: string, u: string, b: any, a: any) {
  db.prepare(
    "INSERT INTO audit(entity,actor,time,beforeData,afterData) VALUES(?,?,?,?,?)",
  ).run(id, u, new Date().toISOString(), JSON.stringify(b), JSON.stringify(a));
}
export function tx<T>(fn: () => T) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const r = fn();
    db.exec("COMMIT");
    return r;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
