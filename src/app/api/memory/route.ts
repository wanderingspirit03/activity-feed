import { NextResponse } from "next/server";
import { errorJson } from "@/lib/api-error";
import { apiFetch } from "@/lib/api-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await apiFetch<{
      stats: {
        episodeCount: number;
        semanticEntryCount: number;
        taskScoreCount: number;
        dbSizeBytes: number;
        dbSize: string;
      };
      domains: Array<{ domain: string; count: number; avgConfidence: number }>;
      recentEpisodes?: Array<Record<string, unknown>>;
    }>("/api/memory");

    // Transform to the shape the old frontend expects
    return NextResponse.json({
      stats: {
        episodes: data.stats?.episodeCount ?? 0,
        semanticEntries: data.stats?.semanticEntryCount ?? 0,
        taskScores: data.stats?.taskScoreCount ?? 0,
        dbSize: data.stats?.dbSize ?? "unknown",
      },
      domains: (data.domains ?? []).map((d) => ({
        domain: d.domain,
        count: d.count,
        confidence: d.avgConfidence,
      })),
      recentEpisodes: data.recentEpisodes ?? [],
      dailyActivity: [],
      lastPublished: new Date().toISOString(),
    });
  } catch (error) {
    return errorJson("Failed to load memory data", error);
  }
}
