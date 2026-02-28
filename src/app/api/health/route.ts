import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const redis = getRedis();
    
    // Current health snapshot
    const healthRaw = await redis.get("dashboard:health");
    const current = healthRaw ? JSON.parse(healthRaw) : null;
    
    // Health history (last 60 entries)
    const historyRaw = await redis.zrevrange("dashboard:health:history", 0, 59);
    const history = historyRaw.map(raw => {
      try { return JSON.parse(raw); } catch { return null; }
    }).filter(Boolean);
    
    // System stats
    const system = await redis.hgetall("dashboard:system");
    
    // Processes
    const processesRaw = await redis.get("dashboard:processes");
    const processes = processesRaw ? JSON.parse(processesRaw) : [];
    
    // Last published
    const lastPublished = await redis.get("dashboard:lastPublished");
    
    return NextResponse.json({
      current,
      history,
      system: Object.keys(system).length > 0 ? system : null,
      processes,
      lastPublished,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load health data", detail: String(error) },
      { status: 500 },
    );
  }
}
