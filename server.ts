import { createServer } from "node:http";
import { dirname } from "node:path";
import { fileURLToPath, parse } from "node:url";
import next from "next";
import Redis from "ioredis";
import { WebSocket, WebSocketServer } from "ws";

import { getRedis } from "./src/lib/redis.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3100", 10);
const redisUrl = process.env.ACTOR_REDIS_URL ?? process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

const nextConf = {
	output: "standalone",
	reactStrictMode: true,
	poweredByHeader: false,
	eslint: { ignoreDuringBuilds: true },
	typescript: { ignoreBuildErrors: false },
} as any;

const app = next({
	dev,
	hostname,
	port,
	dir: __dirname,
	conf: nextConf,
});
const handle = app.getRequestHandler();

const apiRedis = getRedis();
let streamRedis: Redis | null = null;
let streamRedisConnected = false;
let nextPrepared = false;
let shuttingDown = false;
let shutdownPromise: Promise<void> | null = null;

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
	| { type: "ping" };

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
const runs = new Map<string, RunOverview>();
const clients = new Set<WebSocket>();

const server = createServer((req, res) => {
	const pathname = (req.url || "").split("?")[0];

	// Fast health endpoints before Next.js handler.
	if (pathname === "/_health/live") {
		res.statusCode = 200;
		res.setHeader("content-type", "application/json");
		res.end('{"status":"ok"}');
		return;
	}

	if (pathname === "/_health/ready") {
		const redisReady = isRedisReady(apiRedis) && streamRedisConnected;
		const ready = nextPrepared && redisReady;
		res.statusCode = ready ? 200 : 503;
		res.setHeader("content-type", "application/json");
		res.end(
			JSON.stringify({
				status: ready ? "ok" : "not_ready",
				nextPrepared,
				redisConnected: redisReady,
			}),
		);
		return;
	}

	const parsedUrl = parse(req.url || "", true);
	handle(req, res, parsedUrl);
});

// WebSocket server on /ws path
const wss = new WebSocketServer({ noServer: true });

function isRedisReady(redis: Redis | null | undefined): boolean {
	if (!redis) return false;
	return redis.status === "ready" || redis.status === "connect";
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function broadcast(msg: WsMessage) {
	const data = JSON.stringify(msg);
	for (const ws of clients) {
		if (ws.readyState === WebSocket.OPEN) {
			ws.send(data);
		}
	}
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

function translateEvent(raw: Record<string, string>, streamId: string): ActivityItem | null {
	const type = raw.type || "";
	const runId = raw.runId || "unknown";
	const ts = Number(raw.ts) || Date.now();

	const base: ActivityItem = {
		id: streamId,
		runId,
		timestamp: ts,
		phase: "working",
		title: "Working on the next step…",
		icon: "sparkles",
		isActive: true,
	};

	const run = runs.get(runId);
	const currentProgress = run?.progress ?? 0;

	switch (type) {
		case "run.start":
			return { ...base, phase: "queued", title: "Starting to work on your request…", icon: "rocket", progress: 5 };
		case "llm.start":
			return { ...base, phase: "understanding", title: "Thinking about your request…", icon: "brain", progress: Math.min(currentProgress + 5, 95) };
		case "llm.done":
			return { ...base, phase: "working", title: "Figured out the next step…", icon: "lightbulb", isActive: false, progress: Math.min(currentProgress + 5, 95) };
		case "tool.start": {
			const toolName = raw.toolName || raw["data.toolName"] || "";
			const toolArgs = raw.toolArgs || "";
			const friendly = toolFriendlyNames[toolName] || { title: "Working on the next step…", icon: "sparkles" };
			return {
				...base,
				title: toolName || friendly.title,
				icon: friendly.icon,
				toolName,
				toolArgs: typeof toolArgs === "string" ? toolArgs : JSON.stringify(toolArgs),
				description: friendly.title,
				progress: Math.min(currentProgress + 3, 95),
			};
		}
		case "tool.done": {
			const toolName = raw.toolName || raw["data.toolName"] || "";
			const toolArgs = raw.toolArgs || "";
			const friendly = toolFriendlyNames[toolName] || { title: "Completed a step", icon: "check" };
			return {
				...base,
				title: toolName || friendly.title.replace("…", " ✓"),
				icon: "check",
				toolName,
				toolArgs: typeof toolArgs === "string" ? toolArgs : JSON.stringify(toolArgs),
				description: friendly.title.replace("…", " ✓"),
				isActive: false,
				progress: Math.min(currentProgress + 5, 95),
			};
		}
		case "tool.error":
			return { ...base, title: "Hit a small bump — working around it…", icon: "alert-triangle", progress: currentProgress };
		case "subagent.spawn":
			return { ...base, title: "A specialist is helping out…", icon: "users", progress: Math.min(currentProgress + 5, 95) };
		case "subagent.done":
			return { ...base, title: "Specialist finished their part ✓", icon: "user-check", isActive: false, progress: Math.min(currentProgress + 10, 95) };
		case "run.done": {
			const status = raw.status || raw["data.status"] || "ok";
			if (status === "ok" || status === "done") {
				return { ...base, phase: "complete", title: "All done! ✓", icon: "check-circle", isActive: false, progress: 100 };
			}
			return { ...base, phase: "error", title: "Something went wrong — we're on it", icon: "alert-triangle", isActive: false, progress: currentProgress };
		}
		default:
			return null;
	}
}

function processEvent(fields: string[], streamId: string) {
	const raw: Record<string, string> = {};
	for (let i = 0; i < fields.length; i += 2) {
		raw[fields[i]] = fields[i + 1];
	}

	let parsedData: Record<string, any> = {};
	try {
		parsedData = JSON.parse(raw.data || "{}");
	} catch {
		// best effort
	}

	// Normalize producer event types to UI translator event types
	const typeMap: Record<string, string> = {
		tool_start: "tool.start",
		tool_end: "tool.done",
		tool_error: "tool.error",
		llm_start: "llm.start",
		llm_end: "llm.done",
		actor_stopped: "run.done",
		async_task_dispatched: "subagent.spawn",
		async_task_started: "subagent.done", // not exact, but close enough for activity feed
	};
	raw.type = typeMap[raw.type] || raw.type;

	// Extract tool name and args from parsed data payload
	raw.toolName = parsedData.tool || parsedData.toolName || "";
	// Extract the most useful arg for display — check both direct fields and safe telemetry fields
	const argValue =
		parsedData.commandPreview ||
		parsedData.command ||
		parsedData.path ||
		parsedData.query ||
		parsedData.pattern ||
		parsedData.args ||
		parsedData.url ||
		parsedData.text ||
		parsedData.task ||
		parsedData.glob ||
		parsedData.role ||
		"";
	raw.toolArgs = typeof argValue === "string" ? argValue : JSON.stringify(argValue);

	// Detect run start/done based on actor-system message events
	if (raw.type === "message_sent" && raw.messageType === "TaskRequest") {
		raw.type = "run.start";
		raw.task = parsedData?.payload?.task || parsedData?.task || "Working on something…";
	}

	if (raw.type === "message_received" && raw.messageType === "TaskRequest") {
		raw.type = "run.start";
		raw.task = parsedData?.payload?.task || parsedData?.task || "New task received…";
	}

	if (raw.type === "message_sent" && raw.messageType === "TaskResult") {
		raw.type = "run.done";
		raw.status = parsedData?.payload?.status || "ok";
	}

	const type = raw.type || "";
	const runId = raw.runId || "unknown";

	// Handle run.start — create the run
	if (type === "run.start") {
		const task = raw.task || parsedData?.payload?.task || parsedData?.task || raw["data.task"] || "Working on something…";
		const newRun: RunOverview = {
			runId,
			task,
			phase: "queued",
			progress: 5,
			startedAt: Number(raw.ts) || Date.now(),
			updatedAt: Date.now(),
			activities: [],
			specialist: getSpecialistName(task),
		};
		runs.set(runId, newRun);
	}

	const activity = translateEvent(raw, streamId);
	if (!activity) return;

	let run = runs.get(runId);
	if (!run) {
		// Create a placeholder run
		run = {
			runId,
			task: "Working on something…",
			phase: "working",
			progress: 0,
			startedAt: Date.now(),
			updatedAt: Date.now(),
			activities: [],
			specialist: "Assistant",
		};
		runs.set(runId, run);
	}

	run.activities.push(activity);
	run.phase = activity.phase;
	run.progress = activity.progress ?? run.progress;
	run.updatedAt = Date.now();

	// Keep only last 50 activities per run
	if (run.activities.length > 50) {
		run.activities = run.activities.slice(-50);
	}

	// Clean up completed runs after 1 hour
	if (activity.phase === "complete" || activity.phase === "error") {
		setTimeout(() => runs.delete(runId), 3600000);
	}

	broadcast({ type: "activity", data: activity });
	broadcast({ type: "run.update", data: run });
}

// ── Redis listener (separate client from API routes) ─────────────────────
async function startRedisListener() {
	streamRedis = new Redis(redisUrl, {
		maxRetriesPerRequest: null,
		retryStrategy: (times) => Math.min(times * 500, 10000),
	});

	streamRedis.on("ready", () => {
		streamRedisConnected = true;
		console.log("[redis-stream] connected — listening for telemetry events");
	});
	streamRedis.on("connect", () => {
		streamRedisConnected = true;
	});
	streamRedis.on("close", () => {
		streamRedisConnected = false;
	});
	streamRedis.on("end", () => {
		streamRedisConnected = false;
	});
	streamRedis.on("error", (err) => {
		streamRedisConnected = false;
		if (!shuttingDown) {
			console.error("[redis-stream] error:", err.message);
		}
	});

	const STREAM = "telemetry:events";

	// Catch-up: load recent events so the UI has context on startup
	let lastId = "$";
	try {
		const recent = await streamRedis.xrevrange(STREAM, "+", "-", "COUNT", 100);
		if (recent.length > 0) {
			const sorted = recent.reverse();
			for (const [id, fields] of sorted) {
				processEvent(fields, id);
				lastId = id;
			}
			console.log(`[redis-stream] caught up on ${recent.length} recent events (${runs.size} runs)`);
		}
	} catch (err: any) {
		if (!shuttingDown) {
			console.log("[redis-stream] catch-up failed, starting from live:", err?.message);
		}
	}

	while (!shuttingDown) {
		try {
			const result = await streamRedis.xread("COUNT", 20, "BLOCK", 2000, "STREAMS", STREAM, lastId);
			if (result) {
				for (const [, messages] of result) {
					for (const [id, fields] of messages) {
						lastId = id;
						processEvent(fields, id);
					}
				}
			}
		} catch (err: any) {
			if (shuttingDown) break;
			if (err?.message?.includes("ECONNRESET") || err?.message?.includes("closed")) {
				console.log("[redis-stream] reconnecting...");
				await delay(2000);
			} else {
				console.error("[redis-stream] stream read error:", err?.message);
				await delay(5000);
			}
		}
	}

	console.log("[redis-stream] listener stopped");
}

function installWsHandlers() {
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
		console.log(`[ws] client connected (${clients.size} total)`);

		// Send current runs
		const allRuns = Array.from(runs.values());
		ws.send(JSON.stringify({ type: "runs", data: allRuns }));

		// Ping every 30s
		const pingInterval = setInterval(() => {
			if (ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ type: "ping" }));
			}
		}, 30000);

		ws.on("close", () => {
			clients.delete(ws);
			clearInterval(pingInterval);
			console.log(`[ws] client disconnected (${clients.size} total)`);
		});

		ws.on("error", () => {
			clients.delete(ws);
			clearInterval(pingInterval);
		});
	});
}

async function gracefulShutdown(signal: string) {
	if (shutdownPromise) return shutdownPromise;

	shutdownPromise = (async () => {
		if (shuttingDown) return;
		shuttingDown = true;
		console.log(`[shutdown] Received ${signal}. Starting graceful shutdown...`);

		console.log("[shutdown] Closing WebSocket server...");
		for (const client of clients) {
			try {
				client.close(1001, "Server shutting down");
			} catch {
				// ignore close errors
			}
		}
		clients.clear();
		await new Promise<void>((resolve) => {
			wss.close(() => {
				console.log("[shutdown] WebSocket server closed");
				resolve();
			});
		});

		console.log("[shutdown] Closing HTTP server...");
		await new Promise<void>((resolve, reject) => {
			server.close((err) => {
				if (err) {
					reject(err);
					return;
				}
				console.log("[shutdown] HTTP server closed");
				resolve();
			});
		});

		console.log("[shutdown] Closing Redis connections...");
		if (streamRedis) {
			try {
				await streamRedis.quit();
			} catch {
				streamRedis.disconnect();
			}
		}

		try {
			await apiRedis.quit();
		} catch {
			apiRedis.disconnect();
		}
		console.log("[shutdown] Redis connections closed");

		console.log("[shutdown] Graceful shutdown complete");
	})();

	try {
		await shutdownPromise;
		process.exit(0);
	} catch (err) {
		console.error("[shutdown] Error during shutdown:", err);
		process.exit(1);
	}
}

process.on("SIGTERM", () => {
	void gracefulShutdown("SIGTERM");
});

process.on("SIGINT", () => {
	void gracefulShutdown("SIGINT");
});

async function main() {
	try {
		await app.prepare();
		nextPrepared = true;
		console.log("[next] app prepared");

		installWsHandlers();

		await new Promise<void>((resolve) => {
			server.listen(port, hostname, () => {
				console.log("\n  ┌──────────────────────────────────────┐");
				console.log("  │  olo Control Center                  │");
				console.log(`  │  http://${hostname}:${port}             │`);
				console.log(`  │  WebSocket: ws://${hostname}:${port}/ws  │`);
				console.log("  └──────────────────────────────────────┘\n");
				resolve();
			});
		});

		void startRedisListener().catch((err) => {
			if (!shuttingDown) {
				console.error("[redis-stream] failed to start listener:", err);
			}
		});
	} catch (err) {
		console.error("[server] failed to start:", err);
		process.exit(1);
	}
}

void main();
