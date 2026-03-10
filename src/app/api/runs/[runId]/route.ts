import { NextResponse } from "next/server";

import { errorJson } from "@/lib/api-error";
import { getRunDetail } from "@/lib/telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await context.params;
    const detail = await getRunDetail(runId, 400);
    return NextResponse.json(detail);
  } catch (error) {
    return errorJson("Failed to load run detail", error);
  }
}
