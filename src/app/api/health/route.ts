import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbOk = false;
  try {
    await db.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }
  return NextResponse.json({
    status: dbOk ? "ok" : "degraded",
    db: dbOk,
    realtime: true,
    uptime: Math.round(process.uptime()),
    ts: new Date().toISOString(),
  });
}
