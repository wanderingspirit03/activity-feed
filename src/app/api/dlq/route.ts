import { NextResponse } from "next/server";

import { errorJson } from "@/lib/api-error";
import { getDlq } from "@/lib/telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? "100");
    const entries = await getDlq(Number.isFinite(limit) ? limit : 100);
    return NextResponse.json({ entries });
  } catch (error) {
    return errorJson("Failed to load DLQ entries", error);
  }
}
