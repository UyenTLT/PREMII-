import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
const path = process.env.DATABASE_PATH || "./data/premii.sqlite";
mkdirSync(path.slice(0, path.lastIndexOf("/")) || ".", { recursive: true });
export const db = new DatabaseSync(path);
db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;");
db.exec(
  `CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT,role TEXT,password TEXT);CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,userId TEXT,expires INTEGER);CREATE TABLE IF NOT EXISTS infants(id TEXT PRIMARY KEY,data TEXT);CREATE TABLE IF NOT EXISTS shifts(id TEXT PRIMARY KEY,infantId TEXT,version INTEGER,data TEXT);CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,entity TEXT,actor TEXT,time TEXT,beforeData TEXT,afterData TEXT);CREATE TABLE IF NOT EXISTS imports(id TEXT PRIMARY KEY,hash TEXT UNIQUE,name TEXT,data TEXT);`,
);
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
