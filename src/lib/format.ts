export function formatRelative(ms: number): string {
  if (!Number.isFinite(ms)) return "-";
  const diff = Date.now() - ms;
  if (diff < 1000) return "now";
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function formatTimestamp(ms: number): string {
  if (!Number.isFinite(ms)) return "-";
  const date = new Date(ms);
  return date.toLocaleString();
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms)) return "-";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = ms / 60_000;
  if (minutes < 60) return `${minutes.toFixed(1)}m`;
  const hours = minutes / 60;
  return `${hours.toFixed(1)}h`;
}

export type TimestampInput = Date | string | number;

function toTimestampMs(input: TimestampInput): number {
  if (input instanceof Date) return input.getTime();
  if (typeof input === "string") return new Date(input).getTime();

  if (!Number.isFinite(input)) return Number.NaN;

  // Treat numeric Unix timestamps as seconds when value looks like seconds.
  return Math.abs(input) < 1_000_000_000_000 ? input * 1000 : input;
}

function pluralize(value: number, unit: "minute" | "hour"): string {
  return `${value} ${unit}${value === 1 ? "" : "s"} ago`;
}

export function formatRelativeTimestamp(input: TimestampInput): string {
  const timestampMs = toTimestampMs(input);
  if (!Number.isFinite(timestampMs)) return "-";

  const diffMs = Math.max(0, Date.now() - timestampMs);

  if (diffMs < 60_000) return "just now";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return pluralize(minutes, "minute");

  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 24) return pluralize(hours, "hour");
  if (hours < 48) return "yesterday";

  return new Date(timestampMs).toLocaleDateString();
}
