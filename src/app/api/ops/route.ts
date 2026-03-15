import { NextResponse } from "next/server";
import { errorJson } from "@/lib/api-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Ops data is not yet available via the SQLite API
    // Return empty list until ops mode is migrated
    return NextResponse.json({ ops: [] });
  } catch (error) {
    return errorJson("Failed to load ops data", error);
  }
}

export async function POST() {
  return NextResponse.json(
    { error: "Ops commands are not yet available in SQLite mode" },
    { status: 501 },
  );
}
