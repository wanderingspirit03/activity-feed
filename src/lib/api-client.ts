/**
 * HTTP client for the actor-system API.
 * Replaces the old Redis client — all data now comes from SQLite via HTTP.
 */

const ACTOR_API_BASE_URL = (process.env.ACTOR_API_BASE_URL || "http://localhost:3101").replace(/\/+$/, "");
const DASHBOARD_API_KEY = process.env.DASHBOARD_API_KEY || "";
const DEFAULT_TIMEOUT_MS = 10_000;

export async function apiFetch<T = unknown>(
  path: string,
  options?: { timeout?: number },
): Promise<T> {
  const url = `${ACTOR_API_BASE_URL}${path}`;
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT_MS;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(DASHBOARD_API_KEY ? { Authorization: `Bearer ${DASHBOARD_API_KEY}` } : {}),
    },
    signal: AbortSignal.timeout(timeout),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`API ${response.status}: ${text.slice(0, 200)}`);
  }

  return response.json() as Promise<T>;
}

export function getApiBaseUrl(): string {
  return ACTOR_API_BASE_URL;
}

export function isApiConfigured(): boolean {
  return Boolean(ACTOR_API_BASE_URL && ACTOR_API_BASE_URL !== "http://localhost:3101");
}
