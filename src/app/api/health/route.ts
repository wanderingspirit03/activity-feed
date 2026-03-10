import { NextResponse } from "next/server";

import { errorJson } from "@/lib/api-error";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const redis = getRedis();

    const healthRaw = await redis.get("dashboard:health");
    const current = healthRaw ? JSON.parse(healthRaw) : null;

    const historyRaw = await redis.zrevrange("dashboard:health:history", 0, 59);
    const history = historyRaw
      .map((raw) => {
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const system = await redis.hgetall("dashboard:system");

    const processesRaw = await redis.get("dashboard:processes");
    const processes = processesRaw ? JSON.parse(processesRaw) : [];

    const lastPublished = await redis.get("dashboard:lastPublished");

    return NextResponse.json({
      current,
      history,
      system: Object.keys(system).length > 0 ? system : null,
      processes,
      lastPublished,
    });
  } catch (error) {
    return errorJson("Failed to load health data", error);
  }
}
