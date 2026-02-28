import { NextResponse } from "next/server";

import { getDlq } from "@/lib/telemetry";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "100");
  const entries = await getDlq(Number.isFinite(limit) ? limit : 100);
  return NextResponse.json({ entries });
}
