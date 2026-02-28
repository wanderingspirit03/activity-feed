"use client";

import { useMemo } from "react";
import {
  Activity,
  Bot,
  Clock3,
  Coffee,
  Hammer,
  Sparkles,
} from "lucide-react";

import { ConnectionStatus } from "@/components/feed/ConnectionStatus";
import { RunCard } from "@/components/feed/RunCard";
import { ActivityCard } from "@/components/feed/ActivityCard";
import { PhaseTracker } from "@/components/feed/PhaseTracker";
import { SpecialistAvatar } from "@/components/feed/SpecialistAvatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tool,
  ToolContent,
  ToolHeader,
} from "@/components/ai-elements/tool";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { CodeBlock } from "@/components/ai-elements/code-block";
import { cn } from "@/lib/utils";
import { formatDuration, formatRelative } from "@/lib/format";
import { useLiveStore } from "@/stores/live-store";

type ActivityLike = {
  id?: string;
  runId?: string;
  title?: string;
  description?: string;
  timestamp?: number;
  phase?: string;
  isActive?: boolean;
  toolName?: string;
  toolArgs?: string;
};

type LiveRunLike = {
  runId?: string;
  task?: string;
  phase?: string;
  progress?: number;
  startedAt?: number;
  updatedAt?: number;
  activities?: ActivityLike[];
  specialist?: string;
};

function toArrayRuns(raw: unknown): LiveRunLike[] {
  if (raw instanceof Map) return Array.from(raw.values()) as LiveRunLike[];
  if (Array.isArray(raw)) return raw as LiveRunLike[];
  if (raw && typeof raw === "object") return Object.values(raw as Record<string, LiveRunLike>);
  return [];
}

function toolStateFromActivity(activity: ActivityLike) {
  const phase = String(activity.phase ?? "").toLowerCase();
  if (phase.includes("error") || phase.includes("fail")) return "output-error" as const;
  if (activity.isActive) return "input-available" as const;
  return "output-available" as const;
}

function runStatusBadge(run: LiveRunLike) {
  const phase = String(run.phase ?? "").toLowerCase();
  if (phase.includes("error")) return <Badge className="bg-red-500/15 text-red-300 border-red-500/30">Failed</Badge>;
  if (phase.includes("complete")) return <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">Completed</Badge>;
  if (phase.includes("review")) return <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/30">Reviewing</Badge>;
  if (phase.includes("understand")) return <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/30">Thinking</Badge>;
  return <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/30">Running</Badge>;
}

function ActiveRunDetail({ run }: { run: LiveRunLike }) {
  const activities = (run.activities ?? []).sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  const latestTimestamp = activities[0]?.timestamp ?? run.updatedAt;
  const durationMs =
    Number.isFinite(run.startedAt) && Number.isFinite(latestTimestamp)
      ? Math.max(0, (latestTimestamp as number) - (run.startedAt as number))
      : undefined;

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 min-w-0">
            <CardTitle className="text-lg truncate">{run.task ?? "Task in progress"}</CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Hammer className="size-3" />
                {activities.length} steps
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock3 className="size-3" />
                {durationMs ? formatDuration(durationMs) : "just started"}
              </span>
              <span>Updated {latestTimestamp ? formatRelative(latestTimestamp) : "now"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {run.specialist ? <SpecialistAvatar role={run.specialist} /> : null}
            {runStatusBadge(run)}
          </div>
        </div>

        <div className="pt-2">
          {/* cast to satisfy existing feed component's strict phase union */}
          <PhaseTracker currentPhase={(run.phase as any) ?? "working"} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <Reasoning defaultOpen={false}>
          <ReasoningTrigger />
          <ReasoningContent>
            <p>
              Live trace is updating in real time. The highlighted step below is the latest activity from this task.
            </p>
          </ReasoningContent>
        </Reasoning>

        <div className="space-y-2">
          {activities.length === 0 ? (
            <div className="flex items-center gap-2 rounded-md border p-3 text-sm text-muted-foreground">
              <Coffee className="size-4" />
              Waiting for the first update…
            </div>
          ) : (
            activities.map((activity, idx) => {
              const isLatest = idx === 0;
              const activityTs = activity.timestamp ?? run.updatedAt ?? run.startedAt;

              return (
                <div
                  key={activity.id ?? `${run.runId}-${idx}`}
                  className={cn(
                    "rounded-md border p-3",
                    isLatest && "border-l-4 border-l-blue-500 bg-blue-500/5",
                  )}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{activity.title ?? "Step update"}</p>
                      <p className="text-xs text-muted-foreground">{activityTs ? formatRelative(activityTs) : "now"}</p>
                    </div>
                    {isLatest ? <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/30">Current</Badge> : null}
                  </div>

                  <Tool defaultOpen={isLatest}>
                    <ToolHeader
                      title={activity.toolName ?? activity.title ?? "Tool step"}
                      state={toolStateFromActivity(activity)}
                      meta={<span className="text-[11px] text-muted-foreground">{activityTs ? formatRelative(activityTs) : "now"}</span>}
                    />
                    <ToolContent>
                      {activity.description ? <p className="text-sm text-muted-foreground">{activity.description}</p> : null}
                      {activity.toolArgs ? (
                        <CodeBlock code={activity.toolArgs} language="json" />
                      ) : (
                        <CodeBlock
                          code={JSON.stringify(
                            {
                              runId: run.runId,
                              phase: activity.phase,
                              timestamp: activityTs,
                            },
                            null,
                            2,
                          )}
                          language="json"
                        />
                      )}
                    </ToolContent>
                  </Tool>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function LivePage() {
  const runsRaw = useLiveStore((s: any) => s.runs);
  const isConnected = useLiveStore((s: any) => s.isConnected);

  const runs = useMemo(() => {
    const list = toArrayRuns(runsRaw);
    return [...list].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  }, [runsRaw]);

  const activeRuns = runs.filter((run) => {
    const phase = String(run.phase ?? "").toLowerCase();
    return !phase.includes("complete") && !phase.includes("error");
  });

  const recentActivity = useMemo(() => {
    const items: ActivityLike[] = runs.flatMap((run) =>
      (run.activities ?? []).map((a) => ({ ...a, runId: a.runId ?? run.runId })),
    );
    return items
      .filter((a) => Number.isFinite(a.timestamp))
      .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
      .slice(0, 12);
  }, [runs]);

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8 space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">Live Activity</h1>
          <p className="text-sm text-muted-foreground">Watch tasks unfold in real time.</p>
        </div>

        <div className="flex items-center gap-3 rounded-md border px-3 py-2">
          <ConnectionStatus isConnected={Boolean(isConnected)} />
          <span className="text-sm">{isConnected ? "Connected" : "Reconnecting"}</span>
          <Badge variant="secondary">{activeRuns.length} active</Badge>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {activeRuns.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Coffee className="size-4" />
                  No active tasks right now.
                </div>
              </CardContent>
            </Card>
          ) : (
            activeRuns.map((run) => <ActiveRunDetail key={run.runId ?? Math.random()} run={run} />)
          )}
        </div>

        <Card className="xl:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="size-4" />
              Activity Stream
            </CardTitle>
            <CardDescription>Newest events across all active tasks.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[560px] pr-2">
              <div className="space-y-2">
                {recentActivity.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    <Shimmer>Waiting for activity…</Shimmer>
                  </div>
                ) : (
                  recentActivity.map((activity, idx) => (
                    <div key={activity.id ?? `${activity.runId}-${idx}`}>
                      <ActivityCard activity={activity as any} />
                      {idx < recentActivity.length - 1 ? <Separator className="my-2" /> : null}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </section>

      {/* Reuse existing feed RunCard pattern for quick compact previews */}
      {runs.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Bot className="size-4" />
            Compact task previews
          </h2>
          <div className="space-y-4">
            {runs.slice(0, 2).map((run) => (
              <RunCard key={`preview-${run.runId}`} run={run as any} />
            ))}
          </div>
        </section>
      ) : null}

      <footer className="pt-2 text-xs text-muted-foreground flex items-center gap-2">
        <Sparkles className="size-3" />
        Real-time feed uses the live store directly (no polling).
      </footer>
    </main>
  );
}
