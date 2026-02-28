"use client";

import { useMemo } from "react";
import {
  BarChart3,
  ChevronDown,
  ClipboardCheck,
  Coffee,
  Gauge,
  ListChecks,
} from "lucide-react";

import { useScores } from "@/hooks/use-api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";


type ScoreEntryLike = {
  timestamp?: string;
  task?: string;
  status?: string;
  scores?: {
    quality?: number;
    efficiency?: number;
    toolSelection?: number;
    communication?: number;
    reasoning?: string;
  };
  stats?: {
    toolCalls?: number;
    toolErrors?: number;
    durationMs?: number;
  };
};

type DailyLike = {
  date: string;
  count: number;
  avgQuality: number;
  avgEfficiency: number;
};

function scoreBadge(value?: number) {
  const n = Number(value ?? 0);
  if (n >= 7) return <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">{n.toFixed(1)}</Badge>;
  if (n >= 5) return <Badge className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30">{n.toFixed(1)}</Badge>;
  return <Badge className="bg-red-500/15 text-red-300 border-red-500/30">{n.toFixed(1)}</Badge>;
}

function trendBarColor(value: number) {
  if (value >= 7) return "bg-emerald-500/80";
  if (value >= 5) return "bg-yellow-500/80";
  return "bg-red-500/80";
}

export default function QualityPage() {
  const scoresQuery = useScores() as any;

  const entries: ScoreEntryLike[] = scoresQuery?.data?.entries ?? [];
  const dailyRaw: DailyLike[] = scoresQuery?.data?.daily ?? [];
  const totals = scoresQuery?.data?.totals;

  const last14Days = useMemo(() => dailyRaw.slice(-14), [dailyRaw]);

  const summary = useMemo(() => {
    const avgQuality = Number(totals?.avgQuality ?? 0);
    const avgEfficiency = Number(totals?.avgEfficiency ?? 0);
    const count = Number(totals?.count ?? entries.length ?? 0);

    return {
      avgQuality,
      avgEfficiency,
      totalTasks: count,
    };
  }, [totals, entries.length]);

  const recentEntries = useMemo(() => {
    return [...entries]
      .sort((a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime())
      .slice(0, 30);
  }, [entries]);

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8 space-y-6">
      <section>
        <h1 className="text-2xl md:text-3xl font-semibold">Quality</h1>
        <p className="text-sm text-muted-foreground">Understand score trends and improve task outcomes.</p>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wide">Average quality</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <ClipboardCheck className="size-5 text-muted-foreground" />
              {summary.avgQuality.toFixed(1)} / 10
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Task quality over all scored tasks.</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wide">Average efficiency</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Gauge className="size-5 text-muted-foreground" />
              {summary.avgEfficiency.toFixed(1)} / 10
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">How effectively tasks are completed.</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wide">Total tasks scored</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <ListChecks className="size-5 text-muted-foreground" />
              {summary.totalTasks}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Number of tasks included in this analysis.</CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="size-4" />
            14-day trend
          </CardTitle>
          <CardDescription>
            Daily average quality score (0–10). Green means strong, yellow needs watching, red needs improvement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {last14Days.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Coffee className="size-4" />
              No trend data yet.
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2 sm:grid-cols-14 items-end h-52">
              {last14Days.map((day) => {
                const value = Number(day.avgQuality ?? 0);
                const height = Math.max(8, Math.min(100, value * 10));

                return (
                  <div key={day.date} className="flex flex-col items-center gap-1">
                    <div className="h-44 w-full rounded-md border border-border/60 bg-muted/20 p-1 flex items-end">
                      <div
                        className={cn("w-full rounded-sm transition-all", trendBarColor(value))}
                        style={{ height: `${height}%` }}
                        title={`${day.date}: ${value.toFixed(1)}`}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{day.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent scores</CardTitle>
          <CardDescription>
            Collapsed by default. Expand a row to see the full description and scoring details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentEntries.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Coffee className="size-4" />
              No scored tasks yet.
            </div>
          ) : (
            <ScrollArea className="h-[620px] pr-2">
              <div className="space-y-2">
                {recentEntries.map((entry, idx) => (
                  <Collapsible key={`${entry.timestamp}-${idx}`}>
                    <Card className="border-border/70">
                      <CollapsibleTrigger className="w-full text-left">
                        <CardContent className="pt-5 pb-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium truncate max-w-[70%]">{entry.task ?? "Untitled task"}</p>
                            <div className="flex items-center gap-2">
                              {scoreBadge(entry.scores?.quality)}
                              {scoreBadge(entry.scores?.efficiency)}
                              <ChevronDown className="size-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
                            </div>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span>{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "Unknown time"}</span>
                            <Badge variant="secondary">{entry.status ?? "unknown"}</Badge>
                          </div>
                        </CardContent>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <CardContent className="pt-0 pb-5 text-sm space-y-3">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Task details</p>
                            <p className="text-muted-foreground">{entry.task ?? "No task description available."}</p>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="rounded-md border p-3">
                              <p className="text-xs text-muted-foreground">Quality</p>
                              <p className="mt-1 font-medium">{entry.scores?.quality ?? 0}/10</p>
                            </div>
                            <div className="rounded-md border p-3">
                              <p className="text-xs text-muted-foreground">Efficiency</p>
                              <p className="mt-1 font-medium">{entry.scores?.efficiency ?? 0}/10</p>
                            </div>
                            <div className="rounded-md border p-3">
                              <p className="text-xs text-muted-foreground">Tool selection</p>
                              <p className="mt-1 font-medium">{entry.scores?.toolSelection ?? 0}/10</p>
                            </div>
                            <div className="rounded-md border p-3">
                              <p className="text-xs text-muted-foreground">Communication</p>
                              <p className="mt-1 font-medium">{entry.scores?.communication ?? 0}/10</p>
                            </div>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-3 text-xs text-muted-foreground">
                            <p>Tool calls: {entry.stats?.toolCalls ?? 0}</p>
                            <p>Tool errors: {entry.stats?.toolErrors ?? 0}</p>
                            <p>Duration: {entry.stats?.durationMs ? `${Math.round(entry.stats.durationMs / 1000)}s` : "—"}</p>
                          </div>

                          {entry.scores?.reasoning ? (
                            <div className="rounded-md border p-3 text-xs text-muted-foreground">
                              <p className="mb-1 uppercase tracking-wide">Scoring notes</p>
                              <p>{entry.scores.reasoning}</p>
                            </div>
                          ) : null}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
