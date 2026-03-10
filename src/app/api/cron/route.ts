import { NextResponse } from "next/server";

import { errorJson } from "@/lib/api-error";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const redis = getRedis();

    const jobsRaw = await redis.get("dashboard:cron:jobs");
    const jobs = jobsRaw ? JSON.parse(jobsRaw) : [];

    const lastRunHash = await redis.hgetall("dashboard:cron:lastrun");

    const merged = jobs.map((job: any) => {
      const lastRunRaw = lastRunHash[job.slug];
      let lastRun = null;
      if (lastRunRaw) {
        try {
          lastRun = JSON.parse(lastRunRaw);
        } catch {}
      }
      return { ...job, lastRun };
    });

    const lastPublished = await redis.get("dashboard:lastPublished");

    return NextResponse.json({
      jobs: merged,
      lastPublished,
    });
  } catch (error) {
    return errorJson("Failed to load cron data", error);
  }
}
