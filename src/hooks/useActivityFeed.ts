"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RunOverview, WsMessage } from "@/lib/types";

const POLL_INTERVAL_MS = 5_000;
const WS_CONNECT_TIMEOUT_MS = 3_000;
const RECONNECT_DELAY_MIN_MS = 1_000;
const RECONNECT_DELAY_MAX_MS = 30_000;

type RunsApiResponse =
	| RunOverview[]
	| {
			runs?: RunOverview[];
			total?: number;
			error?: string;
	  };

function extractRuns(payload: RunsApiResponse): RunOverview[] {
	if (Array.isArray(payload)) return payload;
	if (Array.isArray(payload?.runs)) return payload.runs;
	return [];
}

export function useActivityFeed() {
	const [runs, setRuns] = useState<RunOverview[]>([]);
	const [isConnected, setIsConnected] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const pollingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
	const connectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
	const reconnectDelay = useRef(RECONNECT_DELAY_MIN_MS);

	const clearReconnectTimer = useCallback(() => {
		if (reconnectTimer.current) {
			clearTimeout(reconnectTimer.current);
			reconnectTimer.current = null;
		}
	}, []);

	const clearPollingTimer = useCallback(() => {
		if (pollingTimer.current) {
			clearInterval(pollingTimer.current);
			pollingTimer.current = null;
		}
	}, []);

	const clearConnectTimeout = useCallback(() => {
		if (connectTimeout.current) {
			clearTimeout(connectTimeout.current);
			connectTimeout.current = null;
		}
	}, []);

	const handleMessage = useCallback((msg: WsMessage) => {
		switch (msg.type) {
			case "runs":
				setRuns(msg.data);
				break;
			case "run.update":
				setRuns((prev) => {
					const idx = prev.findIndex((r) => r.runId === msg.data.runId);
					if (idx >= 0) {
						const next = [...prev];
						next[idx] = msg.data;
						return next;
					}
					return [msg.data, ...prev];
				});
				break;
			case "activity":
				setRuns((prev) =>
					prev.map((r) => {
						if (r.runId !== msg.data.runId) return r;
						return {
							...r,
							activities: [...r.activities, msg.data],
							phase: msg.data.phase,
							progress: msg.data.progress ?? r.progress,
							updatedAt: Date.now(),
						};
					}),
				);
				break;
			case "ping":
				break;
		}
	}, []);

	const fetchRuns = useCallback(async () => {
		try {
			const response = await fetch(`${window.location.origin}/api/runs`, {
				headers: {
					Accept: "application/json",
				},
				cache: "no-store",
			});

			if (!response.ok) {
				throw new Error(`Polling failed (${response.status})`);
			}

			const payload = (await response.json()) as RunsApiResponse;
			setRuns(extractRuns(payload));
			setIsConnected(true);
			setError(null);
		} catch (err) {
			setIsConnected(false);
			setError(err instanceof Error ? err.message : "Failed to fetch runs");
		}
	}, []);

	const startPolling = useCallback(() => {
		if (pollingTimer.current) return;
		void fetchRuns();
		pollingTimer.current = setInterval(() => {
			void fetchRuns();
		}, POLL_INTERVAL_MS);
	}, [fetchRuns]);

	const stopPolling = useCallback(() => {
		clearPollingTimer();
	}, [clearPollingTimer]);

	const connect = useCallback(() => {
		clearReconnectTimer();
		clearConnectTimeout();

		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const wsUrl = `${protocol}//${window.location.host}/ws`;

		try {
			const ws = new WebSocket(wsUrl);
			wsRef.current = ws;

			connectTimeout.current = setTimeout(() => {
				if (ws.readyState !== WebSocket.OPEN) {
					setError("WebSocket connection timed out — polling for updates");
					startPolling();
					ws.close();
				}
			}, WS_CONNECT_TIMEOUT_MS);

			ws.onopen = () => {
				clearConnectTimeout();
				stopPolling();
				setIsConnected(true);
				setError(null);
				reconnectDelay.current = RECONNECT_DELAY_MIN_MS;
			};

			ws.onmessage = (event) => {
				try {
					const msg: WsMessage = JSON.parse(event.data);
					handleMessage(msg);
				} catch {
					// Ignore malformed messages.
				}
			};

			ws.onerror = () => {
				setError("WebSocket unavailable — polling for updates");
				startPolling();
			};

			ws.onclose = () => {
				clearConnectTimeout();
				wsRef.current = null;
				setIsConnected(false);
				startPolling();
				reconnectTimer.current = setTimeout(() => {
					reconnectDelay.current = Math.min(reconnectDelay.current * 1.5, RECONNECT_DELAY_MAX_MS);
					connect();
				}, reconnectDelay.current);
			};
		} catch {
			setError("WebSocket unavailable — polling for updates");
			setIsConnected(false);
			startPolling();
		}
	}, [clearConnectTimeout, clearReconnectTimer, handleMessage, startPolling, stopPolling]);

	useEffect(() => {
		connect();

		return () => {
			clearReconnectTimer();
			clearConnectTimeout();
			stopPolling();
			if (wsRef.current) {
				wsRef.current.close();
				wsRef.current = null;
			}
		};
	}, [clearConnectTimeout, clearReconnectTimer, connect, stopPolling]);

	return { runs, isConnected, error };
}
