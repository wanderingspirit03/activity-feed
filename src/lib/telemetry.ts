import type { ActorEntry, DlqEntry, FullTraceDetail, FullTraceSection, RunDetail, RunSummary, TelemetryEvent } from "@/lib/types";
import { apiFetch } from "@/lib/api-client";

const DEFAULT_LIMIT = 50;

type ApiRun = {
  runId: string;
  actorAddress?: string;
  task?: string;
  status: string;
  startedAt: string;
  updatedAt: string;
  durationMs?: number;
  conversationKey?: string;
};

function toTimestamp(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function toSummary(run: ApiRun): RunSummary {
  const startedAt = toTimestamp(run.startedAt);
  const updatedAt = toTimestamp(run.updatedAt);
  const status = run.status || "running";

  return {
    runId: run.runId,
    startedAt,
    lastAt: updatedAt,
    lastEventType: undefined,
    lastActor: run.actorAddress,
    lastMessageType: undefined,
    taskPreview: run.task,
    summaryPreview: undefined,
    primaryStatus: status === "checkpointed" ? "running" : status,
    tags: [],
    llmInFlight: undefined,
    humanInFlight: undefined,
    toolInFlight: undefined,
    lastToolName: undefined,
    lastToolStartAt: undefined,
    stuckFlag: false,
    hasDlq: false,
    hasHandlerErrors: false,
    hasRetries: false,
    doneStatus: status === "completed" ? "ok" : status === "failed" ? "failed" : undefined,
  };
}

export async function getRuns(options: {
  limit?: number;
  cursor?: number;
  status?: string;
  tag?: string;
  q?: string;
  namespace?: string;
}): Promise<{ runs: RunSummary[]; nextCursor?: number }> {
  try {
    const limit = options.limit ?? DEFAULT_LIMIT;
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    if (options.status && options.status !== "all") params.set("status", options.status);

    const data = await apiFetch<{ runs: ApiRun[]; total: number }>(
      `/api/runs?${params.toString()}`,
    );

    let runs = (data.runs || []).map(toSummary);

    // Client-side filtering for q and namespace
    if (options.q) {
      const q = options.q.toLowerCase();
      runs = runs.filter((run) =>
        [run.runId, run.taskPreview ?? "", run.lastActor ?? ""]
          .join("\n")
          .toLowerCase()
          .includes(q),
      );
    }

    if (options.namespace && options.namespace !== "all") {
      runs = runs.filter((run) => {
        const actor = run.lastActor ?? "";
        if (options.namespace === "main") return actor === "/orchestrator";
        return actor.includes(`/${options.namespace}`);
      });
    }

    return { runs: runs.slice(0, limit), nextCursor: undefined };
  } catch {
    return { runs: [], nextCursor: undefined };
  }
}

export async function getRunDetail(runId: string, limit = 300): Promise<RunDetail> {
  try {
    // Fetch run info and events in parallel
    const [runRes, eventsRes] = await Promise.allSettled([
      apiFetch<{ runs: ApiRun[] }>(`/api/runs?limit=100`),
      apiFetch<{ events: Array<Record<string, unknown>> }>(`/api/runs/${encodeURIComponent(runId)}/events?limit=${limit}`),
    ]);

    let summary: RunSummary | null = null;
    if (runRes.status === "fulfilled") {
      const match = runRes.value.runs?.find((r: ApiRun) => r.runId === runId);
      if (match) summary = toSummary(match);
    }

    const events: TelemetryEvent[] = [];
    if (eventsRes.status === "fulfilled") {
      for (const [index, event] of (eventsRes.value.events ?? []).entries()) {
        events.push({
          id: String(event.id ?? `${runId}-${index}`),
          type: String(event.type ?? ""),
          ts: toTimestamp(event.ts ?? event.timestamp),
          runId,
          actor: (event.actor as string) ?? undefined,
          messageType: (event.messageType as string) ?? undefined,
          data: (event.data as Record<string, unknown>) ?? undefined,
        });
      }
    }

    const actions = events.filter((e) =>
      ["tool_start", "tool_end", "tool_error", "llm_start", "llm_end", "llm_error"].includes(e.type),
    );

    const tasks: RunDetail["tasks"] = [];
    const actors = Array.from(new Set(events.map((e) => e.actor).filter(Boolean))) as string[];

    return { summary, events, actions, tasks, actors };
  } catch {
    return { summary: null, events: [], actions: [], tasks: [], actors: [] };
  }
}

export async function getRunFullTrace(runId: string): Promise<FullTraceDetail> {
  return {
    available: false,
    source: "none",
    message: "Full trace view is not yet available in SQLite mode.",
    runId,
    truncated: false,
    sections: [],
  };
}

export async function getActors(): Promise<ActorEntry[]> {
  try {
    const data = await apiFetch<{ actors: Array<{ address: string; data: Record<string, unknown>; expires_at: number }> }>(
      "/api/actors",
    );

    const now = Date.now() / 1000;
    return (data.actors || []).map((actor) => ({
      address: actor.address,
      name: (actor.data?.name as string) ?? actor.address.split("/").pop() ?? actor.address,
      description: (actor.data?.description as string) ?? undefined,
      capabilities: (actor.data?.capabilities as string[]) ?? [],
      updatedAt: (actor.data?.updatedAt as number) ?? 0,
      status: (actor.expires_at > now ? "alive" : "stale") as "alive" | "stale",
    }));
  } catch {
    return [];
  }
}

export async function getDlq(limit = 100): Promise<DlqEntry[]> {
  try {
    const data = await apiFetch<{ messages: Array<Record<string, unknown>> }>(
      `/api/dlq?limit=${limit}`,
    );
    return (data.messages || []).map((msg) => ({
      id: String(msg.id ?? ""),
      runId: (msg.runId as string) ?? undefined,
      actor: (msg.actor as string) ?? (msg.target as string) ?? undefined,
      messageType: (msg.type as string) ?? undefined,
      reason: (msg.error as string) ?? (msg.reason as string) ?? undefined,
      ts: toTimestamp(msg.dead_lettered_at_ms ?? msg.sent_at_ms ?? msg.ts),
    }));
  } catch {
    return [];
  }
}
