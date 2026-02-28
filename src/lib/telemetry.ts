import type { ActorEntry, DlqEntry, FullTraceDetail, FullTraceSection, RunDetail, RunSummary, TelemetryEvent } from "@/lib/types";

import { getRedis } from "@/lib/redis";

const DEFAULT_LIMIT = 50;
const ACTIVE_WINDOW_MS = 2 * 60 * 1000;
const stuckToolMsRaw = Number(process.env.ACTOR_TELEMETRY_STUCK_TOOL_MS ?? "600000");
const STUCK_TOOL_MS =
  Number.isFinite(stuckToolMsRaw) && stuckToolMsRaw > 0 ? Math.max(60_000, stuckToolMsRaw) : 600000;

const EVENTS_STREAM = "telemetry:events";
const RUNS_ZSET = "telemetry:runs:lastAt";
const TRACE_KEY_PREFIX = "trace:run:";

const REGISTRY_INDEX_KEY = "registry:actors";
const REGISTRY_ENTRY_PREFIX = "registry:actor";

type ApiRun = {
  runId: string;
  status: string;
  createdAt: number;
  updatedAt: number;
  task?: string;
  summary?: string;
  error?: string;
};

type RedisRunHash = Record<string, string>;

function getApiBaseMaybe(): string | null {
  const base = process.env.ACTOR_API_BASE_URL ?? process.env.NEXT_PUBLIC_ACTOR_API_BASE_URL ?? "";
  const trimmed = base.replace(/\/+$/, "");
  return trimmed ? trimmed : null;
}

async function apiFetch<T>(path: string): Promise<T> {
  const base = getApiBaseMaybe();
  if (!base) {
    throw new Error("Missing ACTOR_API_BASE_URL (set it, or run with Redis telemetry locally)");
  }
  const url = `${base}${path}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error (${response.status}): ${text}`);
  }
  return (await response.json()) as T;
}

function parseNum(value: unknown): number | undefined {
  const parsed = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseBool(value: unknown): boolean {
  return value === "1" || value === 1 || value === true;
}

function runKey(runId: string): string {
  return `telemetry:run:${runId}`;
}

function fullTraceKey(runId: string): string {
  return `${TRACE_KEY_PREFIX}${runId}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function scrubDisplayText(value: string): string {
  let next = value;
  next = next.replace(/(redis:\/\/[^:\s/]+:)[^@/\s]+@/gi, "$1[REDACTED]@");
  next = next.replace(
    /((?:authorization|proxy-authorization)\s*[:=]\s*(?:bearer|basic)\s+)[^\s"'`]+/gi,
    "$1[REDACTED]",
  );
  next = next.replace(
    /(\b(?:api[_-]?key|token|secret|password|passwd|session|cookie|auth(?:orization)?|bearer)\b[^\n:=]{0,40}[:=]\s*)[^\s"'`]+/gi,
    "$1[REDACTED]",
  );
  next = next.replace(
    /(\b[A-Z][A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PASSWD|API_KEY|AUTH|COOKIE|SESSION)[A-Z0-9_]*\s*=\s*)[^\s"'`]+/g,
    "$1[REDACTED]",
  );
  next = next.replace(
    /\b(?:sk-[A-Za-z0-9]{12,}|xox[baprs]-[A-Za-z0-9-]{10,}|gh[pousr]_[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,})\b/g,
    "[REDACTED_TOKEN]",
  );
  return next;
}

function computePrimaryStatus(run: RunSummary): string {
  if (run.doneStatus) return run.doneStatus === "ok" ? "done_ok" : "done_failed";
  if ((run.humanInFlight ?? 0) > 0) return "waiting_human";
  if ((run.llmInFlight ?? 0) > 0) return "waiting_llm";
  if ((run.toolInFlight ?? 0) > 0) {
    const startedAt = run.lastToolStartAt ?? 0;
    if (startedAt > 0 && Date.now() - startedAt > STUCK_TOOL_MS) return "stuck_tool";
    return "waiting_tool";
  }
  if (run.hasHandlerErrors) return "failing";
  if (run.hasRetries) return "retrying";

  const last = run.lastAt ?? run.startedAt ?? 0;
  if (last && Date.now() - last <= ACTIVE_WINDOW_MS) return "running";
  return "idle";
}

function toSummary(run: ApiRun): RunSummary {
  const summaryPreview = run.summary ?? run.error ?? undefined;
  const status = run.status ?? "queued";
  const doneStatus = status === "ok" ? "ok" : status === "failed" ? "failed" : undefined;
  return {
    runId: run.runId,
    startedAt: run.createdAt,
    lastAt: run.updatedAt,
    lastEventType: undefined,
    lastActor: undefined,
    lastMessageType: undefined,
    taskPreview: run.task,
    summaryPreview,
    primaryStatus: status,
    tags: [],
    llmInFlight: undefined,
    humanInFlight: undefined,
    toolInFlight: undefined,
    lastToolName: undefined,
    lastToolStartAt: undefined,
    stuckFlag: status === "stuck_tool",
    hasDlq: false,
    hasHandlerErrors: false,
    hasRetries: false,
    doneStatus,
  };
}

function toSummaryFromRedis(runId: string, hash: RedisRunHash): RunSummary {
  const summary: RunSummary = {
    runId,
    startedAt: parseNum(hash.startedAt),
    lastAt: parseNum(hash.lastAt),
    lastEventType: hash.lastEventType || undefined,
    lastActor: hash.lastActor || undefined,
    lastMessageType: hash.lastMessageType || undefined,
    taskPreview: hash.taskPreview || undefined,
    summaryPreview: hash.summaryPreview || undefined,
    primaryStatus: hash.primaryStatus || undefined,
    tags: [],
    llmInFlight: parseNum(hash.llmInFlight),
    humanInFlight: parseNum(hash.humanInFlight),
    toolInFlight: parseNum(hash.toolInFlight),
    lastToolName: hash.lastToolName || undefined,
    lastToolStartAt: parseNum(hash.lastToolStartAt),
    stuckFlag: false,
    hasDlq: parseBool(hash.hasDlq),
    hasHandlerErrors: parseBool(hash.hasHandlerErrors),
    hasRetries: parseBool(hash.hasRetries),
    doneStatus: hash.doneStatus || undefined,
  };
  summary.primaryStatus = summary.primaryStatus ?? computePrimaryStatus(summary);
  summary.stuckFlag = summary.primaryStatus === "stuck_tool";
  return summary;
}

async function getRunsFromRedis(options: {
  limit?: number;
  cursor?: number;
  status?: string;
  tag?: string;
  q?: string;
  namespace?: string;
}): Promise<{ runs: RunSummary[]; nextCursor?: number }> {
  void options.tag;

  const limit = options.limit ?? DEFAULT_LIMIT;
  const redis = getRedis();
  const maxScore = options.cursor ? String(options.cursor - 1) : "+inf";

  const ids = await redis.zrevrangebyscore(RUNS_ZSET, maxScore, "-inf", "LIMIT", 0, 3 * limit);
  if (ids.length === 0) return { runs: [], nextCursor: undefined };

  const pipeline = redis.pipeline();
  ids.forEach((id) => pipeline.hgetall(runKey(id)));
  const rows = await pipeline.exec();

  const runs: RunSummary[] = [];
  for (let i = 0; i < ids.length; i += 1) {
    const runId = ids[i];
    const hash = rows?.[i]?.[1] as RedisRunHash | undefined;
    if (!hash || Object.keys(hash).length === 0) continue;
    runs.push(toSummaryFromRedis(runId, hash));
  }

  const filtered = runs
    .filter((run) => {
      if (!options.q) return true;
      const q = options.q.toLowerCase();
      return [
        run.runId,
        run.taskPreview ?? "",
        run.summaryPreview ?? "",
        run.lastEventType ?? "",
        run.lastActor ?? "",
        run.lastMessageType ?? "",
      ]
        .join("\n")
        .toLowerCase()
        .includes(q);
    })
    .filter((run) => {
      if (!options.status || options.status === "all") return true;
      return (run.primaryStatus ?? computePrimaryStatus(run)) === options.status;
    })
    .filter((run) => {
      if (!options.namespace || options.namespace === "all") return true;
      const actor = run.lastActor ?? "";
      if (options.namespace === "main") {
        return actor === "/orchestrator" || (!actor.startsWith("/orchestrator/") && !actor.includes("/orchestrator/"));
      }
      return actor.includes(`/orchestrator/${options.namespace}`) || actor.includes(`/${options.namespace}/`) || actor.includes(`/${options.namespace}`);
    })
    .slice(0, limit);

  const nextCursor = filtered.length > 0 ? filtered[filtered.length - 1]?.lastAt : undefined;
  return { runs: filtered, nextCursor: nextCursor ?? undefined };
}

function pairsToObject(pairs: Array<string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < pairs.length; i += 2) {
    const key = pairs[i];
    const value = pairs[i + 1];
    if (typeof key === "string" && typeof value === "string") result[key] = value;
  }
  return result;
}

async function getRunDetailFromRedis(runId: string, limit = 300): Promise<RunDetail> {
  const redis = getRedis();

  const runHash = (await redis.hgetall(runKey(runId))) as RedisRunHash;
  const summary = runHash && Object.keys(runHash).length > 0 ? toSummaryFromRedis(runId, runHash) : null;

  const events: TelemetryEvent[] = [];
  let start = "+";

  while (events.length < limit) {
    const chunk = await redis.xrevrange(EVENTS_STREAM, start, "-", "COUNT", 500);
    if (!chunk || chunk.length === 0) break;

    for (const [entryId, pairList] of chunk as Array<[string, Array<string>]>) {
      const fields = pairsToObject(pairList);
      if ((fields.runId ?? "") !== runId) continue;

      let data: Record<string, any> | undefined;
      const raw = fields.data ?? "";
      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch {
          data = undefined;
        }
      }

      events.push({
        id: entryId,
        type: fields.type ?? "",
        ts: Number(fields.ts ?? 0),
        runId: fields.runId || undefined,
        actor: fields.actor || undefined,
        messageType: fields.messageType || undefined,
        data,
      });

      if (events.length >= limit) break;
    }

    const lastId = chunk[chunk.length - 1]?.[0];
    if (!lastId) break;
    start = `(${lastId}`;
    if (chunk.length < 500) break;
  }

  events.sort((a, b) => a.ts - b.ts);

  const actions = events.filter((event) =>
    ["tool_start", "tool_end", "tool_error", "llm_start", "llm_end", "llm_error"].includes(event.type),
  );

  const tasks: RunDetail["tasks"] = [];
  const seen = new Set<string>();
  for (const event of events) {
    const messageId = typeof event.data?.messageId === "string" ? event.data.messageId : event.id;
    if (event.messageType === "TaskRequest" && event.data?.payload?.task) {
      const key = `request:${messageId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      tasks.push({
        kind: "request",
        text: String(event.data.payload.task),
        ts: event.ts,
      });
    }
    if (event.messageType === "TaskResult" && event.data?.payload?.taskId === "summary") {
      const key = `result:${messageId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      tasks.push({
        kind: "result",
        status: String(event.data.payload.status ?? ""),
        text: String(event.data.payload.result ?? event.data.payload.error ?? ""),
        ts: event.ts,
      });
    }
  }

  const actors = Array.from(new Set(events.map((event) => event.actor).filter(Boolean))) as string[];
  return { summary, events, actions, tasks, actors };
}

export async function getRuns(options: {
  limit?: number;
  cursor?: number;
  status?: string;
  tag?: string;
  q?: string;
  namespace?: string;
}): Promise<{ runs: RunSummary[]; nextCursor?: number }> {
  const base = getApiBaseMaybe();
  if (!base) {
    try {
      return await getRunsFromRedis(options);
    } catch {
      return { runs: [], nextCursor: undefined };
    }
  }

  try {
    const limit = options.limit ?? DEFAULT_LIMIT;
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    if (options.cursor) params.set("cursor", String(options.cursor));
    if (options.status) params.set("status", options.status);
    if (options.q) params.set("q", options.q);
    const payload = await apiFetch<{ runs: ApiRun[]; nextCursor?: number }>(
      `/api/runs?${params.toString()}`,
    );
    return { runs: payload.runs.map(toSummary), nextCursor: payload.nextCursor };
  } catch {
    // If the API base is set but unreachable, still try local Redis.
    try {
      return await getRunsFromRedis(options);
    } catch {
      return { runs: [], nextCursor: undefined };
    }
  }
}

export async function getRunDetail(runId: string, limit = 300): Promise<RunDetail> {
  const base = getApiBaseMaybe();
  if (!base) {
    try {
      return await getRunDetailFromRedis(runId, limit);
    } catch {
      return { summary: null, events: [], actions: [], tasks: [], actors: [] };
    }
  }

  try {
    const runPayload = await apiFetch<{ run: ApiRun | null }>(`/api/runs/${runId}`);
    const summary = runPayload.run ? toSummary(runPayload.run) : null;
    const eventsPayload = await apiFetch<{ events: Array<Record<string, any>> }>(
      `/api/runs/${runId}/events?limit=${limit}`,
    );
    const events: TelemetryEvent[] = (eventsPayload.events ?? []).map((event, index) => ({
      id: `${runId}-${index}`,
      type: String(event.type ?? ""),
      ts: Number(event.ts ?? 0),
      runId,
      actor: event.actor ?? undefined,
      messageType: event.messageType ?? undefined,
      data: event.data ?? undefined,
    }));

    const actions = events.filter((event) =>
      ["tool_start", "tool_end", "tool_error", "llm_start", "llm_end", "llm_error"].includes(event.type),
    );

    const tasks: RunDetail["tasks"] = [];
    const seen = new Set<string>();
    for (const event of events) {
      const messageId = typeof event.data?.messageId === "string" ? event.data.messageId : event.id;
      if (event.messageType === "TaskRequest" && event.data?.payload?.task) {
        const key = `request:${messageId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        tasks.push({
          kind: "request",
          text: String(event.data.payload.task),
          ts: event.ts,
        });
      }
      if (event.messageType === "TaskResult" && event.data?.payload?.taskId === "summary") {
        const key = `result:${messageId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        tasks.push({
          kind: "result",
          status: String(event.data.payload.status ?? ""),
          text: String(event.data.payload.result ?? event.data.payload.error ?? ""),
          ts: event.ts,
        });
      }
    }

    const actors = Array.from(new Set(events.map((event) => event.actor).filter(Boolean))) as string[];
    return { summary, events, actions, tasks, actors };
  } catch {
    try {
      return await getRunDetailFromRedis(runId, limit);
    } catch {
      return { summary: null, events: [], actions: [], tasks: [], actors: [] };
    }
  }
}

function unavailableFullTrace(
  runId: string,
  message: string,
  temporarilyUnavailable = false,
): FullTraceDetail {
  return {
    available: false,
    source: "none",
    temporarilyUnavailable,
    message,
    runId,
    truncated: false,
    sections: [],
  };
}

function normalizeFullTrace(runId: string, raw: unknown): FullTraceDetail {
  if (!isObject(raw)) {
    return unavailableFullTrace(runId, "Trace payload is malformed.");
  }

  const sectionsRaw = Array.isArray(raw.sections) ? raw.sections : [];
  const sections: FullTraceSection[] = sectionsRaw
    .map((entry, index) => {
      if (!isObject(entry)) return null;
      const header = typeof entry.header === "string" ? scrubDisplayText(entry.header) : `[SECTION_${index + 1}]`;
      const content = typeof entry.content === "string" ? scrubDisplayText(entry.content) : "";
      const chars = typeof entry.chars === "number" && Number.isFinite(entry.chars) ? entry.chars : content.length;
      return {
        id: typeof entry.id === "string" && entry.id ? entry.id : `section-${index + 1}`,
        kind: typeof entry.kind === "string" && entry.kind ? entry.kind : "trace",
        header,
        content,
        chars,
      };
    })
    .filter((entry): entry is FullTraceSection => Boolean(entry));

  const statsRaw = isObject(raw.stats) ? raw.stats : {};
  const sectionCount =
    typeof statsRaw.sectionCount === "number" && Number.isFinite(statsRaw.sectionCount)
      ? statsRaw.sectionCount
      : sections.length;
  const charCount =
    typeof statsRaw.charCount === "number" && Number.isFinite(statsRaw.charCount)
      ? statsRaw.charCount
      : sections.reduce((sum, section) => sum + section.content.length, 0);

  return {
    available: true,
    source: "redis",
    runId: typeof raw.runId === "string" && raw.runId ? raw.runId : runId,
    status:
      raw.status === "ok" || raw.status === "failed" || raw.status === "skipped"
        ? raw.status
        : undefined,
    actor: typeof raw.actor === "string" ? raw.actor : undefined,
    timestamp: typeof raw.timestamp === "string" ? raw.timestamp : undefined,
    task: typeof raw.task === "string" ? scrubDisplayText(raw.task) : undefined,
    taskContext: typeof raw.taskContext === "string" ? scrubDisplayText(raw.taskContext) : undefined,
    result: typeof raw.result === "string" ? scrubDisplayText(raw.result) : undefined,
    error: typeof raw.error === "string" ? scrubDisplayText(raw.error) : undefined,
    truncated: Boolean(raw.truncated),
    redactionVersion: typeof raw.redactionVersion === "string" ? raw.redactionVersion : undefined,
    redactionCount:
      typeof raw.redactionCount === "number" && Number.isFinite(raw.redactionCount)
        ? raw.redactionCount
        : undefined,
    sections,
    stats: {
      messageCount:
        typeof statsRaw.messageCount === "number" && Number.isFinite(statsRaw.messageCount)
          ? statsRaw.messageCount
          : undefined,
      toolTraceCount:
        typeof statsRaw.toolTraceCount === "number" && Number.isFinite(statsRaw.toolTraceCount)
          ? statsRaw.toolTraceCount
          : undefined,
      sectionCount,
      charCount,
      droppedSections:
        typeof statsRaw.droppedSections === "number" && Number.isFinite(statsRaw.droppedSections)
          ? statsRaw.droppedSections
          : undefined,
    },
  };
}

export async function getRunFullTrace(runId: string): Promise<FullTraceDetail> {
  try {
    const redis = getRedis();
    const raw = await redis.get(fullTraceKey(runId));
    if (!raw) {
      return unavailableFullTrace(runId, "Full trace is not available for this run.");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return unavailableFullTrace(runId, "Full trace payload could not be decoded.");
    }
    return normalizeFullTrace(runId, parsed);
  } catch {
    return unavailableFullTrace(
      runId,
      "Full trace is temporarily unavailable. Timeline data is still available.",
      true,
    );
  }
}

export async function getActors(): Promise<ActorEntry[]> {
  try {
    const redis = getRedis();
    const addresses = await redis.smembers(REGISTRY_INDEX_KEY);
    if (addresses.length === 0) return [];

    const pipeline = redis.pipeline();
    for (const address of addresses) {
      pipeline.get(`${REGISTRY_ENTRY_PREFIX}:${address}`);
    }
    const results = await pipeline.exec();
    if (!results) return [];

    const now = Date.now();
    const entries: ActorEntry[] = [];

    for (let i = 0; i < results.length; i++) {
      const value = results[i]?.[1];
      if (typeof value !== "string") {
        // Key expired → actor is stale/gone; still show it as stale
        entries.push({
          address: addresses[i],
          name: addresses[i].split("/").pop() ?? addresses[i],
          capabilities: [],
          updatedAt: 0,
          status: "stale",
        });
        continue;
      }

      try {
        const parsed = JSON.parse(value) as {
          address: string;
          name: string;
          description?: string;
          capabilities: string[];
          updatedAt: number;
          metadata?: Record<string, unknown>;
        };

        const age = now - (parsed.updatedAt ?? 0);
        const status: "alive" | "stale" = age < 30_000 ? "alive" : "stale";

        entries.push({
          address: parsed.address,
          name: parsed.name ?? parsed.address.split("/").pop() ?? parsed.address,
          description: parsed.description,
          capabilities: parsed.capabilities ?? [],
          updatedAt: parsed.updatedAt ?? 0,
          status,
        });
      } catch {
        // Skip malformed entries
      }
    }

    return entries.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function getDlq(limit = 100): Promise<DlqEntry[]> {
  try {
    const redis = getRedis();
    const events: DlqEntry[] = [];
    let start = "+";

    while (events.length < limit) {
      const chunk = await redis.xrevrange(EVENTS_STREAM, start, "-", "COUNT", 500);
      if (!chunk || chunk.length === 0) break;

      for (const [entryId, pairList] of chunk as Array<[string, Array<string>]>) {
        const fields = pairsToObject(pairList);
        if (fields.type !== "message_deadlettered") continue;

        let data: Record<string, any> | undefined;
        try {
          data = fields.data ? JSON.parse(fields.data) : undefined;
        } catch {
          data = undefined;
        }

        events.push({
          id: entryId,
          runId: fields.runId || undefined,
          actor: fields.actor || undefined,
          messageType: fields.messageType || undefined,
          reason: (data?.reason as string) ?? (data?.error as string) ?? undefined,
          ts: Number(fields.ts ?? 0),
        });

        if (events.length >= limit) break;
      }

      const lastId = chunk[chunk.length - 1]?.[0];
      if (!lastId) break;
      start = `(${lastId}`;
      if (chunk.length < 500) break;
    }

    return events;
  } catch {
    return [];
  }
}
