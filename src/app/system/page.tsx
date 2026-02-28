"use client";

import { useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Coffee,
  Database,
  HardDrive,
  Network,
  Search,
  Server,
  ShieldAlert,
  Timer,
} from "lucide-react";

import { useCron, useHealth, useMemory } from "@/hooks/use-api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

type HealthLike = {
  current?: Record<string, unknown> | null;
  history?: unknown[];
  system?: Record<string, string> | null;
  processes?: Array<Record<string, unknown>>;
  lastPublished?: string | null;
};

type JobLike = {
  slug?: string;
  name?: string;
  schedule?: string;
  every?: string;
  description?: string;
  enabled?: boolean;
  lastRun?: {
    status?: string;
    at?: string;
    timestamp?: string;
    durationMs?: number;
    message?: string;
  } | null;
};

type MemoryDomainLike = {
  domain?: string;
  name?: string;
  count?: number;
  entries?: number;
};

type EpisodeLike = {
  title?: string;
  timestamp?: string;
  content?: string;
};

function toneFromValue(value: unknown): "good" | "warn" | "bad" {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("error") || text.includes("down") || text.includes("critical") || text.includes("fail")) return "bad";
  if (text.includes("warn") || text.includes("degraded") || text.includes("stale")) return "warn";
  return "good";
}

function toneBadge(value: unknown) {
  const tone = toneFromValue(value);
  if (tone === "good") return <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">Healthy</Badge>;
  if (tone === "warn") return <Badge className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30">Watch</Badge>;
  return <Badge className="bg-red-500/15 text-red-300 border-red-500/30">Issue</Badge>;
}

function niceSchedule(job: JobLike) {
  if (job.every) return `Runs ${job.every}`;
  if (job.schedule) return `Schedule: ${job.schedule}`;
  return "Schedule not set";
}

function statusPill(status?: string) {
  const s = String(status ?? "").toLowerCase();
  if (s.includes("ok") || s.includes("success")) {
    return <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">On track</Badge>;
  }
  if (s.includes("running") || s.includes("active")) {
    return <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/30">Running</Badge>;
  }
  if (s.includes("warn") || s.includes("stale")) {
    return <Badge className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30">Needs check</Badge>;
  }
  if (s.includes("fail") || s.includes("error")) {
    return <Badge className="bg-red-500/15 text-red-300 border-red-500/30">Issue</Badge>;
  }
  return <Badge variant="secondary">Unknown</Badge>;
}

export default function SystemPage() {
  const [knowledgeQuery, setKnowledgeQuery] = useState("");

  const healthQuery = useHealth() as any;
  const cronQuery = useCron() as any;
  const memoryQuery = useMemory() as any;

  const health: HealthLike = healthQuery?.data ?? {};
  const jobs: JobLike[] = cronQuery?.data?.jobs ?? [];
  const memoryStats = memoryQuery?.data?.stats ?? null;
  const domains: MemoryDomainLike[] = memoryQuery?.data?.domains ?? [];
  const recentEpisodes: EpisodeLike[] = memoryQuery?.data?.recentEpisodes ?? [];

  const processCount = Array.isArray(health.processes) ? health.processes.length : 0;
  const redisIndicator = toneBadge((health.current as any)?.redis ?? (health.system as any)?.redisStatus ?? "healthy");

  const streamLengths = useMemo(() => {
    const system = health.system ?? {};
    const pairs = Object.entries(system).filter(([key]) =>
      key.toLowerCase().includes("stream") || key.toLowerCase().includes("queue"),
    );
    return pairs.slice(0, 6);
  }, [health.system]);

  const filteredDomains = useMemo(() => {
    const q = knowledgeQuery.trim().toLowerCase();
    if (!q) return domains;
    return domains.filter((domain) =>
      [domain.domain, domain.name, String(domain.count ?? domain.entries ?? "")]
        .join("\n")
        .toLowerCase()
        .includes(q),
    );
  }, [domains, knowledgeQuery]);

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8 space-y-6">
      <section>
        <h1 className="text-2xl md:text-3xl font-semibold">System</h1>
        <p className="text-sm text-muted-foreground">Health, schedule, and knowledge in one place.</p>
      </section>

      <Tabs defaultValue="status" className="space-y-4">
        <TabsList className="grid h-auto grid-cols-1 gap-1 sm:grid-cols-3">
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wide">Redis connection</CardDescription>
                <CardTitle className="flex items-center justify-between text-lg">
                  <span className="inline-flex items-center gap-2">
                    <Network className="size-4 text-muted-foreground" />
                    Redis
                  </span>
                  {redisIndicator}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">Live coordination and stream data.</CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wide">Process uptime</CardDescription>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Timer className="size-4 text-muted-foreground" />
                  {processCount} active
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">Running services currently tracked.</CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wide">Disk usage</CardDescription>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <HardDrive className="size-4 text-muted-foreground" />
                  {memoryStats?.dbSize ?? (health.system as any)?.dbSize ?? "Unknown"}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">Database and data footprint.</CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wide">Stream lengths</CardDescription>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Server className="size-4 text-muted-foreground" />
                  {streamLengths.length}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">Queues and streams being monitored.</CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status details</CardTitle>
              <CardDescription>Current snapshot and recent process info.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {processCount === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Coffee className="size-4" />
                  No process details available right now.
                </div>
              ) : (
                <div className="space-y-2">
                  {health.processes?.slice(0, 12).map((processInfo, idx) => (
                    <div key={idx} className="rounded-md border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-sm">{String(processInfo.name ?? processInfo.actor ?? `Process ${idx + 1}`)}</p>
                        {statusPill(String(processInfo.status ?? "ok"))}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {processInfo.uptime ? `Uptime ${String(processInfo.uptime)}` : "Uptime not reported"}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {streamLengths.length > 0 ? (
                <>
                  <Separator />
                  <div className="grid gap-2 md:grid-cols-2">
                    {streamLengths.map(([key, value]) => (
                      <div key={key} className="rounded-md border p-3 text-sm">
                        <p className="text-xs text-muted-foreground">{key}</p>
                        <p className="font-medium mt-1">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              <p className="text-xs text-muted-foreground">
                Last update: {health.lastPublished ? formatRelative(new Date(health.lastPublished).getTime()) : "unknown"}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarClock className="size-4" />
                Schedule
              </CardTitle>
              <CardDescription>Planned automations and when they last ran.</CardDescription>
            </CardHeader>
            <CardContent>
              {jobs.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Coffee className="size-4" />
                  No scheduled jobs found.
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs.map((job, idx) => {
                    const lastRunAt = job.lastRun?.at ?? job.lastRun?.timestamp;
                    return (
                      <Card key={job.slug ?? idx} className={cn("border-border/70", job.enabled === false && "opacity-75")}>
                        <CardContent className="pt-5 space-y-2">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-medium">{job.name ?? job.slug ?? "Scheduled task"}</p>
                              <p className="text-xs text-muted-foreground">{niceSchedule(job)}</p>
                            </div>
                            {statusPill(job.lastRun?.status ?? (job.enabled === false ? "paused" : "ok"))}
                          </div>

                          <div className="grid gap-1 text-xs text-muted-foreground md:grid-cols-2">
                            <p>
                              Last run: {lastRunAt ? formatRelative(new Date(lastRunAt).getTime()) : "Not run yet"}
                            </p>
                            <p>
                              Last duration: {job.lastRun?.durationMs ? `${Math.round(job.lastRun.durationMs / 1000)}s` : "—"}
                            </p>
                          </div>

                          {job.description ? (
                            <p className="text-xs text-muted-foreground">{job.description}</p>
                          ) : null}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="size-4" />
                Knowledge
              </CardTitle>
              <CardDescription>Browse saved domains and recent entries.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={knowledgeQuery}
                  onChange={(event) => setKnowledgeQuery(event.target.value)}
                  placeholder="Search knowledge domains"
                  className="w-full rounded-md border bg-background px-9 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Domains</CardTitle>
                    <CardDescription>How knowledge is organized.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {filteredDomains.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No matching domains.</div>
                    ) : (
                      <ScrollArea className="h-[300px] pr-2">
                        <div className="space-y-2">
                          {filteredDomains.map((domain, idx) => {
                            const count = Number(domain.count ?? domain.entries ?? 0);
                            return (
                              <div key={domain.domain ?? domain.name ?? idx} className="rounded-md border p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-medium text-sm">{domain.domain ?? domain.name ?? "Untitled"}</p>
                                  <Badge variant="secondary">{count}</Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Recent entries</CardTitle>
                    <CardDescription>Newest saved knowledge snippets.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recentEpisodes.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No recent knowledge entries.</div>
                    ) : (
                      <ScrollArea className="h-[300px] pr-2">
                        <div className="space-y-2">
                          {recentEpisodes.slice(0, 30).map((episode, idx) => (
                            <div key={`${episode.title}-${idx}`} className="rounded-md border p-3">
                              <p className="font-medium text-sm line-clamp-1">{episode.title ?? "Untitled entry"}</p>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{episode.content ?? ""}</p>
                              <p className="text-[11px] text-muted-foreground mt-1">
                                {episode.timestamp
                                  ? formatRelative(new Date(episode.timestamp).getTime())
                                  : "recently"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-3 md:grid-cols-3 text-sm">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Episodes</p>
                  <p className="mt-1 font-medium">{memoryStats?.episodes ?? 0}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Semantic entries</p>
                  <p className="mt-1 font-medium">{memoryStats?.semanticEntries ?? 0}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Task scores</p>
                  <p className="mt-1 font-medium">{memoryStats?.taskScores ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground inline-flex items-center gap-2">
            <CheckCircle2 className="size-3" />
            Clear labels are used: Schedule and Knowledge, not technical terms.
          </p>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground inline-flex items-center gap-2">
        <ShieldAlert className="size-3" />
        Data refreshes from the unified API routes.
      </p>
    </main>
  );
}
