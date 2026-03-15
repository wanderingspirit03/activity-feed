import { NextResponse } from "next/server";
import { errorJson } from "@/lib/api-error";
import { apiFetch } from "@/lib/api-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await apiFetch<Record<string, unknown>>("/api/cron");
    return NextResponse.json(data);
  } catch (error) {
    return errorJson("Failed to load cron data", error);
  }
}
