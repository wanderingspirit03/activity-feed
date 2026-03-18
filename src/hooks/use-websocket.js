"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.useWebsocket = useWebsocket;
var react_1 = require("react");
var live_store_1 = require("@/stores/live-store");
var ops_store_1 = require("@/stores/ops-store");
var INITIAL_BACKOFF_MS = 1000;
var MAX_BACKOFF_MS = 30000;
function useWebsocket() {
	var isConnected = (0, live_store_1.useLiveStore)((state) => state.isConnected);
	var addEvent = (0, live_store_1.useLiveStore)((state) => state.addEvent);
	var setConnected = (0, live_store_1.useLiveStore)((state) => state.setConnected);
	var socketRef = (0, react_1.useRef)(null);
	var reconnectTimerRef = (0, react_1.useRef)(null);
	var backoffRef = (0, react_1.useRef)(INITIAL_BACKOFF_MS);
	var shouldReconnectRef = (0, react_1.useRef)(true);
	var clearReconnectTimer = () => {
		if (!reconnectTimerRef.current) return;
		clearTimeout(reconnectTimerRef.current);
		reconnectTimerRef.current = null;
	};
	var connect = (0, react_1.useCallback)(() => {
		if (typeof window === "undefined") return;
		if (
			socketRef.current &&
			(socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)
		) {
			return;
		}
		clearReconnectTimer();
		var ws = new WebSocket("wss://".concat(window.location.host, "/ws"));
		socketRef.current = ws;
		ws.onopen = () => {
			backoffRef.current = INITIAL_BACKOFF_MS;
			setConnected(true);
		};
		ws.onmessage = (messageEvent) => {
			var _a;
			try {
				var parsed = JSON.parse(messageEvent.data);
				addEvent(parsed);
				if ((_a = parsed.type) === null || _a === void 0 ? void 0 : _a.startsWith("ops.")) {
					ops_store_1.useOpsStore.getState().processEvent(parsed);
				}
			} catch (_b) {
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
			var delay = backoffRef.current;
			backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
			reconnectTimerRef.current = setTimeout(() => {
				connect();
			}, delay);
		};
	}, [addEvent, setConnected]);
	var reconnect = (0, react_1.useCallback)(() => {
		var _a;
		backoffRef.current = INITIAL_BACKOFF_MS;
		clearReconnectTimer();
		(_a = socketRef.current) === null || _a === void 0 ? void 0 : _a.close();
		connect();
	}, [connect]);
	(0, react_1.useEffect)(() => {
		shouldReconnectRef.current = true;
		connect();
		return () => {
			var _a;
			shouldReconnectRef.current = false;
			clearReconnectTimer();
			(_a = socketRef.current) === null || _a === void 0 ? void 0 : _a.close();
			socketRef.current = null;
			setConnected(false);
		};
	}, [connect, setConnected]);
	return { isConnected: isConnected, reconnect: reconnect };
}
//# sourceMappingURL=use-websocket.js.map
