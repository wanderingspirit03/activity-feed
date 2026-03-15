"use client";

import { useActivityFeed } from "@/hooks/useActivityFeed";
import { ConnectionStatus } from "@/components/feed/ConnectionStatus";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tool,
  ToolHeader,
  ToolContent,
} from "@/components/ai-elements/tool";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@/components/ai-elements/reasoning";
import {
  Task,
  TaskTrigger,
  TaskContent,
  TaskItem,
} from "@/components/ai-elements/task";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Activity,
  Zap,
  Brain,
  Eye,
  Box,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityItem, RunOverview, RunPhase } from "@/lib/types";

/* ── helpers ───────────────────────────────────────── */

function getToolState(a: ActivityItem) {
  if (a.isActive) return "input-available" as const;
  if (a.phase === "complete" || !a.isActive) return "output-available" as const;
  if (a.phase === "error") return "output-error" as const;
  return "input-streaming" as const;
}

/** Map icon string from server to check if it's a tool-type activity */
function isToolActivity(a: ActivityItem) {
  const toolIcons = ["terminal", "search", "file-text", "files", "pen-line", "folder-search", "globe", "send", "folder", "monitor", "microscope", "brain", "save", "bookmark", "message-circle", "sparkles", "check"];
  return a.toolName || toolIcons.includes(a.icon || "");
}

function isThinkingActivity(a: ActivityItem) {
  return a.icon === "brain" && !a.toolName;
}

function isSubagentActivity(a: ActivityItem) {
  return a.icon === "users" || a.toolName === "run_subagent";
}

function phaseLabel(phase: RunPhase) {
  switch (phase) {
    case "queued": return "Queued";
    case "understanding": return "Understanding";
    case "working": return "Working";
    case "reviewing": return "Reviewing";
    case "complete": return "Complete";
    case "error": return "Error";
  }
}

function phaseColor(phase: RunPhase) {
  switch (phase) {
    case "queued": return "text-zinc-400";
    case "understanding": return "text-blue-400";
    case "working": return "text-amber-400";
    case "reviewing": return "text-purple-400";
    case "complete": return "text-emerald-400";
    case "error": return "text-red-400";
  }
}

function elapsed(startedAt: number) {
  const s = Math.floor((Date.now() - startedAt) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function truncateText(text: string, max = 100) {
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}

/* ── Tool Activity Card ──────────────────────────── */

function ToolCard({ activity, isLatest }: { activity: ActivityItem; isLatest: boolean }) {
  const toolName = activity.toolName || "tool";
  const state = getToolState(activity);
  // Show tool name + args preview in header for at-a-glance readability
  const argsPreview = activity.toolArgs ? truncateText(activity.toolArgs, 40) : "";
  const displayTitle = argsPreview ? `${toolName} — ${argsPreview}` : toolName;

  return (
    <Tool defaultOpen={isLatest && activity.isActive}>
      <ToolHeader
        type="dynamic-tool"
        state={state}
        toolName={toolName}
        title={displayTitle}
      />
      {(activity.toolArgs || activity.description) && (
        <ToolContent>
          {activity.description && activity.description !== toolName && (
            <p className="text-xs text-muted-foreground mb-2">{activity.description}</p>
          )}
          {activity.toolArgs && (
            <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded bg-muted/50 p-2 text-xs text-muted-foreground font-mono">
              {truncateText(activity.toolArgs, 500)}
            </pre>
          )}
        </ToolContent>
      )}
    </Tool>
  );
}

/* ── Thinking/Reasoning Card ─────────────────────── */

function ThinkingCard({ activity }: { activity: ActivityItem }) {
  const dur = activity.isActive ? undefined : Math.max(1, Math.floor((Date.now() - activity.timestamp) / 1000));

  return (
    <Reasoning
      isStreaming={activity.isActive || false}
      duration={dur}
      defaultOpen={activity.isActive}
    >
      <ReasoningTrigger />
      <ReasoningContent>
        {activity.description || activity.title}
      </ReasoningContent>
    </Reasoning>
  );
}

/* ── Subagent Card ───────────────────────────────── */

function SubagentCard({ activity, isLatest }: { activity: ActivityItem; isLatest: boolean }) {
  return (
    <Task defaultOpen={isLatest}>
      <TaskTrigger title={activity.title} />
      <TaskContent>
        {activity.toolArgs && (
          <TaskItem>
            <span className="text-xs text-muted-foreground">{truncateText(activity.toolArgs, 200)}</span>
          </TaskItem>
        )}
        {activity.isActive && (
          <TaskItem>
            <Shimmer duration={2} className="text-xs">Running...</Shimmer>
          </TaskItem>
        )}
        {!activity.isActive && (
          <TaskItem>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle className="size-3" /> Completed
            </span>
          </TaskItem>
        )}
      </TaskContent>
    </Task>
  );
}

/* ── Active Run View ─────────────────────────────── */

// Merge consecutive tool.start + tool.done for same tool into one entry
function deduplicateActivities(activities: ActivityItem[]): ActivityItem[] {
  const result: ActivityItem[] = [];
  for (let i = 0; i < activities.length; i++) {
    const current = activities[i];
    const next = activities[i + 1];
    // If this is an active tool and the next is the same tool completed, merge
    if (current.toolName && next?.toolName === current.toolName
        && current.isActive && !next.isActive
        && next.timestamp - current.timestamp < 30000) {
      result.push({ ...next, toolArgs: current.toolArgs || next.toolArgs });
      i++; // skip the next one
    } else {
      result.push(current);
    }
  }
  return result;
}

function ActiveRunView({ run }: { run: RunOverview }) {
  const activities = deduplicateActivities([...run.activities]);
  const toolCount = activities.filter(a => a.toolName).length;

  return (
    <div className="space-y-5">
      {/* Run header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-medium text-foreground leading-snug min-w-0 flex-1">
            {truncateText(run.task, 140)}
          </h2>
          <Badge variant="outline" className="shrink-0 gap-1.5 border-amber-500/30 text-amber-400 text-[10px]">
            <Activity className="h-3 w-3 animate-pulse" />
            Live
          </Badge>
        </div>

        {/* Phase + progress */}
        <div className="flex items-center gap-3">
          <span className={cn("text-xs font-medium flex items-center gap-1.5", phaseColor(run.phase))}>
            <Zap className="size-3" />
            {phaseLabel(run.phase)}
          </span>
          <Progress value={run.progress} className="h-1 flex-1" />
          <span className="text-[11px] text-muted-foreground tabular-nums">{elapsed(run.startedAt)}</span>
        </div>

        {toolCount > 0 && (
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <Box className="size-3" /> {toolCount} tools
          </Badge>
        )}
      </div>

      {/* Shimmer for active phase */}
      {run.phase !== "complete" && run.phase !== "error" && (
        <Shimmer className="text-sm font-medium" duration={1.5}>
          {run.phase === "understanding"
            ? "Understanding the task..."
            : run.phase === "reviewing"
            ? "Reviewing the results..."
            : "Working on implementation..."}
        </Shimmer>
      )}

      {/* Activity stream */}
      <div className="space-y-1">
        {activities.map((a, i) => {
          const isLatest = i === activities.length - 1;

          if (isSubagentActivity(a)) {
            return <SubagentCard key={a.id} activity={a} isLatest={isLatest} />;
          }

          if (isThinkingActivity(a)) {
            return <ThinkingCard key={a.id} activity={a} />;
          }

          if (isToolActivity(a)) {
            return <ToolCard key={a.id} activity={a} isLatest={isLatest} />;
          }

          // Default line item
          return (
            <div key={a.id} className="flex items-center gap-2 py-1.5 text-sm text-muted-foreground">
              <div className={cn(
                "h-1.5 w-1.5 rounded-full shrink-0",
                a.isActive ? "bg-blue-400 animate-pulse" : "bg-zinc-600"
              )} />
              <span className="truncate">{a.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Completed Run Card ──────────────────────────── */

function CompletedRunCard({ run }: { run: RunOverview }) {
  const isError = run.phase === "error";
  const toolCount = run.activities.filter(a => a.toolName).length;

  return (
    <div className={cn(
      "group rounded-lg border p-3.5 transition-all hover:bg-muted/30",
      isError ? "border-red-500/20" : "border-border"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
            {truncateText(run.task, 100)}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              {isError ? <AlertTriangle className="size-3 text-red-400" /> : <CheckCircle className="size-3 text-emerald-400" />}
              {isError ? "Failed" : "Completed"}
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span>{toolCount} tools</span>
            <span className="text-muted-foreground/40">·</span>
            <span>{elapsed(run.startedAt)}</span>
            <span className="text-muted-foreground/40">·</span>
            <span>{timeAgo(run.updatedAt)}</span>
          </div>
        </div>
        <Progress
          value={100}
          className={cn("h-1 w-12 shrink-0 mt-1.5", isError ? "[&>div]:bg-red-400" : "[&>div]:bg-emerald-400")}
        />
      </div>
    </div>
  );
}

/* ── Empty State ─────────────────────────────────── */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/20">
        <Zap className="h-6 w-6 text-muted-foreground/40" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">No active runs</p>
      <p className="mt-1 text-xs text-muted-foreground/50">Activity will appear here when tasks are running</p>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────── */

export default function HomePage() {
  const { runs, isConnected } = useActivityFeed();

  const activeRuns = runs.filter(r => r.phase !== "complete" && r.phase !== "error");
  const completedRuns = runs.filter(r => r.phase === "complete" || r.phase === "error");
  const activeRun = activeRuns[0];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground">
              <Zap className="h-4 w-4 text-background" />
            </div>
            <span className="text-sm font-semibold tracking-tight">olo · activity</span>
          </div>
          <ConnectionStatus isConnected={isConnected} />
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {activeRun ? (
          <ActiveRunView run={activeRun} />
        ) : (
          <EmptyState />
        )}

        {completedRuns.length > 0 && (
          <>
            <Separator className="my-8" />
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <CheckCircle className="size-3" />
                Recent
              </h3>
              <div className="space-y-2">
                {completedRuns.map(run => (
                  <CompletedRunCard key={run.runId} run={run} />
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 py-3">
        <div className="mx-auto max-w-2xl px-4">
          <p className="text-center text-[10px] text-muted-foreground/40">
            olo-din · real-time agent telemetry
          </p>
        </div>
      </footer>
    </div>
  );
}
