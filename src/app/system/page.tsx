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
import { Progress } from "@/components/ui/progress";
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

type DiskEntry = {
  name: string;
  percent: number | null;
  details: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function parsePercent(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value >= 0 && value <= 1) return clampPercent(value * 100);
    return clampPercent(value);
  }

  if (typeof value === "string") {
    const match = value.match(/-?\d+(\.\d+)?/);
    if (!match) return null;
    const num = Number(match[0]);
    if (!Number.isFinite(num)) return null;

    if (!value.includes("%") && num >= 0 && num <= 1) {
      return clampPercent(num * 100);
    }
    return clampPercent(num);
  }

  return null;
}

function parseCount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const match = value.match(/\d+/);
    if (!match) return null;
    const num = Number(match[0]);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

function getAny(obj: Record<string, unknown> | null | undefined, keys: string[]): unknown {
  if (!obj) return undefined;
  for (const key of keys) {
    if (key in obj) return obj[key];
  }
  return undefined;
}

function formatPercentLabel(value: number | null): string {
  if (value == null) return "N/A";
  return `${Math.round(value)}%`;
}

function formatUptime(value: unknown): string {
  if (value == null) return "Not reported";
  if (typeof value === "string" && value.trim()) return value;

  if (typeof value === "number" && Number.isFinite(value)) {
    const totalSeconds = Math.max(0, Math.floor(value));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  return String(value);
}

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

function processDotClass(status: unknown): string {
  const s = String(status ?? "").toLowerCase();
  if (s.includes("running") || s.includes("ok") || s.includes("healthy") || s.includes("active")) return "bg-emerald-400";
  if (s.includes("warn") || s.includes("stale") || s.includes("degraded")) return "bg-yellow-400";
  if (s.includes("fail") || s.includes("error") || s.includes("down")) return "bg-red-400";
  return "bg-slate-400";
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

function getDiskEntries(raw: unknown): DiskEntry[] {
  if (!isRecord(raw)) return [];

  const entries: DiskEntry[] = [];

  for (const [name, value] of Object.entries(raw)) {
    if (Array.isArray(value)) continue;

    if (isRecord(value)) {
      const percent = parsePercent(
        getAny(value, ["percent", "usage", "usedPercent", "used_pct", "pct", "use", "usagePercent", "usedPercentage"]),
      );
      const used = getAny(value, ["usedHuman", "used", "usedBytes"]);
      const total = getAny(value, ["totalHuman", "total", "size", "capacity"]);

      let details = "No details";
      if (used != null && total != null) details = `${String(used)} / ${String(total)}`;
      else if (used != null) details = `Used ${String(used)}`;
      else if (total != null) details = `Total ${String(total)}`;

      entries.push({ name, percent, details });
      continue;
    }

    const percent = parsePercent(value);
    entries.push({
      name,
      percent,
      details: value == null ? "No details" : String(value),
    });
  }

  const preferred = ["data", "memory", "state", "skills", "/", "root"];

  return entries
    .sort((a, b) => {
      const ai = preferred.findIndex((p) => a.name.toLowerCase().includes(p));
      const bi = preferred.findIndex((p) => b.name.toLowerCase().includes(p));
      const av = ai === -1 ? 999 : ai;
      const bv = bi === -1 ? 999 : bi;
      return av - bv;
    })
    .slice(0, 8);
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
  const runningProcessCount = useMemo(
    () => (health.processes ?? []).filter((p) => processDotClass(p.status) === "bg-emerald-400").length,
    [health.processes],
  );

  const current = isRecord(health.current) ? health.current : {};
  const redisData = isRecord(current.redis) ? current.redis : {};
  const diskData = current.disk;

  const redisIndicator = toneBadge(
    getAny(redisData, ["status", "health", "state"]) ?? (health.current as any)?.redis ?? (health.system as any)?.redisStatus ?? "healthy",
  );

  const redisMemoryPercent = parsePercent(
    getAny(redisData, [
      "memoryUsagePercent",
      "memoryPercent",
      "usedMemoryPercent",
      "used_memory_pct",
      "memory_usage_percent",
      "memory",
    ]),
  );

  const redisClients =
    parseCount(getAny(redisData, ["connectedClients", "clients", "connected_clients", "clientCount"])) ??
    parseCount((health.system as any)?.redisClients);

  const redisUptime =
    getAny(redisData, ["uptime", "uptimeHuman", "uptimeInSeconds", "uptimeSeconds"]) ??
    (health.system as any)?.redisUptime;

  const diskEntries = useMemo(() => getDiskEntries(diskData), [diskData]);

  const streamLengths = useMemo(() => {
    const system = health.system ?? {};
    const pairs = Object.entries(system).filter(([key]) =>
      key.toLowerCase().includes("stream") || key.toLowerCase().includes("queue"),
    );
    return pairs.slice(0, 6);
  }, [health.system]);

  const cpuPercent = parsePercent((health.system as any)?.cpu);
  const memoryPercent = parsePercent((health.system as any)?.memory);
  const diskPercent =
    parsePercent((health.system as any)?.disk) ??
    parsePercent((health.system as any)?.diskUsage) ??
    parsePercent((health.system as any)?.diskPercent) ??
    diskEntries.find((entry) => entry.name === "/")?.percent ??
    null;

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

      <Tabs defaultValue="infrastructure" className="space-y-4">
        <TabsList className="grid h-auto grid-cols-1 gap-1 sm:grid-cols-3">
          <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
          <TabsTrigger value="schedule">Scheduled Jobs</TabsTrigger>
          <TabsTrigger value="memory">Memory</TabsTrigger>
        </TabsList>

        <TabsContent value="infrastructure" className="space-y-4">
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wide">System uptime</CardDescription>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Timer className="size-4 text-muted-foreground" />
                  {String((health.system as any)?.uptime ?? "Unknown")}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">Runtime since last restart.</CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wide">CPU usage</CardDescription>
                <CardTitle className="flex items-center justify-between gap-2 text-lg">
                  <span className="inline-flex items-center gap-2">
                    <Server className="size-4 text-muted-foreground" />
                    CPU
                  </span>
                  <span className="text-base font-medium">{formatPercentLabel(cpuPercent)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Progress value={cpuPercent ?? 0} className="h-2" />
                <p className="text-xs text-muted-foreground">Live compute load.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wide">Memory usage</CardDescription>
                <CardTitle className="flex items-center justify-between gap-2 text-lg">
                  <span className="inline-flex items-center gap-2">
                    <Database className="size-4 text-muted-foreground" />
                    RAM
                  </span>
                  <span className="text-base font-medium">{formatPercentLabel(memoryPercent)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Progress value={memoryPercent ?? 0} className="h-2" />
                <p className="text-xs text-muted-foreground">System memory pressure.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wide">Disk usage</CardDescription>
                <CardTitle className="flex items-center justify-between gap-2 text-lg">
                  <span className="inline-flex items-center gap-2">
                    <HardDrive className="size-4 text-muted-foreground" />
                    Storage
                  </span>
                  <span className="text-base font-medium">{formatPercentLabel(diskPercent)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Progress value={diskPercent ?? 0} className="h-2" />
                <p className="text-xs text-muted-foreground">Overall disk occupancy.</p>
              </CardContent>
            </Card>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2">
                    <Network className="size-4" />
                    Redis
                  </span>
                  {redisIndicator}
                </CardTitle>
                <CardDescription>Connection state and cache usage.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Memory usage</span>
                    <span>{formatPercentLabel(redisMemoryPercent)}</span>
                  </div>
                  <Progress value={redisMemoryPercent ?? 0} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Connected clients</p>
                    <p className="mt-1 font-medium">{redisClients ?? "N/A"}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Uptime</p>
                    <p className="mt-1 font-medium">{formatUptime(redisUptime)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="xl:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <HardDrive className="size-4" />
                  Disk
                </CardTitle>
                <CardDescription>Usage by key directories.</CardDescription>
              </CardHeader>
              <CardContent>
                {diskEntries.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Coffee className="size-4" />
                    No disk directory details available.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {diskEntries.map((entry) => (
                      <div key={entry.name} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-medium text-foreground">{entry.name}</span>
                          <span className="text-muted-foreground">{entry.percent != null ? `${Math.round(entry.percent)}%` : entry.details}</span>
                        </div>
                        <Progress value={entry.percent ?? 0} className="h-2" />
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{entry.details}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="xl:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2">
                    <Server className="size-4" />
                    Processes
                  </span>
                  <Badge variant="secondary">{runningProcessCount}/{processCount} running</Badge>
                </CardTitle>
                <CardDescription>Service status, uptime, and PID.</CardDescription>
              </CardHeader>
              <CardContent>
                {processCount === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Coffee className="size-4" />
                    No process details available right now.
                  </div>
                ) : (
                  <ScrollArea className="h-[280px] pr-2">
                    <div className="space-y-2">
                      {health.processes?.slice(0, 20).map((processInfo, idx) => (
                        <div key={idx} className="rounded-md border p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">
                                {String(processInfo.name ?? processInfo.actor ?? `Process ${idx + 1}`)}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">PID {String(processInfo.pid ?? "—")}</p>
                            </div>
                            <span
                              className={cn("mt-1 inline-block size-2 shrink-0 rounded-full", processDotClass(processInfo.status))}
                              title={String(processInfo.status ?? "unknown")}
                            />
                          </div>
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs text-muted-foreground">
                              Uptime {formatUptime(processInfo.uptime)}
                            </p>
                            {statusPill(String(processInfo.status ?? "unknown"))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </section>

          {streamLengths.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Queues & streams</CardTitle>
                <CardDescription>Current stream/queue lengths from system metrics.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {streamLengths.map(([key, value]) => (
                  <div key={key} className="rounded-md border p-3 text-sm">
                    <p className="text-xs text-muted-foreground">{key}</p>
                    <p className="font-medium mt-1">{String(value)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Last update: {health.lastPublished ? formatRelative(new Date(health.lastPublished).getTime()) : "unknown"}
          </p>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarClock className="size-4" />
                Scheduled Jobs
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

        <TabsContent value="memory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="size-4" />
                Memory
              </CardTitle>
              <CardDescription>Browse saved domains and recent entries.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={knowledgeQuery}
                  onChange={(event) => setKnowledgeQuery(event.target.value)}
                  placeholder="Search memory domains"
                  className="w-full rounded-md border bg-background px-9 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Domains</CardTitle>
                    <CardDescription>How memory is organized.</CardDescription>
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
                    <CardDescription>Newest saved memory snippets.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recentEpisodes.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No recent memory entries.</div>
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
            Memory and schedule views keep the same data behavior with richer infrastructure visuals.
          </p>
        </TabsContent>
      </Tabs>

      <Separator />
      <p className="text-xs text-muted-foreground inline-flex items-center gap-2">
        <ShieldAlert className="size-3" />
        Data refreshes from the unified API routes.
      </p>
    </main>
  );
}
