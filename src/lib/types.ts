export type { RunPhase, ActivityItem, RunOverview } from "./activity-types";

export type RunSummary = {
  runId: string;
  startedAt?: number;
  lastAt?: number;
  lastToolName?: string;
  lastToolStartAt?: number;
  lastEventType?: string;
  lastActor?: string;
  lastMessageType?: string;
  taskPreview?: string;
  summaryPreview?: string;
  primaryStatus?: string;
  tags: string[];
  llmInFlight?: number;
  humanInFlight?: number;
  toolInFlight?: number;
  stuckFlag?: boolean;
  hasDlq?: boolean;
  hasHandlerErrors?: boolean;
  hasRetries?: boolean;
  doneStatus?: string;
};

export type TelemetryEvent = {
  id: string;
  type: string;
  ts: number;
  runId?: string;
  actor?: string;
  messageType?: string;
  data?: Record<string, any>;
};

export type RunDetail = {
  summary: RunSummary | null;
  events: TelemetryEvent[];
  actions: TelemetryEvent[];
  tasks: Array<{
    kind: "request" | "result";
    taskId?: string;
    status?: string;
    text?: string;
    ts: number;
  }>;
  actors: string[];
};

export type FullTraceSection = {
  id: string;
  kind: string;
  header: string;
  content: string;
  chars: number;
};

export type FullTraceDetail = {
  available: boolean;
  source: "redis" | "none";
  temporarilyUnavailable?: boolean;
  message?: string;
  runId: string;
  status?: "ok" | "failed" | "skipped";
  actor?: string;
  timestamp?: string;
  task?: string;
  taskContext?: string;
  result?: string;
  error?: string;
  truncated: boolean;
  redactionVersion?: string;
  redactionCount?: number;
  sections: FullTraceSection[];
  stats?: {
    messageCount?: number;
    toolTraceCount?: number;
    sectionCount: number;
    charCount: number;
    droppedSections?: number;
  };
};

export type ActorEntry = {
  address: string;
  name: string;
  description?: string;
  capabilities: string[];
  updatedAt: number;
  status: "alive" | "stale";
};

export type DlqEntry = {
  id: string;
  runId?: string;
  actor?: string;
  messageType?: string;
  reason?: string;
  ts: number;
};
