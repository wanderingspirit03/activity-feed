import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const redis = getRedis();
    
    // Cron job definitions
    const jobsRaw = await redis.get("dashboard:cron:jobs");
    const jobs = jobsRaw ? JSON.parse(jobsRaw) : [];
    
    // Last run info per job
    const lastRunHash = await redis.hgetall("dashboard:cron:lastrun");
    
    // Merge jobs with last-run data
    const merged = jobs.map((job: any) => {
      const lastRunRaw = lastRunHash[job.slug];
      let lastRun = null;
      if (lastRunRaw) {
        try { lastRun = JSON.parse(lastRunRaw); } catch {}
      }
      return { ...job, lastRun };
    });
    
    const lastPublished = await redis.get("dashboard:lastPublished");
    
    return NextResponse.json({
      jobs: merged,
      lastPublished,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load cron data", detail: String(error) },
      { status: 500 },
    );
  }
}
