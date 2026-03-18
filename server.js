var __assign =
	(this && this.__assign) ||
	function () {
		__assign =
			Object.assign ||
			function (t) {
				for (var s, i = 1, n = arguments.length; i < n; i++) {
					s = arguments[i];
					for (var p in s) if (Object.hasOwn(s, p)) t[p] = s[p];
				}
				return t;
			};
		return __assign.apply(this, arguments);
	};
var __awaiter =
	(this && this.__awaiter) ||
	((thisArg, _arguments, P, generator) => {
		function adopt(value) {
			return value instanceof P
				? value
				: new P((resolve) => {
						resolve(value);
					});
		}
		return new (P || (P = Promise))((resolve, reject) => {
			function fulfilled(value) {
				try {
					step(generator.next(value));
				} catch (e) {
					reject(e);
				}
			}
			function rejected(value) {
				try {
					step(generator["throw"](value));
				} catch (e) {
					reject(e);
				}
			}
			function step(result) {
				result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
			}
			step((generator = generator.apply(thisArg, _arguments || [])).next());
		});
	});
var __generator =
	(this && this.__generator) ||
	((thisArg, body) => {
		var _ = {
				label: 0,
				sent: () => {
					if (t[0] & 1) throw t[1];
					return t[1];
				},
				trys: [],
				ops: [],
			},
			f,
			y,
			t,
			g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
		return (
			(g.next = verb(0)),
			(g["throw"] = verb(1)),
			(g["return"] = verb(2)),
			typeof Symbol === "function" &&
				(g[Symbol.iterator] = function () {
					return this;
				}),
			g
		);
		function verb(n) {
			return (v) => step([n, v]);
		}
		function step(op) {
			if (f) throw new TypeError("Generator is already executing.");
			while ((g && ((g = 0), op[0] && (_ = 0)), _))
				try {
					if (
						((f = 1),
						y &&
							(t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) &&
							!(t = t.call(y, op[1])).done)
					)
						return t;
					if (((y = 0), t)) op = [op[0] & 2, t.value];
					switch (op[0]) {
						case 0:
						case 1:
							t = op;
							break;
						case 4:
							_.label++;
							return { value: op[1], done: false };
						case 5:
							_.label++;
							y = op[1];
							op = [0];
							continue;
						case 7:
							op = _.ops.pop();
							_.trys.pop();
							continue;
						default:
							if (!((t = _.trys), (t = t.length > 0 && t[t.length - 1])) && (op[0] === 6 || op[0] === 2)) {
								_ = 0;
								continue;
							}
							if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
								_.label = op[1];
								break;
							}
							if (op[0] === 6 && _.label < t[1]) {
								_.label = t[1];
								t = op;
								break;
							}
							if (t && _.label < t[2]) {
								_.label = t[2];
								_.ops.push(op);
								break;
							}
							if (t[2]) _.ops.pop();
							_.trys.pop();
							continue;
					}
					op = body.call(thisArg, _);
				} catch (e) {
					op = [6, e];
					y = 0;
				} finally {
					f = t = 0;
				}
			if (op[0] & 5) throw op[1];
			return { value: op[0] ? op[1] : void 0, done: true };
		}
	});
var __spreadArray =
	(this && this.__spreadArray) ||
	function (to, from, pack) {
		if (pack || arguments.length === 2)
			for (var i = 0, l = from.length, ar; i < l; i++) {
				if (ar || !(i in from)) {
					if (!ar) ar = Array.prototype.slice.call(from, 0, i);
					ar[i] = from[i];
				}
			}
		return to.concat(ar || Array.prototype.slice.call(from));
	};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
var node_http_1 = require("node:http");
var node_path_1 = require("node:path");
var node_url_1 = require("node:url");
var next_1 = require("next");
var ioredis_1 = require("ioredis");
var ws_1 = require("ws");
var __dirname = (0, node_path_1.dirname)((0, node_url_1.fileURLToPath)(import.meta.url));
var dev = process.env.NODE_ENV !== "production";
var hostname = "0.0.0.0";
var port = parseInt(process.env.PORT || "3100", 10);
var redisUrl =
	(_b = (_a = process.env.ACTOR_REDIS_URL) !== null && _a !== void 0 ? _a : process.env.REDIS_URL) !== null &&
	_b !== void 0
		? _b
		: "redis://127.0.0.1:6379";
var nextConf = {
	reactStrictMode: true,
	poweredByHeader: false,
	eslint: { ignoreDuringBuilds: true },
	typescript: { ignoreBuildErrors: false },
};
var app = (0, next_1.default)({
	dev: dev,
	hostname: hostname,
	port: port,
	dir: __dirname,
	conf: nextConf,
});
var handle = app.getRequestHandler();
// Inline Redis creation (avoids tsx module resolution issues in Docker)
var apiRedis = new ioredis_1.default(redisUrl, {
	lazyConnect: false,
	enableReadyCheck: true,
	maxRetriesPerRequest: 1,
});
var streamRedis = null;
var streamRedisConnected = false;
var nextPrepared = false;
var shuttingDown = false;
var shutdownPromise = null;
// ── Friendly names for tools ──────────────────────
var toolFriendlyNames = {
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
var runs = new Map();
var opsState = new Map();
var clients = new Set();
var featureToolActivity = new Map();
var workerRunToFeature = new Map();
var server = (0, node_http_1.createServer)((req, res) => {
	var pathname = (req.url || "").split("?")[0];
	// Fast health endpoints before Next.js handler.
	if (pathname === "/_health/live") {
		res.statusCode = 200;
		res.setHeader("content-type", "application/json");
		res.end('{"status":"ok"}');
		return;
	}
	if (pathname === "/_health/ready") {
		var redisReady = isRedisReady(apiRedis) && streamRedisConnected;
		var ready = nextPrepared && redisReady;
		res.statusCode = ready ? 200 : 503;
		res.setHeader("content-type", "application/json");
		res.end(
			JSON.stringify({
				status: ready ? "ok" : "not_ready",
				nextPrepared: nextPrepared,
				redisConnected: redisReady,
			}),
		);
		return;
	}
	var parsedUrl = (0, node_url_1.parse)(req.url || "", true);
	handle(req, res, parsedUrl);
});
// WebSocket server on /ws path
var wss = new ws_1.WebSocketServer({ noServer: true });
function isRedisReady(redis) {
	if (!redis) return false;
	return redis.status === "ready" || redis.status === "connect";
}
function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
function broadcast(msg) {
	var data = JSON.stringify(msg);
	for (var _i = 0, clients_1 = clients; _i < clients_1.length; _i++) {
		var ws = clients_1[_i];
		if (ws.readyState === ws_1.WebSocket.OPEN) {
			ws.send(data);
		}
	}
}
function getSpecialistName(task) {
	var t = task.toLowerCase();
	if (t.includes("research") || t.includes("find") || t.includes("search")) return "Researcher";
	if (t.includes("write") || t.includes("create") || t.includes("build") || t.includes("implement")) return "Builder";
	if (t.includes("fix") || t.includes("debug") || t.includes("error")) return "Troubleshooter";
	if (t.includes("deploy") || t.includes("ship") || t.includes("launch")) return "Deployer";
	if (t.includes("review") || t.includes("check") || t.includes("verify")) return "Reviewer";
	if (t.includes("analyze") || t.includes("report") || t.includes("data")) return "Analyst";
	return "Assistant";
}
function parseOpsFeatureStatus(value) {
	if (
		value === "pending" ||
		value === "in-progress" ||
		value === "done" ||
		value === "failed" ||
		value === "fix-needed"
	) {
		return value;
	}
	if (value === "completed") return "done";
	return "pending";
}
function normalizeOpsEvent(input, fallbackId, fallbackType) {
	return {
		id: input.id || fallbackId,
		timestamp: Number(input.timestamp) || Date.now(),
		type: input.type || fallbackType,
		title: input.title || "Operation update",
		featureId: input.featureId,
		status: input.status,
		verdict: input.verdict,
	};
}
function getOpsStatus(op) {
	if (op.features.length === 0) return op.status;
	var hasFailed = op.features.some((feature) => feature.status === "failed");
	var allDone = op.features.every((feature) => feature.status === "done");
	if (allDone) return op.status === "failed" ? "failed" : "completed";
	if (hasFailed && op.status === "completed") return "running";
	return op.status;
}
function ensureOpState(opId, title, ts) {
	var existing = opsState.get(opId);
	if (existing) {
		if (title && (!existing.title || existing.title === "Operation")) {
			existing.title = title;
		}
		if (ts && ts > existing.updatedAt) {
			existing.updatedAt = ts;
		}
		return existing;
	}
	var now = ts || Date.now();
	var created = {
		opId: opId,
		title: title || "Operation",
		status: "running",
		features: [],
		currentPhase: 1,
		totalPhases: 1,
		startedAt: now,
		updatedAt: now,
		events: [],
	};
	opsState.set(opId, created);
	return created;
}
function upsertFeature(op, feature) {
	var _a, _b, _c;
	var idx = op.features.findIndex((item) => item.id === feature.id);
	if (idx >= 0) {
		op.features[idx] = __assign(__assign(__assign({}, op.features[idx]), feature), {
			toolActivity:
				(_b = (_a = feature.toolActivity) !== null && _a !== void 0 ? _a : op.features[idx].toolActivity) !== null &&
				_b !== void 0
					? _b
					: [],
		});
		return;
	}
	op.features.push(
		__assign(__assign({}, feature), { toolActivity: (_c = feature.toolActivity) !== null && _c !== void 0 ? _c : [] }),
	);
}
function appendOpsEvent(op, event) {
	var idx = op.events.findIndex((item) => item.id === event.id);
	if (idx >= 0) {
		op.events[idx] = event;
	} else {
		op.events.push(event);
	}
	op.events.sort((a, b) => a.timestamp - b.timestamp);
	if (op.events.length > 100) {
		op.events = op.events.slice(-100);
	}
}
function attachToolActivityToFeature(op, featureId) {
	var _a;
	var idx = op.features.findIndex((item) => item.id === featureId);
	if (idx < 0) return;
	op.features[idx] = __assign(__assign({}, op.features[idx]), {
		toolActivity: (_a = featureToolActivity.get(featureId)) !== null && _a !== void 0 ? _a : [],
	});
}
function findFeatureById(featureId) {
	for (var _i = 0, _a = opsState.values(); _i < _a.length; _i++) {
		var op = _a[_i];
		var feature = op.features.find((item) => item.id === featureId);
		if (feature) {
			return { op: op, feature: feature };
		}
	}
	return null;
}
function resolveFeatureIdForToolEvent(raw, parsedData) {
	var _a;
	var featureId =
		typeof parsedData.featureId === "string"
			? parsedData.featureId
			: typeof raw.featureId === "string"
				? raw.featureId
				: null;
	if (featureId) return featureId;
	var runId =
		typeof parsedData.runId === "string" ? parsedData.runId : typeof raw.runId === "string" ? raw.runId : null;
	if (!runId) return null;
	return (_a = workerRunToFeature.get(runId)) !== null && _a !== void 0 ? _a : null;
}
function upsertFeatureToolActivity(featureId, activity) {
	var _a, _b;
	var current = (_a = featureToolActivity.get(featureId)) !== null && _a !== void 0 ? _a : [];
	var index = current.findIndex((item) => item.id === activity.id);
	var next = __spreadArray([], current, true);
	if (index >= 0) {
		var existing = next[index];
		next[index] = __assign(__assign(__assign({}, existing), activity), {
			startedAt: existing.startedAt,
			completedAt: (_b = activity.completedAt) !== null && _b !== void 0 ? _b : existing.completedAt,
		});
	} else {
		next.push(activity);
	}
	featureToolActivity.set(featureId, next.slice(-10));
	var found = findFeatureById(featureId);
	if (!found) return;
	attachToolActivityToFeature(found.op, featureId);
	found.op.updatedAt = Date.now();
	broadcast({ type: "ops.update", data: found.op });
}
function applyOpsEvent(type, opId, payload, streamId, ts) {
	var _a, _b, _c, _d;
	var op = ensureOpState(opId, payload.title, ts);
	op.updatedAt = Math.max(op.updatedAt, ts);
	switch (type) {
		case "ops.started": {
			op.title = payload.title || op.title;
			op.status = "running";
			appendOpsEvent(
				op,
				normalizeOpsEvent(
					{
						id: streamId,
						timestamp: ts,
						type: type,
						title: payload.title || op.title,
					},
					streamId,
					type,
				),
			);
			break;
		}
		case "ops.feature.dispatched": {
			var featureId_1 = String(payload.featureId || payload.id || "feature-".concat(streamId));
			var phase = Number(payload.phase) || op.currentPhase || 1;
			var existing = op.features.find((item) => item.id === featureId_1);
			var workerRunId = typeof payload.workerRunId === "string" ? payload.workerRunId : null;
			if (workerRunId) {
				workerRunToFeature.set(workerRunId, featureId_1);
			}
			upsertFeature(op, {
				id: featureId_1,
				title: String(
					payload.title || (existing === null || existing === void 0 ? void 0 : existing.title) || featureId_1,
				),
				status: "in-progress",
				phase: phase,
				assignedModel: String(
					payload.model || (existing === null || existing === void 0 ? void 0 : existing.assignedModel) || "worker",
				),
				attempts: Math.max(Number((existing === null || existing === void 0 ? void 0 : existing.attempts) || 0), 1),
				toolActivity:
					(_b =
						(_a = featureToolActivity.get(featureId_1)) !== null && _a !== void 0
							? _a
							: existing === null || existing === void 0
								? void 0
								: existing.toolActivity) !== null && _b !== void 0
						? _b
						: [],
			});
			appendOpsEvent(
				op,
				normalizeOpsEvent(
					{
						id: streamId,
						timestamp: ts,
						type: type,
						title: String(
							payload.title || (existing === null || existing === void 0 ? void 0 : existing.title) || featureId_1,
						),
						featureId: featureId_1,
					},
					streamId,
					type,
				),
			);
			break;
		}
		case "ops.feature.completed": {
			var featureId_2 = String(payload.featureId || payload.id || "feature-".concat(streamId));
			var existing = op.features.find((item) => item.id === featureId_2);
			var status_1 = parseOpsFeatureStatus(payload.status);
			upsertFeature(op, {
				id: featureId_2,
				title: String(
					payload.title || (existing === null || existing === void 0 ? void 0 : existing.title) || featureId_2,
				),
				status: status_1,
				phase: Number((existing === null || existing === void 0 ? void 0 : existing.phase) || op.currentPhase || 1),
				assignedModel: String((existing === null || existing === void 0 ? void 0 : existing.assignedModel) || "worker"),
				attempts: Number((existing === null || existing === void 0 ? void 0 : existing.attempts) || 0),
				toolActivity:
					(_d =
						(_c = featureToolActivity.get(featureId_2)) !== null && _c !== void 0
							? _c
							: existing === null || existing === void 0
								? void 0
								: existing.toolActivity) !== null && _d !== void 0
						? _d
						: [],
			});
			appendOpsEvent(
				op,
				normalizeOpsEvent(
					{
						id: streamId,
						timestamp: ts,
						type: type,
						title: String(
							payload.title || (existing === null || existing === void 0 ? void 0 : existing.title) || featureId_2,
						),
						featureId: featureId_2,
						status: status_1,
					},
					streamId,
					type,
				),
			);
			break;
		}
		case "ops.phase.advanced": {
			var toPhase = Number(payload.toPhase) || Number(payload.phase) || op.currentPhase;
			var totalPhases = Number(payload.totalPhases) || op.totalPhases;
			op.currentPhase = Math.max(1, toPhase);
			op.totalPhases = Math.max(op.currentPhase, totalPhases || op.totalPhases || 1);
			appendOpsEvent(
				op,
				normalizeOpsEvent(
					{
						id: streamId,
						timestamp: ts,
						type: type,
						title: "Step ".concat(op.currentPhase),
					},
					streamId,
					type,
				),
			);
			break;
		}
		case "ops.completed": {
			op.status = String(payload.status || op.status || "completed");
			op.title = payload.title || op.title;
			appendOpsEvent(
				op,
				normalizeOpsEvent(
					{
						id: streamId,
						timestamp: ts,
						type: type,
						title: payload.title || op.title,
					},
					streamId,
					type,
				),
			);
			break;
		}
		case "ops.review": {
			var featureId = payload.featureId ? String(payload.featureId) : undefined;
			appendOpsEvent(
				op,
				normalizeOpsEvent(
					{
						id: streamId,
						timestamp: ts,
						type: type,
						title: String(payload.title || featureId || op.title),
						featureId: featureId,
						verdict: typeof payload.verdict === "string" ? payload.verdict : undefined,
					},
					streamId,
					type,
				),
			);
			break;
		}
	}
	if (op.totalPhases < op.currentPhase) {
		op.totalPhases = op.currentPhase;
	}
	if (op.features.length > 0 && op.totalPhases === 1) {
		var maxPhase = op.features.reduce((max, feature) => Math.max(max, feature.phase || 1), 1);
		op.totalPhases = Math.max(op.totalPhases, maxPhase);
	}
	op.status = getOpsStatus(op);
	op.updatedAt = Math.max(op.updatedAt, Date.now());
	opsState.set(op.opId, op);
	return op;
}
function normalizeOpsSnapshot(snapshot) {
	if (!snapshot || typeof snapshot !== "object" || !snapshot.opId) {
		return null;
	}
	var now = Date.now();
	var features = Array.isArray(snapshot.features)
		? snapshot.features
				.map((feature) => {
					var _a;
					return {
						id: String((feature === null || feature === void 0 ? void 0 : feature.id) || ""),
						title: String(
							(feature === null || feature === void 0 ? void 0 : feature.title) ||
								(feature === null || feature === void 0 ? void 0 : feature.id) ||
								"Feature",
						),
						status: parseOpsFeatureStatus(feature === null || feature === void 0 ? void 0 : feature.status),
						phase: Math.max(1, Number(feature === null || feature === void 0 ? void 0 : feature.phase) || 1),
						assignedModel: String(
							(feature === null || feature === void 0 ? void 0 : feature.assignedModel) || "worker",
						),
						attempts: Math.max(0, Number(feature === null || feature === void 0 ? void 0 : feature.attempts) || 0),
						toolActivity:
							(_a = featureToolActivity.get(
								String((feature === null || feature === void 0 ? void 0 : feature.id) || ""),
							)) !== null && _a !== void 0
								? _a
								: [],
					};
				})
				.filter((feature) => feature.id)
		: [];
	return {
		opId: String(snapshot.opId),
		title: String(snapshot.title || "Operation"),
		status: String(snapshot.status || "running"),
		features: features,
		currentPhase: Math.max(1, Number(snapshot.currentPhase) || 1),
		totalPhases: Math.max(1, Number(snapshot.totalPhases) || 1),
		startedAt: Number(snapshot.startedAt) || now,
		updatedAt: Number(snapshot.updatedAt) || now,
		events: [],
	};
}
function syncOpsSnapshots() {
	return __awaiter(this, void 0, void 0, function () {
		var hasActiveOp,
			activeSnapshot,
			cursor,
			keys,
			_a,
			nextCursor,
			batch,
			values,
			_i,
			values_1,
			rawSnapshot,
			normalized,
			existing,
			merged,
			shouldBroadcast,
			err_1;
		var _b;
		return __generator(this, (_c) => {
			switch (_c.label) {
				case 0:
					if (!streamRedis || shuttingDown) return [2 /*return*/];
					_c.label = 1;
				case 1:
					_c.trys.push([1, 8, , 9]);
					hasActiveOp = Array.from(opsState.values()).some((op) => {
						var status = op.status.toLowerCase();
						return status === "running" || status === "paused" || status === "in-progress";
					});
					return [4 /*yield*/, streamRedis.get("ops:active")];
				case 2:
					activeSnapshot = _c.sent();
					if (!hasActiveOp && !activeSnapshot) return [2 /*return*/];
					cursor = "0";
					keys = [];
					_c.label = 3;
				case 3:
					return [4 /*yield*/, streamRedis.scan(cursor, "MATCH", "ops:snapshot:*", "COUNT", "100")];
				case 4:
					(_a = _c.sent()), (nextCursor = _a[0]), (batch = _a[1]);
					cursor = nextCursor;
					if (Array.isArray(batch) && batch.length > 0) {
						keys.push.apply(keys, batch);
					}
					_c.label = 5;
				case 5:
					if (cursor !== "0") return [3 /*break*/, 3];
					_c.label = 6;
				case 6:
					if (keys.length === 0) return [2 /*return*/];
					return [4 /*yield*/, streamRedis.mget.apply(streamRedis, keys)];
				case 7:
					values = _c.sent();
					for (_i = 0, values_1 = values; _i < values_1.length; _i++) {
						rawSnapshot = values_1[_i];
						if (!rawSnapshot) continue;
						try {
							normalized = normalizeOpsSnapshot(JSON.parse(rawSnapshot));
							if (!normalized) continue;
							existing = opsState.get(normalized.opId);
							merged = __assign(
								__assign(__assign({}, existing !== null && existing !== void 0 ? existing : normalized), normalized),
								{
									events:
										(_b = existing === null || existing === void 0 ? void 0 : existing.events) !== null && _b !== void 0
											? _b
											: [],
								},
							);
							merged.status = getOpsStatus(merged);
							shouldBroadcast =
								!existing ||
								normalized.updatedAt >= existing.updatedAt ||
								normalized.status !== existing.status ||
								normalized.features.length !== existing.features.length;
							opsState.set(merged.opId, merged);
							if (shouldBroadcast) {
								broadcast({ type: "ops.update", data: merged });
							}
						} catch (_d) {
							// Ignore malformed snapshot payloads.
						}
					}
					return [3 /*break*/, 9];
				case 8:
					err_1 = _c.sent();
					if (!shuttingDown) {
						console.error("[ops-snapshot] sync error:", err_1 === null || err_1 === void 0 ? void 0 : err_1.message);
					}
					return [3 /*break*/, 9];
				case 9:
					return [2 /*return*/];
			}
		});
	});
}
function translateEvent(raw, streamId) {
	var _a;
	var type = raw.type || "";
	var runId = raw.runId || "unknown";
	var ts = Number(raw.ts) || Date.now();
	var base = {
		id: streamId,
		runId: runId,
		timestamp: ts,
		phase: "working",
		title: "Working on the next step…",
		icon: "sparkles",
		isActive: true,
	};
	var run = runs.get(runId);
	var currentProgress =
		(_a = run === null || run === void 0 ? void 0 : run.progress) !== null && _a !== void 0 ? _a : 0;
	switch (type) {
		case "run.start":
			return __assign(__assign({}, base), {
				phase: "queued",
				title: "Starting to work on your request…",
				icon: "rocket",
				progress: 5,
			});
		case "llm.start":
			return __assign(__assign({}, base), {
				phase: "understanding",
				title: "Thinking about your request…",
				icon: "brain",
				progress: Math.min(currentProgress + 5, 95),
			});
		case "llm.done":
			return __assign(__assign({}, base), {
				phase: "working",
				title: "Figured out the next step…",
				icon: "lightbulb",
				isActive: false,
				progress: Math.min(currentProgress + 5, 95),
			});
		case "tool.start": {
			var toolName = raw.toolName || raw["data.toolName"] || "";
			var toolArgs = raw.toolArgs || "";
			var friendly = toolFriendlyNames[toolName] || { title: "Working on the next step…", icon: "sparkles" };
			return __assign(__assign({}, base), {
				title: toolName || friendly.title,
				icon: friendly.icon,
				toolName: toolName,
				toolArgs: typeof toolArgs === "string" ? toolArgs : JSON.stringify(toolArgs),
				description: friendly.title,
				progress: Math.min(currentProgress + 3, 95),
			});
		}
		case "tool.done": {
			var toolName = raw.toolName || raw["data.toolName"] || "";
			var toolArgs = raw.toolArgs || "";
			var friendly = toolFriendlyNames[toolName] || { title: "Completed a step", icon: "check" };
			return __assign(__assign({}, base), {
				title: toolName || friendly.title.replace("…", " ✓"),
				icon: "check",
				toolName: toolName,
				toolArgs: typeof toolArgs === "string" ? toolArgs : JSON.stringify(toolArgs),
				description: friendly.title.replace("…", " ✓"),
				isActive: false,
				progress: Math.min(currentProgress + 5, 95),
			});
		}
		case "tool.error":
			return __assign(__assign({}, base), {
				title: "Hit a small bump — working around it…",
				icon: "alert-triangle",
				progress: currentProgress,
			});
		case "subagent.spawn":
			return __assign(__assign({}, base), {
				title: "A specialist is helping out…",
				icon: "users",
				progress: Math.min(currentProgress + 5, 95),
			});
		case "subagent.done":
			return __assign(__assign({}, base), {
				title: "Specialist finished their part ✓",
				icon: "user-check",
				isActive: false,
				progress: Math.min(currentProgress + 10, 95),
			});
		case "run.done": {
			var status_2 = raw.status || raw["data.status"] || "ok";
			if (status_2 === "ok" || status_2 === "done") {
				return __assign(__assign({}, base), {
					phase: "complete",
					title: "All done! ✓",
					icon: "check-circle",
					isActive: false,
					progress: 100,
				});
			}
			return __assign(__assign({}, base), {
				phase: "error",
				title: "Something went wrong — we're on it",
				icon: "alert-triangle",
				isActive: false,
				progress: currentProgress,
			});
		}
		default:
			return null;
	}
}
function processEvent(fields, streamId) {
	var _a, _b, _c, _d, _e;
	var raw = {};
	for (var i = 0; i < fields.length; i += 2) {
		raw[fields[i]] = fields[i + 1];
	}
	var parsedData = {};
	try {
		parsedData = JSON.parse(raw.data || "{}");
	} catch (_f) {
		// best effort
	}
	// Handle ops-specific events — apply to opsState and broadcast
	var rawType = raw.type || "";
	if (rawType.startsWith("ops.")) {
		var opId = parsedData.opId || raw.runId || "unknown";
		var ts = Number(raw.ts) || Date.now();
		var updated = applyOpsEvent(rawType, opId, parsedData, streamId, ts);
		broadcast({ type: "ops.update", data: updated });
		// Also continue processing for the general activity feed
	}
	// Normalize producer event types to UI translator event types
	var typeMap = {
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
	if (typeof parsedData.runId === "string") {
		raw.runId = parsedData.runId;
	}
	if (typeof parsedData.featureId === "string") {
		raw.featureId = parsedData.featureId;
	}
	// Extract tool name and args from parsed data payload
	raw.toolName = parsedData.tool || parsedData.toolName || "";
	// Extract the most useful arg for display — check both direct fields and safe telemetry fields
	var argValue =
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
		raw.task =
			((_a = parsedData === null || parsedData === void 0 ? void 0 : parsedData.payload) === null || _a === void 0
				? void 0
				: _a.task) ||
			(parsedData === null || parsedData === void 0 ? void 0 : parsedData.task) ||
			"Working on something…";
	}
	if (raw.type === "message_received" && raw.messageType === "TaskRequest") {
		raw.type = "run.start";
		raw.task =
			((_b = parsedData === null || parsedData === void 0 ? void 0 : parsedData.payload) === null || _b === void 0
				? void 0
				: _b.task) ||
			(parsedData === null || parsedData === void 0 ? void 0 : parsedData.task) ||
			"New task received…";
	}
	if (raw.type === "message_sent" && raw.messageType === "TaskResult") {
		raw.type = "run.done";
		raw.status =
			((_c = parsedData === null || parsedData === void 0 ? void 0 : parsedData.payload) === null || _c === void 0
				? void 0
				: _c.status) || "ok";
	}
	var type = raw.type || "";
	var runId = raw.runId || "unknown";
	if (type === "tool.start" || type === "tool.done" || type === "tool.error") {
		var featureId = resolveFeatureIdForToolEvent(raw, parsedData);
		if (featureId) {
			var startedAt = Number(raw.ts) || Date.now();
			var activity_1 = {
				id: "".concat(runId, ":").concat(raw.toolName || "tool"),
				toolName: raw.toolName || "tool",
				toolArgs: raw.toolArgs || "",
				status: type === "tool.start" ? "running" : type === "tool.done" ? "success" : "error",
				startedAt: startedAt,
				completedAt: type === "tool.start" ? undefined : startedAt,
			};
			upsertFeatureToolActivity(featureId, activity_1);
		}
	}
	// Handle run.start — create the run
	if (type === "run.start") {
		var task =
			raw.task ||
			((_d = parsedData === null || parsedData === void 0 ? void 0 : parsedData.payload) === null || _d === void 0
				? void 0
				: _d.task) ||
			(parsedData === null || parsedData === void 0 ? void 0 : parsedData.task) ||
			raw["data.task"] ||
			"Working on something…";
		var newRun = {
			runId: runId,
			task: task,
			phase: "queued",
			progress: 5,
			startedAt: Number(raw.ts) || Date.now(),
			updatedAt: Date.now(),
			activities: [],
			specialist: getSpecialistName(task),
		};
		runs.set(runId, newRun);
	}
	var activity = translateEvent(raw, streamId);
	if (!activity) return;
	var run = runs.get(runId);
	if (!run) {
		// Create a placeholder run
		run = {
			runId: runId,
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
	run.progress = (_e = activity.progress) !== null && _e !== void 0 ? _e : run.progress;
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
function startRedisListener() {
	return __awaiter(this, void 0, void 0, function () {
		var STREAM,
			lastId,
			recent,
			sorted,
			_i,
			sorted_1,
			_a,
			id,
			fields,
			err_2,
			result,
			_b,
			result_1,
			_c,
			messages,
			_d,
			messages_1,
			_e,
			id,
			fields,
			err_3;
		var _f, _g;
		return __generator(this, (_h) => {
			switch (_h.label) {
				case 0:
					streamRedis = new ioredis_1.default(redisUrl, {
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
					STREAM = "telemetry:events";
					lastId = "$";
					_h.label = 1;
				case 1:
					_h.trys.push([1, 3, , 4]);
					return [4 /*yield*/, streamRedis.xrevrange(STREAM, "+", "-", "COUNT", 100)];
				case 2:
					recent = _h.sent();
					if (recent.length > 0) {
						sorted = recent.reverse();
						for (_i = 0, sorted_1 = sorted; _i < sorted_1.length; _i++) {
							(_a = sorted_1[_i]), (id = _a[0]), (fields = _a[1]);
							processEvent(fields, id);
							lastId = id;
						}
						console.log(
							"[redis-stream] caught up on ".concat(recent.length, " recent events (").concat(runs.size, " runs)"),
						);
					}
					return [3 /*break*/, 4];
				case 3:
					err_2 = _h.sent();
					if (!shuttingDown) {
						console.log(
							"[redis-stream] catch-up failed, starting from live:",
							err_2 === null || err_2 === void 0 ? void 0 : err_2.message,
						);
					}
					return [3 /*break*/, 4];
				case 4:
					if (shuttingDown) return [3 /*break*/, 13];
					_h.label = 5;
				case 5:
					_h.trys.push([5, 7, , 12]);
					return [4 /*yield*/, streamRedis.xread("COUNT", 20, "BLOCK", 2000, "STREAMS", STREAM, lastId)];
				case 6:
					result = _h.sent();
					if (result) {
						for (_b = 0, result_1 = result; _b < result_1.length; _b++) {
							(_c = result_1[_b]), (messages = _c[1]);
							for (_d = 0, messages_1 = messages; _d < messages_1.length; _d++) {
								(_e = messages_1[_d]), (id = _e[0]), (fields = _e[1]);
								lastId = id;
								processEvent(fields, id);
							}
						}
					}
					return [3 /*break*/, 12];
				case 7:
					err_3 = _h.sent();
					if (shuttingDown) return [3 /*break*/, 13];
					if (
						!(
							((_f = err_3 === null || err_3 === void 0 ? void 0 : err_3.message) === null || _f === void 0
								? void 0
								: _f.includes("ECONNRESET")) ||
							((_g = err_3 === null || err_3 === void 0 ? void 0 : err_3.message) === null || _g === void 0
								? void 0
								: _g.includes("closed"))
						)
					)
						return [3 /*break*/, 9];
					console.log("[redis-stream] reconnecting...");
					return [4 /*yield*/, delay(2000)];
				case 8:
					_h.sent();
					return [3 /*break*/, 11];
				case 9:
					console.error(
						"[redis-stream] stream read error:",
						err_3 === null || err_3 === void 0 ? void 0 : err_3.message,
					);
					return [4 /*yield*/, delay(5000)];
				case 10:
					_h.sent();
					_h.label = 11;
				case 11:
					return [3 /*break*/, 12];
				case 12:
					return [3 /*break*/, 4];
				case 13:
					console.log("[redis-stream] listener stopped");
					return [2 /*return*/];
			}
		});
	});
}
function installWsHandlers() {
	server.on("upgrade", (request, socket, head) => {
		var pathname = (0, node_url_1.parse)(request.url || "", true).pathname;
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
		console.log("[ws] client connected (".concat(clients.size, " total)"));
		// Send current runs
		var allRuns = Array.from(runs.values());
		ws.send(JSON.stringify({ type: "runs", data: allRuns }));
		// Send current ops state
		var allOps = Array.from(opsState.values());
		if (allOps.length > 0) {
			ws.send(JSON.stringify({ type: "ops.list", data: allOps }));
		}
		// Ping every 30s
		var pingInterval = setInterval(() => {
			if (ws.readyState === ws_1.WebSocket.OPEN) {
				ws.send(JSON.stringify({ type: "ping" }));
			}
		}, 30000);
		ws.on("close", () => {
			clients.delete(ws);
			clearInterval(pingInterval);
			console.log("[ws] client disconnected (".concat(clients.size, " total)"));
		});
		ws.on("error", () => {
			clients.delete(ws);
			clearInterval(pingInterval);
		});
	});
}
function gracefulShutdown(signal) {
	return __awaiter(this, void 0, void 0, function () {
		var err_4;
		return __generator(this, (_a) => {
			switch (_a.label) {
				case 0:
					if (shutdownPromise) return [2 /*return*/, shutdownPromise];
					shutdownPromise = (() =>
						__awaiter(this, void 0, void 0, function () {
							var _i, clients_2, client, _a, _b;
							return __generator(this, (_c) => {
								switch (_c.label) {
									case 0:
										if (shuttingDown) return [2 /*return*/];
										shuttingDown = true;
										console.log("[shutdown] Received ".concat(signal, ". Starting graceful shutdown..."));
										console.log("[shutdown] Closing WebSocket server...");
										for (_i = 0, clients_2 = clients; _i < clients_2.length; _i++) {
											client = clients_2[_i];
											try {
												client.close(1001, "Server shutting down");
											} catch (_d) {
												// ignore close errors
											}
										}
										clients.clear();
										return [
											4 /*yield*/,
											new Promise((resolve) => {
												wss.close(() => {
													console.log("[shutdown] WebSocket server closed");
													resolve();
												});
											}),
										];
									case 1:
										_c.sent();
										console.log("[shutdown] Closing HTTP server...");
										return [
											4 /*yield*/,
											new Promise((resolve, reject) => {
												server.close((err) => {
													if (err) {
														reject(err);
														return;
													}
													console.log("[shutdown] HTTP server closed");
													resolve();
												});
											}),
										];
									case 2:
										_c.sent();
										console.log("[shutdown] Closing Redis connections...");
										if (!streamRedis) return [3 /*break*/, 6];
										_c.label = 3;
									case 3:
										_c.trys.push([3, 5, , 6]);
										return [4 /*yield*/, streamRedis.quit()];
									case 4:
										_c.sent();
										return [3 /*break*/, 6];
									case 5:
										_a = _c.sent();
										streamRedis.disconnect();
										return [3 /*break*/, 6];
									case 6:
										_c.trys.push([6, 8, , 9]);
										return [4 /*yield*/, apiRedis.quit()];
									case 7:
										_c.sent();
										return [3 /*break*/, 9];
									case 8:
										_b = _c.sent();
										apiRedis.disconnect();
										return [3 /*break*/, 9];
									case 9:
										console.log("[shutdown] Redis connections closed");
										console.log("[shutdown] Graceful shutdown complete");
										return [2 /*return*/];
								}
							});
						}))();
					_a.label = 1;
				case 1:
					_a.trys.push([1, 3, , 4]);
					return [4 /*yield*/, shutdownPromise];
				case 2:
					_a.sent();
					process.exit(0);
					return [3 /*break*/, 4];
				case 3:
					err_4 = _a.sent();
					console.error("[shutdown] Error during shutdown:", err_4);
					process.exit(1);
					return [3 /*break*/, 4];
				case 4:
					return [2 /*return*/];
			}
		});
	});
}
process.on("SIGTERM", () => {
	void gracefulShutdown("SIGTERM");
});
process.on("SIGINT", () => {
	void gracefulShutdown("SIGINT");
});
function main() {
	return __awaiter(this, void 0, void 0, function () {
		var opsInterval_1, err_5;
		return __generator(this, (_a) => {
			switch (_a.label) {
				case 0:
					_a.trys.push([0, 3, , 4]);
					return [4 /*yield*/, app.prepare()];
				case 1:
					_a.sent();
					nextPrepared = true;
					console.log("[next] app prepared");
					installWsHandlers();
					return [
						4 /*yield*/,
						new Promise((resolve) => {
							server.listen(port, hostname, () => {
								console.log("\n  ┌──────────────────────────────────────┐");
								console.log("  │  olo Control Center                  │");
								console.log("  \u2502  http://".concat(hostname, ":").concat(port, "             \u2502"));
								console.log("  \u2502  WebSocket: ws://".concat(hostname, ":").concat(port, "/ws  \u2502"));
								console.log("  └──────────────────────────────────────┘\n");
								resolve();
							});
						}),
					];
				case 2:
					_a.sent();
					void startRedisListener().catch((err) => {
						if (!shuttingDown) {
							console.error("[redis-stream] failed to start listener:", err);
						}
					});
					opsInterval_1 = setInterval(() => {
						void syncOpsSnapshots().catch((err) => {
							if (!shuttingDown) {
								console.error(
									"[ops-snapshot] periodic sync error:",
									err === null || err === void 0 ? void 0 : err.message,
								);
							}
						});
					}, 5000);
					// Initial sync
					void syncOpsSnapshots();
					// Clean up on shutdown
					process.once("SIGTERM", () => clearInterval(opsInterval_1));
					process.once("SIGINT", () => clearInterval(opsInterval_1));
					return [3 /*break*/, 4];
				case 3:
					err_5 = _a.sent();
					console.error("[server] failed to start:", err_5);
					process.exit(1);
					return [3 /*break*/, 4];
				case 4:
					return [2 /*return*/];
			}
		});
	});
}
void main();
//# sourceMappingURL=server.js.map
