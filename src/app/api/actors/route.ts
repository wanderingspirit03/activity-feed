import { NextResponse } from "next/server";

import { errorJson } from "@/lib/api-error";
import { getActors } from "@/lib/telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actors = await getActors();
    return NextResponse.json({ actors });
  } catch (error) {
    return errorJson("Failed to load actors", error);
  }
}
