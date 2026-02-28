"use client";

import { useCallback, useEffect, useRef } from "react";

import { useLiveStore } from "@/stores/live-store";

const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

export function useWebsocket() {
	const isConnected = useLiveStore((state) => state.isConnected);
	const addEvent = useLiveStore((state) => state.addEvent);
	const setConnected = useLiveStore((state) => state.setConnected);

	const socketRef = useRef<WebSocket | null>(null);
	const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const backoffRef = useRef(INITIAL_BACKOFF_MS);
	const shouldReconnectRef = useRef(true);

	const clearReconnectTimer = () => {
		if (!reconnectTimerRef.current) return;
		clearTimeout(reconnectTimerRef.current);
		reconnectTimerRef.current = null;
	};

	const connect = useCallback(() => {
		if (typeof window === "undefined") return;
		if (
			socketRef.current &&
			(socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)
		) {
			return;
		}

		clearReconnectTimer();
		const ws = new WebSocket(`wss://${window.location.host}/ws`);
		socketRef.current = ws;

		ws.onopen = () => {
			backoffRef.current = INITIAL_BACKOFF_MS;
			setConnected(true);
		};

		ws.onmessage = (messageEvent) => {
			try {
				const parsed = JSON.parse(messageEvent.data as string);
				addEvent(parsed);
			} catch {
				// Ignore malformed WS payloads.
			}
		};

		ws.onerror = () => {
			ws.close();
		};

		ws.onclose = () => {
			setConnected(false);
			socketRef.current = null;
			if (!shouldReconnectRef.current) return;

			const delay = backoffRef.current;
			backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
			reconnectTimerRef.current = setTimeout(() => {
				connect();
			}, delay);
		};
	}, [addEvent, setConnected]);

	const reconnect = useCallback(() => {
		backoffRef.current = INITIAL_BACKOFF_MS;
		clearReconnectTimer();
		socketRef.current?.close();
		connect();
	}, [connect]);

	useEffect(() => {
		shouldReconnectRef.current = true;
		connect();

		return () => {
			shouldReconnectRef.current = false;
			clearReconnectTimer();
			socketRef.current?.close();
			socketRef.current = null;
			setConnected(false);
		};
	}, [connect, setConnected]);

	return { isConnected, reconnect };
}
