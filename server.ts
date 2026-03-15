import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "3100", 10);
const ACTOR_API_BASE_URL = process.env.ACTOR_API_BASE_URL?.trim().replace(/\/+$/, "") || "";
const DASHBOARD_API_KEY = process.env.DASHBOARD_API_KEY?.trim() || "";

const ACTIVE_POLL_INTERVAL_MS = 3_000;
const COMPLETED_POLL_INTERVAL_MS = 15_000;
const API_TIMEOUT_MS = 10_000;
const RUN_ACTIVITY_LIMIT = 50;
const ACTIVE_RUN_LIMIT = 50;
const COMPLETED_RUN_LIMIT = 20;
const STALE_EVENT_REFETCH_MS = 30_000;
const COMPLETED_RETENTION_MS = 60 * 60 * 1000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// ── Types ──────────────────────────────────────────
type RunPhase = "queued" | "understanding" | "working" | "reviewing" | "complete" | "error";

type ActivityItem = {
  id: string;
  runId: string;
  timestamp: number;
  phase: RunPhase;
  title: string;
  description?: string;
  icon?: string;
  progress?: number;
  isActive?: boolean;
  toolName?: string;
  toolArgs?: string;
};

type RunOverview = {
  runId: string;
  task: string;
  phase: RunPhase;
  progress: number;
  startedAt: number;
  updatedAt: number;
  activities: ActivityItem[];
  specialist?: string;
};

type WsMessage =
  | { type: "runs"; data: RunOverview[] }
  | { type: "run.update"; data: RunOverview }
  | { type: "activity"; data: ActivityItem }
  | { type: "ping"; data?: { upstreamHealthy: boolean; timestamp: number } };

type RunCache = {
  run: RunOverview;
  lastEventTs: number;
  lastFetchedAt: number;
};

type NormalizedEvent = {
  id: string;
  runId: string;
  timestamp: number;
  type: string;
  status: string;
  toolName: string;
  toolArgs: string;
};

// ── Friendly names for tools ──────────────────────
const toolFriendlyNames: Record<string, { title: string; icon: string }> = {
  web_search: { title: "Searching the web for answers…", icon: "search" },
  web_extract: { title: "Reading a web page…", icon: "globe" },
  read: { title: "Looking through files…", icon: "file-text" },
  read_multi: { title: "Reviewing several documents…", icon: "files" },
  write: { title: "Writing up results…", icon: "pen-line" },
  edit: { title: "Making some edits…", icon: "pen-line" },
  grep: { title: "Searching for something specific…", icon: "search" },
  find: { title: "Looking for the right files…", icon: "folder-search" },
  bash: { title: "Running a quick check…", icon: "terminal" },
  slack_reply: { title: "Sending you an update…", icon: "send" },
  run_subagent: { title: "Bringing in a specialist…", icon: "users" },
  human_ask: { title: "Needs your input…", icon: "message-circle" },
  memory_read_working: { title: "Checking memory…", icon: "brain" },
  memory_write_working: { title: "Saving progress…", icon: "save" },
  memory_store_knowledge: { title: "Remembering this for later…", icon: "bookmark" },
  deep_research_railway: { title: "Starting deep research…", icon: "microscope" },
  computer_use: { title: "Working on the computer…", icon: "monitor" },
  ls: { title: "Browsing folders…", icon: "folder" },
};

// ── State ──────────────────────────────────────────
const runCache = new Map<string, RunCache>();
const clients = new Set<WebSocket>();
let upstreamHealthy = false;
let lastRunsDigest = "";
let activePollInFlight = false;
let completedPollInFlight = false;
let warnedMissingApiBaseUrl = false;

function log(message: string, ...args: unknown[]) {
  console.log(`[activity-feed] ${message}`, ...args);
}

function broadcast(msg: WsMessage) {
  const data = JSON.stringify(msg);
  for (const ws of Array.from(clients)) {
    if (ws.readyState !== WebSocket.OPEN) continue;
    try {
      ws.send(data);
    } catch {
      clients.delete(ws);
      try {
        ws.close();
      } catch {
        // ignore close errors
      }
    }
  }
}

function broadcastHealth() {
  broadcast({
    type: "ping",
    data: {
      upstreamHealthy,
      timestamp: Date.now(),
    },
  });
}

function getSpecialistName(task: string): string {
  const t = task.toLowerCase();
  if (t.includes("research") || t.includes("find") || t.includes("search")) return "Researcher";
  if (t.includes("write") || t.includes("create") || t.includes("build") || t.includes("implement")) return "Builder";
  if (t.includes("fix") || t.includes("debug") || t.includes("error")) return "Troubleshooter";
  if (t.includes("deploy") || t.includes("ship") || t.includes("launch")) return "Deployer";
  if (t.includes("review") || t.includes("check") || t.includes("verify")) return "Reviewer";
  if (t.includes("analyze") || t.includes("report") || t.includes("data")) return "Analyst";
  return "Assistant";
}

function setUpstreamHealthy(next: boolean) {
  if (upstreamHealthy === next) return;
  upstreamHealthy = next;
  log(`upstream ${next ? "healthy" : "unhealthy"}`);
  broadcastHealth();
}

function maybeParseJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return value;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function firstDefined(source: Record<string, unknown> | null, keys: string[]): unknown {
  if (!source) return undefined;
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) return source[key];
  }
  return undefined;
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function toTimestamp(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1_000_000_000_000 ? value * 1000 : value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return 0;

    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
    }

    const parsed = Date.parse(trimmed);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

function summarizeValue(value: unknown, maxLength = 500): string {
  if (value == null) return "";
  if (typeof value === "string") {
    return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
  }
  try {
    const json = JSON.stringify(value);
    return json.length <= maxLength ? json : `${json.slice(0, maxLength - 1)}…`;
  } catch {
    const text = String(value);
    return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
  }
}

function extractTaskFromUnknown(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    const parsed = maybeParseJson(trimmed);
    if (parsed !== value) return extractTaskFromUnknown(parsed);
    return trimmed;
  }

  const record = asRecord(value);
  if (!record) return "";

  const direct = firstString(
    firstDefined(record, ["task", "task_raw", "taskRaw", "title", "prompt"]),
  );
  if (direct) return direct;

  const payload = asRecord(record.payload);
  if (payload) {
    const nested = extractTaskFromUnknown(payload);
    if (nested) return nested;
  }

  const data = asRecord(record.data);
  if (data) {
    const nested = extractTaskFromUnknown(data);
    if (nested) return nested;
  }

  return "";
}

function extractTask(run: Record<string, unknown>): string {
  const task = extractTaskFromUnknown(
    firstDefined(run, ["task", "task_raw", "taskRaw", "context_raw", "contextRaw", "payload", "data"]),
  );
  return task || "Working on something…";
}

function normalizeRunStatus(value: unknown): string {
  const status = firstString(value).toLowerCase();
  if (!status) return "running";
  if (["running", "checkpointed", "completed", "failed"].includes(status)) return status;
  if (["done", "ok", "success", "succeeded"].includes(status)) return "completed";
  if (["error", "errored"].includes(status)) return "failed";
  return status;
}

function isTerminalStatus(status: string): boolean {
  return status === "completed" || status === "failed";
}

function isActiveStatus(status: string): boolean {
  return status === "running" || status === "checkpointed";
}

function isDoneLikeStatus(status: string): boolean {
  return ["done", "ok", "success", "completed", "committed", "executed"].includes(status);
}

function isErrorLikeStatus(status: string): boolean {
  return ["error", "failed", "failure", "compensated", "cancelled"].includes(status);
}

function isLlmLike(value: string): boolean {
  const normalized = value.toLowerCase();
  return normalized.includes("llm") || normalized.includes("model") || normalized.includes("reasoning");
}

function extractList(payload: unknown, keys: string[]): Array<Record<string, unknown>> {
  if (Array.isArray(payload)) return payload.map(asRecord).filter(Boolean) as Array<Record<string, unknown>>;
  const record = asRecord(payload);
  if (!record) return [];

  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value.map(asRecord).filter(Boolean) as Array<Record<string, unknown>>;
    }
  }

  return [];
}

function extractRunId(run: Record<string, unknown>): string {
  return firstString(firstDefined(run, ["runId", "run_id", "id"]));
}

function extractRunTimestamps(run: Record<string, unknown>): { startedAt: number; updatedAt: number } {
  const startedAt =
    toTimestamp(firstDefined(run, ["startedAt", "started_at", "createdAt", "created_at"])) || Date.now();
  const updatedAt =
    toTimestamp(firstDefined(run, ["updatedAt", "updated_at", "lastHeartbeatAt", "last_heartbeat_at"])) || startedAt;
  return { startedAt, updatedAt };
}

function collectEventSources(event: Record<string, unknown>): Array<Record<string, unknown>> {
  const sources: Array<Record<string, unknown>> = [event];

  const directData = asRecord(maybeParseJson(event.data));
  if (directData) sources.push(directData);

  const inputSummary = asRecord(maybeParseJson(firstDefined(event, ["inputSummary", "input_summary"])));
  if (inputSummary) sources.push(inputSummary);

  const payload = asRecord(maybeParseJson(firstDefined(event, ["payload"])));
  if (payload) sources.push(payload);

  return sources;
}

function extractEventTimestamp(event: Record<string, unknown>, sources: Array<Record<string, unknown>>): number {
  const fromEvent = toTimestamp(
    firstDefined(event, ["ts", "timestamp", "created_at", "createdAt", "committed_at", "updated_at", "updatedAt"]),
  );
  if (fromEvent > 0) return fromEvent;

  for (const source of sources) {
    const ts = toTimestamp(firstDefined(source, ["ts", "timestamp", "created_at", "createdAt", "updated_at", "updatedAt"]));
    if (ts > 0) return ts;
  }

  return Date.now();
}

function extractToolName(event: Record<string, unknown>, sources: Array<Record<string, unknown>>): string {
  for (const source of sources) {
    const toolName = firstString(firstDefined(source, ["toolName", "tool_name", "tool", "name"]));
    if (toolName) return toolName;
  }
  return "";
}

function extractToolArgs(event: Record<string, unknown>, sources: Array<Record<string, unknown>>): string {
  const candidateKeys = [
    "commandPreview",
    "command_preview",
    "command",
    "path",
    "query",
    "pattern",
    "args",
    "url",
    "text",
    "task",
    "glob",
    "role",
    "input",
    "prompt",
  ];

  for (const source of sources) {
    const value = firstDefined(source, candidateKeys);
    if (value !== undefined && value !== null && summarizeValue(value)) {
      return summarizeValue(value);
    }
  }

  const structured = maybeParseJson(firstDefined(event, ["inputSummary", "input_summary", "data"]));
  return summarizeValue(structured);
}

function normalizeEventType(event: Record<string, unknown>, toolName: string, sources: Array<Record<string, unknown>>): string {
  const rawType = firstString(firstDefined(event, ["type", "eventType", "event_type", "kind"])).toLowerCase();
  const status = firstString(firstDefined(event, ["status", "state"])).toLowerCase();
  const messageType = firstString(firstDefined(event, ["messageType", "message_type"]));

  const mappedTypes: Record<string, string> = {
    tool_start: "tool.start",
    tool_end: "tool.done",
    tool_done: "tool.done",
    tool_error: "tool.error",
    llm_start: "llm.start",
    llm_end: "llm.done",
    llm_done: "llm.done",
    actor_stopped: "run.done",
    async_task_dispatched: "subagent.spawn",
    async_task_started: "subagent.done",
  };

  if (rawType) {
    if (mappedTypes[rawType]) return mappedTypes[rawType];
    const dotted = rawType.replace(/_/g, ".");
    if (dotted === "message.sent" && messageType === "TaskResult") return "run.done";
    if ((dotted === "message.sent" || dotted === "message.received") && messageType === "TaskRequest") return "run.start";
    if (dotted.includes("llm")) return dotted.includes("done") || dotted.includes("end") ? "llm.done" : "llm.start";
    if (dotted.includes("tool") && dotted.includes("error")) return "tool.error";
    if (dotted.includes("tool") && (dotted.includes("done") || dotted.includes("end"))) return "tool.done";
    if (dotted.includes("tool") && dotted.includes("start")) return "tool.start";
    if (["subagent.spawn", "subagent.done", "human.ask", "human.answer", "run.start", "run.done"].includes(dotted)) {
      return dotted;
    }
  }

  if (isLlmLike(toolName)) {
    return isDoneLikeStatus(status) ? "llm.done" : "llm.start";
  }

  for (const source of sources) {
    const nestedType = firstString(firstDefined(source, ["type", "kind"])).toLowerCase();
    if (nestedType.includes("llm")) return nestedType.includes("done") || nestedType.includes("end") ? "llm.done" : "llm.start";
  }

  if (isErrorLikeStatus(status)) return "tool.error";
  if (isDoneLikeStatus(status)) return "tool.done";
  return "tool.start";
}

function normalizeEventStatus(event: Record<string, unknown>): string {
  return firstString(firstDefined(event, ["status", "state"])).toLowerCase();
}

function normalizeApiEvent(event: Record<string, unknown>, runId: string, fallbackId: string): NormalizedEvent {
  const sources = collectEventSources(event);
  const toolName = extractToolName(event, sources);
  const type = normalizeEventType(event, toolName, sources);
  const timestamp = extractEventTimestamp(event, sources);
  const toolArgs = extractToolArgs(event, sources);
  const status = normalizeEventStatus(event);

  const id = firstString(firstDefined(event, ["id", "eventId", "event_id", "tx_id"])) || fallbackId;

  return {
    id,
    runId,
    timestamp,
    type,
    status,
    toolName,
    toolArgs,
  };
}

function calculateProgressFromEventCount(eventCount: number, terminal: boolean): number {
  if (terminal) return 100;
  if (eventCount <= 0) return 5;
  return Math.min(10 + eventCount * 8, 95);
}

function translateEvent(event: NormalizedEvent, currentProgress: number, nextProgress: number): ActivityItem {
  const base: ActivityItem = {
    id: event.id,
    runId: event.runId,
    timestamp: event.timestamp,
    phase: "working",
    title: "Working on the next step…",
    icon: "sparkles",
    isActive: true,
  };

  switch (event.type) {
    case "run.start":
      return {
        ...base,
        phase: "queued",
        title: "Starting to work on your request…",
        icon: "rocket",
        progress: 5,
      };

    case "llm.start":
      return {
        ...base,
        phase: "understanding",
        title: "Thinking about your request…",
        description: "Thinking about your request…",
        icon: "brain",
        progress: nextProgress,
      };

    case "llm.done":
      return {
        ...base,
        phase: "working",
        title: "Figured out the next step…",
        description: "Figured out the next step…",
        icon: "lightbulb",
        isActive: false,
        progress: nextProgress,
      };

    case "tool.error":
      return {
        ...base,
        phase: "working",
        title: "Hit a small bump — working around it…",
        description: event.toolName ? toolFriendlyNames[event.toolName]?.title || event.toolName : undefined,
        icon: "alert-triangle",
        toolName: event.toolName || undefined,
        toolArgs: event.toolArgs || undefined,
        progress: currentProgress,
      };

    case "tool.done": {
      const friendly = toolFriendlyNames[event.toolName] || {
        title: "Completed a step",
        icon: "check",
      };
      return {
        ...base,
        title: friendly.title.replace("…", " ✓"),
        description: friendly.title,
        icon: "check",
        isActive: false,
        toolName: event.toolName || undefined,
        toolArgs: event.toolArgs || undefined,
        progress: nextProgress,
      };
    }

    case "subagent.spawn":
      return {
        ...base,
        title: "A specialist is helping out…",
        icon: "users",
        toolName: event.toolName || "run_subagent",
        toolArgs: event.toolArgs || undefined,
        progress: nextProgress,
      };

    case "subagent.done":
      return {
        ...base,
        title: "Specialist finished their part ✓",
        icon: "user-check",
        isActive: false,
        toolName: event.toolName || "run_subagent",
        toolArgs: event.toolArgs || undefined,
        progress: nextProgress,
      };

    case "human.ask":
      return {
        ...base,
        phase: "reviewing",
        title: "Needs your input on something…",
        icon: "message-circle",
        progress: currentProgress,
      };

    case "human.answer":
      return {
        ...base,
        phase: "working",
        title: "Got your input — continuing…",
        icon: "check-circle",
        progress: nextProgress,
      };

    case "run.done": {
      const success = ["ok", "done", "completed", "success", "succeeded"].includes(event.status);
      if (success) {
        return {
          ...base,
          phase: "complete",
          title: "All done! ✓",
          icon: "check-circle",
          isActive: false,
          progress: 100,
        };
      }
      return {
        ...base,
        phase: "error",
        title: "Something went wrong — we're on it",
        icon: "alert-triangle",
        isActive: false,
        progress: currentProgress,
      };
    }

    default: {
      const friendly = toolFriendlyNames[event.toolName] || {
        title: "Working on the next step…",
        icon: "sparkles",
      };
      return {
        ...base,
        title: friendly.title,
        description: friendly.title,
        icon: friendly.icon,
        toolName: event.toolName || undefined,
        toolArgs: event.toolArgs || undefined,
        progress: nextProgress,
      };
    }
  }
}

function trimActivities(activities: ActivityItem[]): ActivityItem[] {
  if (activities.length <= RUN_ACTIVITY_LIMIT) return activities;
  return activities.slice(-RUN_ACTIVITY_LIMIT);
}

function sortRuns(runs: RunOverview[]): RunOverview[] {
  return [...runs].sort((a, b) => {
    const aTerminal = a.phase === "complete" || a.phase === "error";
    const bTerminal = b.phase === "complete" || b.phase === "error";
    if (aTerminal !== bTerminal) return aTerminal ? 1 : -1;
    return b.updatedAt - a.updatedAt;
  });
}

function getRunsSnapshot(): RunOverview[] {
  return sortRuns(Array.from(runCache.values(), (entry) => entry.run));
}

function maybeBroadcastRuns(force = false) {
  const runs = getRunsSnapshot();
  const digest = runs
    .map((run) => `${run.runId}:${run.updatedAt}:${run.phase}:${run.progress}:${run.activities.length}`)
    .join("|");

  if (!force && digest === lastRunsDigest) return;
  lastRunsDigest = digest;
  broadcast({ type: "runs", data: runs });
}

function calculateRunPhase(status: string, activities: ActivityItem[]): RunPhase {
  if (status === "completed") return "complete";
  if (status === "failed") return "error";
  if (activities.length === 0) return "queued";

  const latest = activities[activities.length - 1];
  if (latest.phase === "understanding" || isLlmLike(latest.toolName || "") || latest.icon === "brain") {
    return "understanding";
  }
  if (latest.phase === "reviewing") return "reviewing";
  return "working";
}

function buildRunOverview(apiRun: Record<string, unknown>, activities: ActivityItem[], fallback?: RunOverview): RunOverview {
  const runId = extractRunId(apiRun) || fallback?.runId || "unknown";
  const task = extractTask(apiRun) || fallback?.task || "Working on something…";
  const status = normalizeRunStatus(firstDefined(apiRun, ["status"]));
  const timestamps = extractRunTimestamps(apiRun);
  const trimmedActivities = trimActivities(activities);
  const phase = calculateRunPhase(status, trimmedActivities);
  const progress = calculateProgressFromEventCount(trimmedActivities.length, isTerminalStatus(status));
  const latestActivityTs = trimmedActivities.length > 0 ? trimmedActivities[trimmedActivities.length - 1].timestamp : 0;

  return {
    runId,
    task,
    phase,
    progress,
    startedAt: fallback?.startedAt || timestamps.startedAt,
    updatedAt: Math.max(fallback?.updatedAt || 0, timestamps.updatedAt, latestActivityTs),
    activities: trimmedActivities,
    specialist: getSpecialistName(task),
  };
}

function buildApiUrl(pathname: string, params?: Record<string, string | number | undefined>): string {
  if (!ACTOR_API_BASE_URL) {
    throw new Error("ACTOR_API_BASE_URL is not configured");
  }

  const base = ACTOR_API_BASE_URL.endsWith("/") ? ACTOR_API_BASE_URL : `${ACTOR_API_BASE_URL}/`;
  const url = new URL(pathname.replace(/^\//, ""), base);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

async function fetchJson(pathname: string, params?: Record<string, string | number | undefined>): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(buildApiUrl(pathname, params), {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(DASHBOARD_API_KEY ? { Authorization: `Bearer ${DASHBOARD_API_KEY}` } : {}),
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchRuns(statuses: string, limit: number): Promise<Array<Record<string, unknown>>> {
  const payload = await fetchJson("/api/runs", { limit, status: statuses });
  return extractList(payload, ["runs", "data", "items", "results"]);
}

async function fetchRunEvents(runId: string, after: number): Promise<Array<Record<string, unknown>>> {
  const payload = await fetchJson(`/api/runs/${encodeURIComponent(runId)}/events`, {
    after,
  });
  return extractList(payload, ["events", "data", "items", "results"]);
}

function pruneCompletedRuns() {
  const cutoff = Date.now() - COMPLETED_RETENTION_MS;
  let removed = false;

  for (const [runId, cache] of Array.from(runCache.entries())) {
    const terminal = cache.run.phase === "complete" || cache.run.phase === "error";
    if (terminal && cache.run.updatedAt < cutoff) {
      runCache.delete(runId);
      removed = true;
    }
  }

  if (removed) maybeBroadcastRuns(true);
}

async function reconcileRuns(apiRuns: Array<Record<string, unknown>>): Promise<boolean> {
  const now = Date.now();
  const plans = apiRuns
    .map((apiRun) => {
      const runId = extractRunId(apiRun);
      if (!runId) return null;

      const existing = runCache.get(runId);
      const status = normalizeRunStatus(firstDefined(apiRun, ["status"]));
      const { updatedAt } = extractRunTimestamps(apiRun);
      const shouldFetchEvents =
        !existing ||
        updatedAt !== existing.run.updatedAt ||
        now - existing.lastFetchedAt >= STALE_EVENT_REFETCH_MS ||
        (isActiveStatus(status) && existing.run.activities.length === 0);

      return {
        apiRun,
        runId,
        existing,
        status,
        shouldFetchEvents,
      };
    })
    .filter(Boolean) as Array<{
      apiRun: Record<string, unknown>;
      runId: string;
      existing: RunCache | undefined;
      status: string;
      shouldFetchEvents: boolean;
    }>;

  const fetchResults = await Promise.allSettled(
    plans.map((plan) => (plan.shouldFetchEvents ? fetchRunEvents(plan.runId, plan.existing?.lastEventTs ?? 0) : Promise.resolve([]))),
  );

  let hadFetchError = false;
  let changed = false;

  for (let index = 0; index < plans.length; index += 1) {
    const plan = plans[index];
    const result = fetchResults[index];
    const existingActivities = [...(plan.existing?.run.activities ?? [])];
    const existingIds = new Set(existingActivities.map((activity) => activity.id));
    let activities = existingActivities;
    let lastEventTs = plan.existing?.lastEventTs ?? 0;

    if (result.status === "rejected") {
      hadFetchError = true;
      log(`failed to fetch events for run ${plan.runId}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
    } else {
      const normalizedEvents = result.value
        .map((event, eventIndex) => normalizeApiEvent(event, plan.runId, `${plan.runId}:${eventIndex}:${Date.now()}`))
        .sort((a, b) => (a.timestamp === b.timestamp ? a.id.localeCompare(b.id) : a.timestamp - b.timestamp));

      for (const event of Array.from(normalizedEvents)) {
        lastEventTs = Math.max(lastEventTs, event.timestamp);
        if (existingIds.has(event.id)) continue;

        const currentProgress = calculateProgressFromEventCount(activities.length, false);
        const nextProgress = calculateProgressFromEventCount(activities.length + 1, false);
        const activity = translateEvent(event, currentProgress, nextProgress);

        activities = trimActivities([...activities, activity]);
        existingIds.add(event.id);
        changed = true;

        broadcast({ type: "activity", data: activity });
      }
    }

    const nextRun = buildRunOverview(plan.apiRun, activities, plan.existing?.run);
    const previousRun = plan.existing?.run;

    runCache.set(plan.runId, {
      run: nextRun,
      lastEventTs,
      lastFetchedAt: Date.now(),
    });

    if (
      !previousRun ||
      previousRun.updatedAt !== nextRun.updatedAt ||
      previousRun.phase !== nextRun.phase ||
      previousRun.progress !== nextRun.progress ||
      previousRun.task !== nextRun.task ||
      previousRun.activities.length !== nextRun.activities.length
    ) {
      changed = true;
      broadcast({ type: "run.update", data: nextRun });
    }
  }

  if (hadFetchError) setUpstreamHealthy(false);
  return changed;
}

async function pollRunSet(statuses: string, limit: number, mode: "active" | "completed") {
  if (!ACTOR_API_BASE_URL) {
    if (!warnedMissingApiBaseUrl) {
      warnedMissingApiBaseUrl = true;
      log("ACTOR_API_BASE_URL is not set — running in no-data mode");
    }
    setUpstreamHealthy(false);
    if (runCache.size > 0) {
      runCache.clear();
      maybeBroadcastRuns(true);
    }
    return;
  }

  try {
    const runs = await fetchRuns(statuses, limit);
    const changed = await reconcileRuns(runs);
    if (!upstreamHealthy) setUpstreamHealthy(true);
    if (changed) maybeBroadcastRuns(true);
    else if (mode === "completed") maybeBroadcastRuns(false);
  } catch (error) {
    setUpstreamHealthy(false);
    log(`poll ${mode} runs failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    pruneCompletedRuns();
  }
}

async function pollActiveRuns() {
  if (activePollInFlight) return;
  activePollInFlight = true;
  try {
    await pollRunSet("running,checkpointed", ACTIVE_RUN_LIMIT, "active");
  } finally {
    activePollInFlight = false;
  }
}

async function pollCompletedRuns() {
  if (completedPollInFlight) return;
  completedPollInFlight = true;
  try {
    await pollRunSet("completed,failed", COMPLETED_RUN_LIMIT, "completed");
  } finally {
    completedPollInFlight = false;
  }
}

function startPolling() {
  void pollActiveRuns();
  void pollCompletedRuns();

  setInterval(() => {
    void pollActiveRuns();
  }, ACTIVE_POLL_INTERVAL_MS);

  setInterval(() => {
    void pollCompletedRuns();
  }, COMPLETED_POLL_INTERVAL_MS);
}

// ── Main ───────────────────────────────────────────
app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url || "", true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const { pathname } = parse(request.url || "", true);
    if (pathname === "/ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (ws) => {
    clients.add(ws);
    log(`client connected (${clients.size} total)`);

    ws.send(JSON.stringify({ type: "runs", data: getRunsSnapshot() } satisfies WsMessage));
    ws.send(JSON.stringify({
      type: "ping",
      data: {
        upstreamHealthy,
        timestamp: Date.now(),
      },
    } satisfies WsMessage));

    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "ping",
          data: {
            upstreamHealthy,
            timestamp: Date.now(),
          },
        } satisfies WsMessage));
      }
    }, 30_000);

    const cleanup = () => {
      clients.delete(ws);
      clearInterval(pingInterval);
    };

    ws.on("close", () => {
      cleanup();
      log(`client disconnected (${clients.size} total)`);
    });

    ws.on("error", () => {
      cleanup();
    });
  });

  server.listen(port, hostname, () => {
    console.log("\n  ┌──────────────────────────────────────┐");
    console.log("  │  olo Activity Feed                    │");
    console.log(`  │  http://${hostname}:${port}            │`);
    console.log(`  │  WebSocket: ws://${hostname}:${port}/ws │`);
    console.log("  └──────────────────────────────────────┘\n");
    log(`actor API: ${ACTOR_API_BASE_URL || "(not configured)"}`);
    log(`dashboard auth header: ${DASHBOARD_API_KEY ? "enabled" : "disabled"}`);
  });

  startPolling();
});
