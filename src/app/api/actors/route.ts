import { NextResponse } from "next/server";

import { getActors } from "@/lib/telemetry";

export const runtime = "nodejs";

export async function GET() {
  const actors = await getActors();
  return NextResponse.json({ actors });
}
