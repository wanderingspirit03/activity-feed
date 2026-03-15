import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "Ops actions not available in SQLite mode" },
    { status: 501 },
  );
}
