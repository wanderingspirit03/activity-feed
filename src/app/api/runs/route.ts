import { NextResponse } from "next/server";

import { errorJson } from "@/lib/api-error";
import { getRuns } from "@/lib/telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? "50");
    const cursor = searchParams.get("cursor");
    const status = searchParams.get("status") ?? undefined;
    const tag = searchParams.get("tag") ?? undefined;
    const q = searchParams.get("q") ?? undefined;
    const namespace = searchParams.get("namespace") ?? undefined;

    const result = await getRuns({
      limit: Number.isFinite(limit) ? limit : 50,
      cursor: cursor ? Number(cursor) : undefined,
      status: status || undefined,
      tag: tag || undefined,
      q: q || undefined,
      namespace: namespace || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    return errorJson("Failed to load runs", error);
  }
}
