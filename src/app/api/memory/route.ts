import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const redis = getRedis();
    
    // Memory stats
    const statsHash = await redis.hgetall("dashboard:memory:stats");
    const stats = Object.keys(statsHash).length > 0 ? {
      episodes: Number(statsHash.episodes) || 0,
      semanticEntries: Number(statsHash.semanticEntries) || 0,
      taskScores: Number(statsHash.taskScores) || 0,
      dbSize: statsHash.dbSize || "unknown",
    } : null;
    
    // Domain breakdown
    const domainsRaw = await redis.get("dashboard:memory:domains");
    const domains = domainsRaw ? JSON.parse(domainsRaw) : [];
    
    // Recent episodes from sorted set
    const recentRaw = await redis.zrevrange("dashboard:memory:recent", 0, 49);
    const recentEpisodes = recentRaw.map(raw => {
      try { return JSON.parse(raw); } catch { return null; }
    }).filter(Boolean);
    
    // Daily activity
    const dailyRaw = await redis.get("dashboard:memory:daily");
    const dailyActivity = dailyRaw ? JSON.parse(dailyRaw) : [];
    
    const lastPublished = await redis.get("dashboard:lastPublished");
    
    return NextResponse.json({
      stats,
      domains,
      recentEpisodes,
      dailyActivity,
      lastPublished,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load memory data", detail: String(error) },
      { status: 500 },
    );
  }
}
