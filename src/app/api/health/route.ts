import { NextResponse } from "next/server";
import { errorJson } from "@/lib/api-error";
import { apiFetch } from "@/lib/api-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HealthCheck = {
  name: string;
  status: string;
  details?: string;
  data?: Record<string, unknown>;
};

type ApiHealth = {
  overall: string;
  checks: HealthCheck[];
  timestamp: string;
};

export async function GET() {
  try {
    const data = await apiFetch<ApiHealth>("/api/health");

    // Transform to the shape the old frontend expects
    const checks = data.checks ?? [];
    const sqliteCheck = checks.find((c) => c.name === "sqlite");
    const diskCheck = checks.find((c) => c.name === "disk");
    const processCheck = checks.find((c) => c.name === "processes");
    const dbFileCheck = checks.find((c) => c.name === "database-file");

    const allOk = checks.every((c) => c.status === "ok");
    const overallStatus = allOk ? "healthy" : data.overall === "critical" ? "degraded" : data.overall;

    return NextResponse.json({
      current: {
        status: overallStatus,
        metrics: {
          status: overallStatus,
          database: {
            status: sqliteCheck?.status === "ok" ? "connected" : "disconnected",
            details: sqliteCheck?.details,
          },
          disk: {
            status: diskCheck?.status ?? "unknown",
            percent: diskCheck?.data?.diskPercent ?? 0,
          },
          processes: {
            count: processCheck?.data?.count ?? 0,
            status: processCheck?.status ?? "unknown",
          },
          dbSize: dbFileCheck?.data?.dbSizeBytes
            ? `${Math.round((dbFileCheck.data.dbSizeBytes as number) / 1024 / 1024)} MB`
            : "unknown",
        },
        timestamp: data.timestamp,
      },
      history: [],
      system: {
        dbSize: dbFileCheck?.data?.dbSizeBytes
          ? `${Math.round((dbFileCheck.data.dbSizeBytes as number) / 1024 / 1024)} MB`
          : "unknown",
        processCount: processCheck?.data?.count ?? 0,
        diskPercent: diskCheck?.data?.diskPercent ?? 0,
      },
      processes: [],
      lastPublished: data.timestamp,
    });
  } catch (error) {
    return errorJson("Failed to load health data", error);
  }
}
