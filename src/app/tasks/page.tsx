"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Coffee,
  Filter,
  RefreshCcw,
  Search,
  Wrench,
} from "lucide-react";

import { useActors, useDlq, useRuns } from "@/hooks/use-api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tool,
  ToolContent,
  ToolHeader,
} from "@/components/ai-elements/tool";
import { CodeBlock } from "@/components/ai-elements/code-block";
import { formatDuration, formatRelative } from "@/lib/format";

type RunLike = {
  runId?: string;
  taskPreview?: string;
  summaryPreview?: string;
  primaryStatus?: string;
  doneStatus?: string;
  lastAt?: number;
  startedAt?: number;
  lastToolName?: string;
  lastEventType?: string;
  lastActor?: string;
  hasDlq?: boolean;
  hasHandlerErrors?: boolean;
  stuckFlag?: boolean;
};

type DlqLike = {
  id?: string;
  runId?: string;
  actor?: string;
  messageType?: string;
  reason?: string;
  ts?: number;
};

type ActorLike = {
  address?: string;
  capabilities?: string[];
  updatedAt?: number;
  status?: string;
};

type StatusFilter = "all" | "running" | "completed" | "failed" | "stuck";

function normalizeStatus(run: RunLike): "running" | "completed" | "failed" | "stuck" {
  const status = String(run.primaryStatus ?? run.doneStatus ?? "").toLowerCase();
  if (run.stuckFlag || status.includes("stuck") || status.includes("timeout")) return "stuck";
  if (run.hasDlq || run.hasHandlerErrors || status.includes("fail") || status.includes("error")) return "failed";
  if (status.includes("complete") || status.includes("done") || status.includes("ok") || status.includes("success")) return "completed";
  return "running";
}

function statusBadge(status: ReturnType<typeof normalizeStatus>) {
  if (status === "running") return <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/30">Running</Badge>;
  if (status === "completed") return <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">Completed</Badge>;
  if (status === "failed") return <Badge className="bg-red-500/15 text-red-300 border-red-500/30">Failed</Badge>;
  return <Badge className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30">Stuck</Badge>;
}

export default function TasksPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const runsQuery = useRuns() as any;
  const dlqQuery = useDlq() as any;
  const actorsQuery = useActors() as any;

  const runs: RunLike[] = runsQuery?.data?.runs ?? [];
  const failedTasks: DlqLike[] = dlqQuery?.data?.entries ?? [];
  const assistants: ActorLike[] = actorsQuery?.data?.actors ?? [];

  const filteredRuns = useMemo(() => {
    const q = search.trim().toLowerCase();

    return runs
      .filter((run) => {
        if (statusFilter === "all") return true;
        return normalizeStatus(run) === statusFilter;
      })
      .filter((run) => {
        if (!q) return true;
        return [run.taskPreview, run.summaryPreview, run.runId, run.lastActor, run.lastToolName]
          .filter(Boolean)
          .join("\n")
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => (b.lastAt ?? 0) - (a.lastAt ?? 0));
  }, [runs, search, statusFilter]);

  const filteredFailed = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return failedTasks;

    return failedTasks.filter((entry) =>
      [entry.reason, entry.actor, entry.messageType, entry.runId, entry.id]
        .filter(Boolean)
        .join("\n")
        .toLowerCase()
        .includes(q),
    );
  }, [failedTasks, search]);

  const filteredAssistants = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assistants;

    return assistants.filter((assistant) =>
      [assistant.address, ...(assistant.capabilities ?? [])]
        .filter(Boolean)
        .join("\n")
        .toLowerCase()
        .includes(q),
    );
  }, [assistants, search]);

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8 space-y-6">
      <section>
        <h1 className="text-2xl md:text-3xl font-semibold">Tasks</h1>
        <p className="text-sm text-muted-foreground">Track all tasks, review failures, and view assistant activity.</p>
      </section>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search tasks, errors, assistants..."
                className="w-full rounded-md border bg-background px-9 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted-foreground" />
              <select
                className="rounded-md border bg-background px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              >
                <option value="all">All statuses</option>
                <option value="running">Running</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="stuck">Stuck</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all-tasks" className="space-y-4">
        <TabsList className="grid h-auto grid-cols-1 gap-1 sm:grid-cols-3">
          <TabsTrigger value="all-tasks">All Tasks</TabsTrigger>
          <TabsTrigger value="failed-tasks">Failed Tasks</TabsTrigger>
          <TabsTrigger value="assistants">By Assistant</TabsTrigger>
        </TabsList>

        <TabsContent value="all-tasks">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">All Tasks</CardTitle>
              <CardDescription>Open and recently completed work with quick trace previews.</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredRuns.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Coffee className="size-4" />
                  No tasks match this filter.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRuns.map((run, idx) => {
                    const status = normalizeStatus(run);
                    const durationMs =
                      Number.isFinite(run.startedAt) && Number.isFinite(run.lastAt)
                        ? Math.max(0, (run.lastAt as number) - (run.startedAt as number))
                        : undefined;

                    return (
                      <Card key={run.runId ?? idx} className="border-border/70">
                        <CardContent className="pt-5 space-y-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium truncate">{run.taskPreview ?? run.summaryPreview ?? "Untitled task"}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {run.lastAt ? `Updated ${formatRelative(run.lastAt)}` : "Recently created"}
                              </p>
                            </div>
                            {statusBadge(status)}
                          </div>

                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                            <span>ID: {run.runId ?? "—"}</span>
                            <span>{durationMs ? `Duration ${formatDuration(durationMs)}` : "Duration not available"}</span>
                            <span>Assistant: {run.lastActor ?? "—"}</span>
                          </div>

                          <Tool defaultOpen={false}>
                            <ToolHeader
                              title="Tool trace"
                              toolName={run.lastToolName ?? "recent-tool"}
                              state={status === "failed" ? "output-error" : status === "running" ? "input-available" : "output-available"}
                              meta={<span className="text-[11px] text-muted-foreground">{run.lastEventType ?? "latest event"}</span>}
                            />
                            <ToolContent>
                              <CodeBlock
                                language="json"
                                code={JSON.stringify(
                                  {
                                    runId: run.runId,
                                    task: run.taskPreview,
                                    status,
                                    lastTool: run.lastToolName,
                                    lastEventType: run.lastEventType,
                                    lastActor: run.lastActor,
                                  },
                                  null,
                                  2,
                                )}
                              />
                            </ToolContent>
                          </Tool>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="failed-tasks">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Failed Tasks</CardTitle>
              <CardDescription>Tasks that need attention with clear reasons.</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredFailed.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Coffee className="size-4" />
                  No failed tasks right now.
                </div>
              ) : (
                <ScrollArea className="h-[560px] pr-2">
                  <div className="space-y-3">
                    {filteredFailed.map((entry, idx) => (
                      <Card key={entry.id ?? idx} className="border-red-500/30 bg-red-500/5">
                        <CardContent className="pt-5 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-red-200">{entry.reason ?? "Task failed for an unknown reason"}</p>
                              <p className="text-xs text-red-100/70 mt-1">
                                {entry.ts ? `Reported ${formatRelative(entry.ts)}` : "Reported recently"}
                              </p>
                            </div>
                            <Badge className="bg-red-500/15 text-red-300 border-red-500/30">Failed</Badge>
                          </div>

                          <div className="grid gap-1 text-xs text-muted-foreground md:grid-cols-2">
                            <p>Task ID: {entry.runId ?? "—"}</p>
                            <p>Assistant: {entry.actor ?? "—"}</p>
                            <p>Message type: {entry.messageType ?? "—"}</p>
                            <p>Entry ID: {entry.id ?? "—"}</p>
                          </div>

                          <Separator />

                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                          >
                            <RefreshCcw className="size-3" />
                            Retry (coming soon)
                          </button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assistants">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assistants</CardTitle>
              <CardDescription>See who is active and what each assistant can do.</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredAssistants.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Coffee className="size-4" />
                  No assistants found.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAssistants.map((assistant, idx) => (
                    <Card key={assistant.address ?? idx} className="border-border/70">
                      <CardContent className="pt-5">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{assistant.address ?? "Unknown assistant"}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {assistant.updatedAt ? `Last active ${formatRelative(assistant.updatedAt)}` : "Last active time not available"}
                            </p>
                          </div>

                          <Badge
                            className={
                              String(assistant.status ?? "").toLowerCase() === "alive"
                                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                : "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
                            }
                          >
                            {String(assistant.status ?? "stale").toLowerCase() === "alive" ? "Active" : "Idle"}
                          </Badge>
                        </div>

                        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                          <Bot className="size-3" />
                          Capabilities
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(assistant.capabilities ?? []).length > 0 ? (
                            assistant.capabilities?.map((capability) => (
                              <Badge key={capability} variant="secondary" className="text-[11px]">
                                <Wrench className="mr-1 size-3" />
                                {capability}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">No capabilities listed</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {(runsQuery?.isLoading || dlqQuery?.isLoading || actorsQuery?.isLoading) ? (
        <p className="text-xs text-muted-foreground inline-flex items-center gap-2">
          <AlertTriangle className="size-3" />
          Loading the latest task view…
        </p>
      ) : null}
    </main>
  );
}
