"use client";

import { useMemo, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Coffee,
  ShieldAlert,
  Timer,
  Zap,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { formatDuration, formatRelative } from "@/lib/format";
import { useRuns, useScores, useHealth } from "@/hooks/use-api";
import { useLiveStore } from "@/stores/live-store";
import { cn } from "@/lib/utils";

type RunLike = {
  runId?: string;
  taskPreview?: string;
  summaryPreview?: string;
  primaryStatus?: string;
  doneStatus?: string;
  lastAt?: number;
  startedAt?: number;
  stuckFlag?: boolean;
  hasDlq?: boolean;
  hasHandlerErrors?: boolean;
};

type ActivityLike = {
  id?: string;
  runId?: string;
  title?: string;
  phase?: string;
  timestamp?: number;
  description?: string;
};

function statusPill(status?: string) {
  const s = (status ?? "").toLowerCase();

  if (s.includes("running") || s.includes("processing") || s.includes("active")) {
    return <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/30">Running</Badge>;
  }
  if (s.includes("complete") || s.includes("success") || s.includes("done") || s.includes("ok")) {
    return <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">Completed</Badge>;
  }
  if (s.includes("stuck") || s.includes("timeout")) {
    return <Badge className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30">Stuck</Badge>;
  }
  if (s.includes("fail") || s.includes("error")) {
    return <Badge className="bg-red-500/15 text-red-300 border-red-500/30">Failed</Badge>;
  }
  return <Badge variant="secondary">Queued</Badge>;
}

function metricCard(props: {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  tone?: "good" | "warn" | "bad" | "neutral";
}) {
  const toneClass =
    props.tone === "good"
      ? "border-emerald-500/30"
      : props.tone === "warn"
        ? "border-yellow-500/30"
        : props.tone === "bad"
          ? "border-red-500/30"
          : "border-border";

  return (
    <Card className={cn("bg-card", toneClass)}>
      <CardHeader className="pb-3">
        <CardDescription className="flex items-center justify-between text-xs uppercase tracking-wide">
          <span>{props.title}</span>
          <span className="text-muted-foreground">{props.icon}</span>
        </CardDescription>
        <CardTitle className="text-2xl">{props.value}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-xs text-muted-foreground">{props.subtitle}</CardContent>
    </Card>
  );
}

export default function HomePage() {
  const runsQuery = useRuns() as any;
  const scoresQuery = useScores() as any;
  const healthQuery = useHealth() as any;

  const runs: RunLike[] = runsQuery?.data?.runs ?? [];
  const scoreEntries: any[] = scoresQuery?.data?.entries ?? [];
  const scoreTotals = scoresQuery?.data?.totals;
  const health = healthQuery?.data;

  const liveRunsRaw = useLiveStore((s: any) => s.runs);

  const liveRuns = useMemo(() => {
    if (liveRunsRaw instanceof Map) return Array.from(liveRunsRaw.values()) as any[];
    if (Array.isArray(liveRunsRaw)) return liveRunsRaw as any[];
    if (liveRunsRaw && typeof liveRunsRaw === "object") return Object.values(liveRunsRaw as Record<string, any>);
    return [] as any[];
  }, [liveRunsRaw]);

  const recentActivities = useMemo(() => {
    const flat: ActivityLike[] = liveRuns.flatMap((run: any) => {
      const list = Array.isArray(run?.activities) ? run.activities : [];
      return list.map((a: any) => ({ ...a, runId: a?.runId ?? run?.runId }));
    });

    return flat
      .filter((a) => Number.isFinite(a.timestamp))
      .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
      .slice(0, 5);
  }, [liveRuns]);

  const activeTasks = runs.filter((run) => (run.primaryStatus ?? "").toLowerCase() === "running").length;

  const successRate = useMemo(() => {
    if (scoreEntries.length === 0) return 0;
    const successCount = scoreEntries.filter((entry: any) => {
      const status = String(entry?.status ?? "").toLowerCase();
      return status.includes("ok") || status.includes("success") || status.includes("complete");
    }).length;
    return Math.round((successCount / scoreEntries.length) * 100);
  }, [scoreEntries]);

  const avgDurationMs = useMemo(() => {
    const durations = scoreEntries
      .map((entry: any) => Number(entry?.stats?.durationMs ?? 0))
      .filter((value: number) => Number.isFinite(value) && value > 0);

    if (durations.length === 0) return 0;
    return Math.round(durations.reduce((sum, n) => sum + n, 0) / durations.length);
  }, [scoreEntries]);

  const healthSignal = useMemo(() => {
    const current = health?.current;
    const textBlob = JSON.stringify(current ?? {}).toLowerCase();
    if (textBlob.includes("critical") || textBlob.includes("down") || textBlob.includes("error")) {
      return { label: "Needs Attention", tone: "bad" as const };
    }
    if (textBlob.includes("warn") || textBlob.includes("degraded")) {
      return { label: "Watch", tone: "warn" as const };
    }
    return { label: "Healthy", tone: "good" as const };
  }, [health]);

  const failedRuns = runs.filter((run) => {
    const status = (run.primaryStatus ?? run.doneStatus ?? "").toLowerCase();
    return status.includes("fail") || status.includes("error") || run.hasDlq || run.hasHandlerErrors;
  });

  const stuckRuns = runs.filter((run) => {
    const status = (run.primaryStatus ?? "").toLowerCase();
    return run.stuckFlag || status.includes("stuck") || status.includes("timeout");
  });

  const healthAlerts = healthSignal.tone !== "good" ? [healthSignal.label] : [];

  const recentTasks = [...runs]
    .sort((a, b) => (b.lastAt ?? 0) - (a.lastAt ?? 0))
    .slice(0, 10);

  const isLoading = Boolean(runsQuery?.isLoading || scoresQuery?.isLoading || healthQuery?.isLoading);

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8 space-y-6">
      <section className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-semibold">Control Center</h1>
        <p className="text-sm text-muted-foreground">One place to track tasks, quality, and system wellbeing.</p>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metricCard({
          title: "Active Tasks",
          value: isLoading ? "…" : String(activeTasks),
          subtitle: isLoading ? "Checking live work" : `${runs.length} tasks in recent view`,
          icon: <Activity className="size-4" />,
          tone: activeTasks > 0 ? "neutral" : "good",
        })}

        {metricCard({
          title: "Success Rate",
          value: isLoading ? "…" : `${successRate}%`,
          subtitle: isLoading ? "Reading score history" : `${scoreEntries.length} tasks scored`,
          icon: <CheckCircle2 className="size-4" />,
          tone: successRate >= 80 ? "good" : successRate >= 60 ? "warn" : "bad",
        })}

        {metricCard({
          title: "Avg Duration",
          value: isLoading ? "…" : avgDurationMs > 0 ? formatDuration(avgDurationMs) : "—",
          subtitle: isLoading ? "Calculating timing" : "Based on scored tasks",
          icon: <Timer className="size-4" />,
          tone: "neutral",
        })}

        {metricCard({
          title: "System Health",
          value: isLoading ? "…" : healthSignal.label,
          subtitle: isLoading ? "Checking services" : "Realtime health snapshot",
          icon: <ShieldAlert className="size-4" />,
          tone: healthSignal.tone,
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Latest live updates from active assistants.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivities.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Coffee className="size-4" />
                <span>No live activity yet.</span>
              </div>
            ) : (
              recentActivities.map((activity) => (
                <div key={activity.id ?? `${activity.runId}-${activity.timestamp}`} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{activity.title ?? "Task update"}</p>
                    <Badge variant="secondary" className="capitalize">{activity.phase ?? "working"}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground truncate">
                    {activity.description ?? "In progress"}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {activity.timestamp ? formatRelative(activity.timestamp) : "just now"}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Attention Alerts</CardTitle>
            <CardDescription>Things that may need a quick check.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {failedRuns.length === 0 && stuckRuns.length === 0 && healthAlerts.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-emerald-300">
                <CheckCircle2 className="size-4" />
                <span>Everything looks steady right now.</span>
              </div>
            ) : (
              <>
                {failedRuns.slice(0, 3).map((run) => (
                  <div key={`failed-${run.runId}`} className="rounded-md border border-red-500/30 bg-red-500/10 p-3">
                    <p className="text-sm font-medium text-red-200">Task failed</p>
                    <p className="text-xs text-red-100/80 truncate">{run.taskPreview ?? run.summaryPreview ?? run.runId}</p>
                  </div>
                ))}

                {stuckRuns.slice(0, 3).map((run) => (
                  <div key={`stuck-${run.runId}`} className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3">
                    <p className="text-sm font-medium text-yellow-200">Task appears stuck</p>
                    <p className="text-xs text-yellow-100/80 truncate">{run.taskPreview ?? run.summaryPreview ?? run.runId}</p>
                  </div>
                ))}

                {healthAlerts.map((alert, idx) => (
                  <div key={`health-${idx}`} className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3">
                    <p className="text-sm font-medium text-yellow-200">System warning</p>
                    <p className="text-xs text-yellow-100/80">{alert}</p>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="size-4" />
            Recent Tasks
          </CardTitle>
          <CardDescription>Latest 10 tasks in progress or recently completed.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">
              <Shimmer>Loading task list…</Shimmer>
            </div>
          ) : recentTasks.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Coffee className="size-4" />
              <span>No tasks to show yet.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTasks.map((run, idx) => (
                <div key={run.runId ?? idx} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-sm truncate max-w-[70%]">
                      {run.taskPreview ?? run.summaryPreview ?? "Untitled task"}
                    </p>
                    {statusPill(run.primaryStatus ?? run.doneStatus)}
                  </div>

                  <Separator className="my-2" />

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span>ID: {run.runId ?? "—"}</span>
                    <span>Updated: {run.lastAt ? formatRelative(run.lastAt) : "—"}</span>
                    <span>
                      Duration:{" "}
                      {run.startedAt && run.lastAt ? formatDuration(Math.max(0, run.lastAt - run.startedAt)) : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {scoreTotals ? (
        <p className="text-xs text-muted-foreground">
          Snapshot: quality {scoreTotals.avgQuality ?? "—"}/10 · efficiency {scoreTotals.avgEfficiency ?? "—"}/10.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <AlertTriangle className="size-3" />
          Score history is still warming up.
        </p>
      )}
    </main>
  );
}
