import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await db.prepare("SELECT 1 AS ready").get();
    return NextResponse.json(
      { status: "ok", service: "CGMH PREMII Tracker" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
