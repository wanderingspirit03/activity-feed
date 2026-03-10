import { NextResponse } from "next/server";

import { errorJson } from "@/lib/api-error";
import { getScores } from "@/lib/scores";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getScores();
    return NextResponse.json(data);
  } catch (error) {
    return errorJson("Failed to load scores", error);
  }
}
