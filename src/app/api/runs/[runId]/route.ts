import { NextResponse } from "next/server";

import { getRunDetail } from "@/lib/telemetry";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  const { runId } = await context.params;
  const detail = await getRunDetail(runId, 400);
  return NextResponse.json(detail);
}
