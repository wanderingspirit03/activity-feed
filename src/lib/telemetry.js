"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRuns = getRuns;
exports.getRunDetail = getRunDetail;
exports.getRunFullTrace = getRunFullTrace;
exports.getActors = getActors;
exports.getDlq = getDlq;
var redis_1 = require("@/lib/redis");
var DEFAULT_LIMIT = 50;
var ACTIVE_WINDOW_MS = 2 * 60 * 1000;
var stuckToolMsRaw = Number((_a = process.env.ACTOR_TELEMETRY_STUCK_TOOL_MS) !== null && _a !== void 0 ? _a : "600000");
var STUCK_TOOL_MS = Number.isFinite(stuckToolMsRaw) && stuckToolMsRaw > 0 ? Math.max(60000, stuckToolMsRaw) : 600000;
var EVENTS_STREAM = "telemetry:events";
var RUNS_ZSET = "telemetry:runs:lastAt";
var TRACE_KEY_PREFIX = "trace:run:";
var REGISTRY_INDEX_KEY = "registry:actors";
var REGISTRY_ENTRY_PREFIX = "registry:actor";
function getApiBaseMaybe() {
    var _a, _b;
    var base = (_b = (_a = process.env.ACTOR_API_BASE_URL) !== null && _a !== void 0 ? _a : process.env.NEXT_PUBLIC_ACTOR_API_BASE_URL) !== null && _b !== void 0 ? _b : "";
    var trimmed = base.replace(/\/+$/, "");
    return trimmed ? trimmed : null;
}
function apiFetch(path) {
    return __awaiter(this, void 0, void 0, function () {
        var base, url, response, text_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    base = getApiBaseMaybe();
                    if (!base) {
                        throw new Error("Missing ACTOR_API_BASE_URL (set it, or run with Redis telemetry locally)");
                    }
                    url = "".concat(base).concat(path);
                    return [4 /*yield*/, fetch(url, { headers: { Accept: "application/json" } })];
                case 1:
                    response = _a.sent();
                    if (!!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.text()];
                case 2:
                    text_1 = _a.sent();
                    throw new Error("API error (".concat(response.status, "): ").concat(text_1));
                case 3: return [4 /*yield*/, response.json()];
                case 4: return [2 /*return*/, (_a.sent())];
            }
        });
    });
}
function parseNum(value) {
    var parsed = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
    return Number.isFinite(parsed) ? parsed : undefined;
}
function parseBool(value) {
    return value === "1" || value === 1 || value === true;
}
function runKey(runId) {
    return "telemetry:run:".concat(runId);
}
function fullTraceKey(runId) {
    return "".concat(TRACE_KEY_PREFIX).concat(runId);
}
function isObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function scrubDisplayText(value) {
    var next = value;
    next = next.replace(/(redis:\/\/[^:\s/]+:)[^@/\s]+@/gi, "$1[REDACTED]@");
    next = next.replace(/((?:authorization|proxy-authorization)\s*[:=]\s*(?:bearer|basic)\s+)[^\s"'`]+/gi, "$1[REDACTED]");
    next = next.replace(/(\b(?:api[_-]?key|token|secret|password|passwd|session|cookie|auth(?:orization)?|bearer)\b[^\n:=]{0,40}[:=]\s*)[^\s"'`]+/gi, "$1[REDACTED]");
    next = next.replace(/(\b[A-Z][A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PASSWD|API_KEY|AUTH|COOKIE|SESSION)[A-Z0-9_]*\s*=\s*)[^\s"'`]+/g, "$1[REDACTED]");
    next = next.replace(/\b(?:sk-[A-Za-z0-9]{12,}|xox[baprs]-[A-Za-z0-9-]{10,}|gh[pousr]_[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,})\b/g, "[REDACTED_TOKEN]");
    return next;
}
function computePrimaryStatus(run) {
    var _a, _b, _c, _d, _e, _f;
    if (run.doneStatus)
        return run.doneStatus === "ok" ? "done_ok" : "done_failed";
    if (((_a = run.humanInFlight) !== null && _a !== void 0 ? _a : 0) > 0)
        return "waiting_human";
    if (((_b = run.llmInFlight) !== null && _b !== void 0 ? _b : 0) > 0)
        return "waiting_llm";
    if (((_c = run.toolInFlight) !== null && _c !== void 0 ? _c : 0) > 0) {
        var startedAt = (_d = run.lastToolStartAt) !== null && _d !== void 0 ? _d : 0;
        if (startedAt > 0 && Date.now() - startedAt > STUCK_TOOL_MS)
            return "stuck_tool";
        return "waiting_tool";
    }
    if (run.hasHandlerErrors)
        return "failing";
    if (run.hasRetries)
        return "retrying";
    var last = (_f = (_e = run.lastAt) !== null && _e !== void 0 ? _e : run.startedAt) !== null && _f !== void 0 ? _f : 0;
    if (last && Date.now() - last <= ACTIVE_WINDOW_MS)
        return "running";
    return "idle";
}
function toSummary(run) {
    var _a, _b, _c;
    var summaryPreview = (_b = (_a = run.summary) !== null && _a !== void 0 ? _a : run.error) !== null && _b !== void 0 ? _b : undefined;
    var status = (_c = run.status) !== null && _c !== void 0 ? _c : "queued";
    var doneStatus = status === "ok" ? "ok" : status === "failed" ? "failed" : undefined;
    return {
        runId: run.runId,
        startedAt: run.createdAt,
        lastAt: run.updatedAt,
        lastEventType: undefined,
        lastActor: undefined,
        lastMessageType: undefined,
        taskPreview: run.task,
        summaryPreview: summaryPreview,
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
        doneStatus: doneStatus,
    };
}
function toSummaryFromRedis(runId, hash) {
    var _a;
    var summary = {
        runId: runId,
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
    summary.primaryStatus = (_a = summary.primaryStatus) !== null && _a !== void 0 ? _a : computePrimaryStatus(summary);
    summary.stuckFlag = summary.primaryStatus === "stuck_tool";
    return summary;
}
function getRunsFromRedis(options) {
    return __awaiter(this, void 0, void 0, function () {
        var limit, redis, maxScore, ids, pipeline, rows, runs, i, runId, hash, filtered, nextCursor;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    void options.tag;
                    limit = (_a = options.limit) !== null && _a !== void 0 ? _a : DEFAULT_LIMIT;
                    redis = (0, redis_1.getRedis)();
                    maxScore = options.cursor ? String(options.cursor - 1) : "+inf";
                    return [4 /*yield*/, redis.zrevrangebyscore(RUNS_ZSET, maxScore, "-inf", "LIMIT", 0, 3 * limit)];
                case 1:
                    ids = _d.sent();
                    if (ids.length === 0)
                        return [2 /*return*/, { runs: [], nextCursor: undefined }];
                    pipeline = redis.pipeline();
                    ids.forEach(function (id) { return pipeline.hgetall(runKey(id)); });
                    return [4 /*yield*/, pipeline.exec()];
                case 2:
                    rows = _d.sent();
                    runs = [];
                    for (i = 0; i < ids.length; i += 1) {
                        runId = ids[i];
                        hash = (_b = rows === null || rows === void 0 ? void 0 : rows[i]) === null || _b === void 0 ? void 0 : _b[1];
                        if (!hash || Object.keys(hash).length === 0)
                            continue;
                        runs.push(toSummaryFromRedis(runId, hash));
                    }
                    filtered = runs
                        .filter(function (run) {
                        var _a, _b, _c, _d, _e;
                        if (!options.q)
                            return true;
                        var q = options.q.toLowerCase();
                        return [
                            run.runId,
                            (_a = run.taskPreview) !== null && _a !== void 0 ? _a : "",
                            (_b = run.summaryPreview) !== null && _b !== void 0 ? _b : "",
                            (_c = run.lastEventType) !== null && _c !== void 0 ? _c : "",
                            (_d = run.lastActor) !== null && _d !== void 0 ? _d : "",
                            (_e = run.lastMessageType) !== null && _e !== void 0 ? _e : "",
                        ]
                            .join("\n")
                            .toLowerCase()
                            .includes(q);
                    })
                        .filter(function (run) {
                        var _a;
                        if (!options.status || options.status === "all")
                            return true;
                        return ((_a = run.primaryStatus) !== null && _a !== void 0 ? _a : computePrimaryStatus(run)) === options.status;
                    })
                        .filter(function (run) {
                        var _a;
                        if (!options.namespace || options.namespace === "all")
                            return true;
                        var actor = (_a = run.lastActor) !== null && _a !== void 0 ? _a : "";
                        if (options.namespace === "main") {
                            return actor === "/orchestrator" || (!actor.startsWith("/orchestrator/") && !actor.includes("/orchestrator/"));
                        }
                        return actor.includes("/orchestrator/".concat(options.namespace)) || actor.includes("/".concat(options.namespace, "/")) || actor.includes("/".concat(options.namespace));
                    })
                        .slice(0, limit);
                    nextCursor = filtered.length > 0 ? (_c = filtered[filtered.length - 1]) === null || _c === void 0 ? void 0 : _c.lastAt : undefined;
                    return [2 /*return*/, { runs: filtered, nextCursor: nextCursor !== null && nextCursor !== void 0 ? nextCursor : undefined }];
            }
        });
    });
}
function pairsToObject(pairs) {
    var result = {};
    for (var i = 0; i < pairs.length; i += 2) {
        var key = pairs[i];
        var value = pairs[i + 1];
        if (typeof key === "string" && typeof value === "string")
            result[key] = value;
    }
    return result;
}
function getRunDetailFromRedis(runId_1) {
    return __awaiter(this, arguments, void 0, function (runId, limit) {
        var redis, runHash, summary, events, start, chunk, _i, _a, _b, entryId, pairList, fields, data, raw, lastId, actions, tasks, seen, _c, events_1, event_1, messageId, key, key, actors;
        var _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
        if (limit === void 0) { limit = 300; }
        return __generator(this, function (_s) {
            switch (_s.label) {
                case 0:
                    redis = (0, redis_1.getRedis)();
                    return [4 /*yield*/, redis.hgetall(runKey(runId))];
                case 1:
                    runHash = (_s.sent());
                    summary = runHash && Object.keys(runHash).length > 0 ? toSummaryFromRedis(runId, runHash) : null;
                    events = [];
                    start = "+";
                    _s.label = 2;
                case 2:
                    if (!(events.length < limit)) return [3 /*break*/, 4];
                    return [4 /*yield*/, redis.xrevrange(EVENTS_STREAM, start, "-", "COUNT", 500)];
                case 3:
                    chunk = _s.sent();
                    if (!chunk || chunk.length === 0)
                        return [3 /*break*/, 4];
                    for (_i = 0, _a = chunk; _i < _a.length; _i++) {
                        _b = _a[_i], entryId = _b[0], pairList = _b[1];
                        fields = pairsToObject(pairList);
                        if (((_d = fields.runId) !== null && _d !== void 0 ? _d : "") !== runId)
                            continue;
                        data = void 0;
                        raw = (_e = fields.data) !== null && _e !== void 0 ? _e : "";
                        if (raw) {
                            try {
                                data = JSON.parse(raw);
                            }
                            catch (_t) {
                                data = undefined;
                            }
                        }
                        events.push({
                            id: entryId,
                            type: (_f = fields.type) !== null && _f !== void 0 ? _f : "",
                            ts: Number((_g = fields.ts) !== null && _g !== void 0 ? _g : 0),
                            runId: fields.runId || undefined,
                            actor: fields.actor || undefined,
                            messageType: fields.messageType || undefined,
                            data: data,
                        });
                        if (events.length >= limit)
                            break;
                    }
                    lastId = (_h = chunk[chunk.length - 1]) === null || _h === void 0 ? void 0 : _h[0];
                    if (!lastId)
                        return [3 /*break*/, 4];
                    start = "(".concat(lastId);
                    if (chunk.length < 500)
                        return [3 /*break*/, 4];
                    return [3 /*break*/, 2];
                case 4:
                    events.sort(function (a, b) { return a.ts - b.ts; });
                    actions = events.filter(function (event) {
                        return ["tool_start", "tool_end", "tool_error", "llm_start", "llm_end", "llm_error"].includes(event.type);
                    });
                    tasks = [];
                    seen = new Set();
                    for (_c = 0, events_1 = events; _c < events_1.length; _c++) {
                        event_1 = events_1[_c];
                        messageId = typeof ((_j = event_1.data) === null || _j === void 0 ? void 0 : _j.messageId) === "string" ? event_1.data.messageId : event_1.id;
                        if (event_1.messageType === "TaskRequest" && ((_l = (_k = event_1.data) === null || _k === void 0 ? void 0 : _k.payload) === null || _l === void 0 ? void 0 : _l.task)) {
                            key = "request:".concat(messageId);
                            if (seen.has(key))
                                continue;
                            seen.add(key);
                            tasks.push({
                                kind: "request",
                                text: String(event_1.data.payload.task),
                                ts: event_1.ts,
                            });
                        }
                        if (event_1.messageType === "TaskResult" && ((_o = (_m = event_1.data) === null || _m === void 0 ? void 0 : _m.payload) === null || _o === void 0 ? void 0 : _o.taskId) === "summary") {
                            key = "result:".concat(messageId);
                            if (seen.has(key))
                                continue;
                            seen.add(key);
                            tasks.push({
                                kind: "result",
                                status: String((_p = event_1.data.payload.status) !== null && _p !== void 0 ? _p : ""),
                                text: String((_r = (_q = event_1.data.payload.result) !== null && _q !== void 0 ? _q : event_1.data.payload.error) !== null && _r !== void 0 ? _r : ""),
                                ts: event_1.ts,
                            });
                        }
                    }
                    actors = Array.from(new Set(events.map(function (event) { return event.actor; }).filter(Boolean)));
                    return [2 /*return*/, { summary: summary, events: events, actions: actions, tasks: tasks, actors: actors }];
            }
        });
    });
}
function getRuns(options) {
    return __awaiter(this, void 0, void 0, function () {
        var base, _a, limit, params, payload, _b, _c;
        var _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    base = getApiBaseMaybe();
                    if (!!base) return [3 /*break*/, 4];
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, getRunsFromRedis(options)];
                case 2: return [2 /*return*/, _e.sent()];
                case 3:
                    _a = _e.sent();
                    return [2 /*return*/, { runs: [], nextCursor: undefined }];
                case 4:
                    _e.trys.push([4, 6, , 11]);
                    limit = (_d = options.limit) !== null && _d !== void 0 ? _d : DEFAULT_LIMIT;
                    params = new URLSearchParams();
                    params.set("limit", String(limit));
                    if (options.cursor)
                        params.set("cursor", String(options.cursor));
                    if (options.status)
                        params.set("status", options.status);
                    if (options.q)
                        params.set("q", options.q);
                    return [4 /*yield*/, apiFetch("/api/runs?".concat(params.toString()))];
                case 5:
                    payload = _e.sent();
                    return [2 /*return*/, { runs: payload.runs.map(toSummary), nextCursor: payload.nextCursor }];
                case 6:
                    _b = _e.sent();
                    _e.label = 7;
                case 7:
                    _e.trys.push([7, 9, , 10]);
                    return [4 /*yield*/, getRunsFromRedis(options)];
                case 8: return [2 /*return*/, _e.sent()];
                case 9:
                    _c = _e.sent();
                    return [2 /*return*/, { runs: [], nextCursor: undefined }];
                case 10: return [3 /*break*/, 11];
                case 11: return [2 /*return*/];
            }
        });
    });
}
function getRunDetail(runId_1) {
    return __awaiter(this, arguments, void 0, function (runId, limit) {
        var base, _a, runPayload, summary, eventsPayload, events, actions, tasks, seen, _i, events_2, event_2, messageId, key, key, actors, _b, _c;
        var _d, _e, _f, _g, _h, _j, _k, _l, _m;
        if (limit === void 0) { limit = 300; }
        return __generator(this, function (_o) {
            switch (_o.label) {
                case 0:
                    base = getApiBaseMaybe();
                    if (!!base) return [3 /*break*/, 4];
                    _o.label = 1;
                case 1:
                    _o.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, getRunDetailFromRedis(runId, limit)];
                case 2: return [2 /*return*/, _o.sent()];
                case 3:
                    _a = _o.sent();
                    return [2 /*return*/, { summary: null, events: [], actions: [], tasks: [], actors: [] }];
                case 4:
                    _o.trys.push([4, 7, , 12]);
                    return [4 /*yield*/, apiFetch("/api/runs/".concat(runId))];
                case 5:
                    runPayload = _o.sent();
                    summary = runPayload.run ? toSummary(runPayload.run) : null;
                    return [4 /*yield*/, apiFetch("/api/runs/".concat(runId, "/events?limit=").concat(limit))];
                case 6:
                    eventsPayload = _o.sent();
                    events = ((_d = eventsPayload.events) !== null && _d !== void 0 ? _d : []).map(function (event, index) {
                        var _a, _b, _c, _d, _e;
                        return ({
                            id: "".concat(runId, "-").concat(index),
                            type: String((_a = event.type) !== null && _a !== void 0 ? _a : ""),
                            ts: Number((_b = event.ts) !== null && _b !== void 0 ? _b : 0),
                            runId: runId,
                            actor: (_c = event.actor) !== null && _c !== void 0 ? _c : undefined,
                            messageType: (_d = event.messageType) !== null && _d !== void 0 ? _d : undefined,
                            data: (_e = event.data) !== null && _e !== void 0 ? _e : undefined,
                        });
                    });
                    actions = events.filter(function (event) {
                        return ["tool_start", "tool_end", "tool_error", "llm_start", "llm_end", "llm_error"].includes(event.type);
                    });
                    tasks = [];
                    seen = new Set();
                    for (_i = 0, events_2 = events; _i < events_2.length; _i++) {
                        event_2 = events_2[_i];
                        messageId = typeof ((_e = event_2.data) === null || _e === void 0 ? void 0 : _e.messageId) === "string" ? event_2.data.messageId : event_2.id;
                        if (event_2.messageType === "TaskRequest" && ((_g = (_f = event_2.data) === null || _f === void 0 ? void 0 : _f.payload) === null || _g === void 0 ? void 0 : _g.task)) {
                            key = "request:".concat(messageId);
                            if (seen.has(key))
                                continue;
                            seen.add(key);
                            tasks.push({
                                kind: "request",
                                text: String(event_2.data.payload.task),
                                ts: event_2.ts,
                            });
                        }
                        if (event_2.messageType === "TaskResult" && ((_j = (_h = event_2.data) === null || _h === void 0 ? void 0 : _h.payload) === null || _j === void 0 ? void 0 : _j.taskId) === "summary") {
                            key = "result:".concat(messageId);
                            if (seen.has(key))
                                continue;
                            seen.add(key);
                            tasks.push({
                                kind: "result",
                                status: String((_k = event_2.data.payload.status) !== null && _k !== void 0 ? _k : ""),
                                text: String((_m = (_l = event_2.data.payload.result) !== null && _l !== void 0 ? _l : event_2.data.payload.error) !== null && _m !== void 0 ? _m : ""),
                                ts: event_2.ts,
                            });
                        }
                    }
                    actors = Array.from(new Set(events.map(function (event) { return event.actor; }).filter(Boolean)));
                    return [2 /*return*/, { summary: summary, events: events, actions: actions, tasks: tasks, actors: actors }];
                case 7:
                    _b = _o.sent();
                    _o.label = 8;
                case 8:
                    _o.trys.push([8, 10, , 11]);
                    return [4 /*yield*/, getRunDetailFromRedis(runId, limit)];
                case 9: return [2 /*return*/, _o.sent()];
                case 10:
                    _c = _o.sent();
                    return [2 /*return*/, { summary: null, events: [], actions: [], tasks: [], actors: [] }];
                case 11: return [3 /*break*/, 12];
                case 12: return [2 /*return*/];
            }
        });
    });
}
function unavailableFullTrace(runId, message, temporarilyUnavailable) {
    if (temporarilyUnavailable === void 0) { temporarilyUnavailable = false; }
    return {
        available: false,
        source: "none",
        temporarilyUnavailable: temporarilyUnavailable,
        message: message,
        runId: runId,
        truncated: false,
        sections: [],
    };
}
function normalizeFullTrace(runId, raw) {
    if (!isObject(raw)) {
        return unavailableFullTrace(runId, "Trace payload is malformed.");
    }
    var sectionsRaw = Array.isArray(raw.sections) ? raw.sections : [];
    var sections = sectionsRaw
        .map(function (entry, index) {
        if (!isObject(entry))
            return null;
        var header = typeof entry.header === "string" ? scrubDisplayText(entry.header) : "[SECTION_".concat(index + 1, "]");
        var content = typeof entry.content === "string" ? scrubDisplayText(entry.content) : "";
        var chars = typeof entry.chars === "number" && Number.isFinite(entry.chars) ? entry.chars : content.length;
        return {
            id: typeof entry.id === "string" && entry.id ? entry.id : "section-".concat(index + 1),
            kind: typeof entry.kind === "string" && entry.kind ? entry.kind : "trace",
            header: header,
            content: content,
            chars: chars,
        };
    })
        .filter(function (entry) { return Boolean(entry); });
    var statsRaw = isObject(raw.stats) ? raw.stats : {};
    var sectionCount = typeof statsRaw.sectionCount === "number" && Number.isFinite(statsRaw.sectionCount)
        ? statsRaw.sectionCount
        : sections.length;
    var charCount = typeof statsRaw.charCount === "number" && Number.isFinite(statsRaw.charCount)
        ? statsRaw.charCount
        : sections.reduce(function (sum, section) { return sum + section.content.length; }, 0);
    return {
        available: true,
        source: "redis",
        runId: typeof raw.runId === "string" && raw.runId ? raw.runId : runId,
        status: raw.status === "ok" || raw.status === "failed" || raw.status === "skipped"
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
        redactionCount: typeof raw.redactionCount === "number" && Number.isFinite(raw.redactionCount)
            ? raw.redactionCount
            : undefined,
        sections: sections,
        stats: {
            messageCount: typeof statsRaw.messageCount === "number" && Number.isFinite(statsRaw.messageCount)
                ? statsRaw.messageCount
                : undefined,
            toolTraceCount: typeof statsRaw.toolTraceCount === "number" && Number.isFinite(statsRaw.toolTraceCount)
                ? statsRaw.toolTraceCount
                : undefined,
            sectionCount: sectionCount,
            charCount: charCount,
            droppedSections: typeof statsRaw.droppedSections === "number" && Number.isFinite(statsRaw.droppedSections)
                ? statsRaw.droppedSections
                : undefined,
        },
    };
}
function getRunFullTrace(runId) {
    return __awaiter(this, void 0, void 0, function () {
        var redis, raw, parsed, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    redis = (0, redis_1.getRedis)();
                    return [4 /*yield*/, redis.get(fullTraceKey(runId))];
                case 1:
                    raw = _b.sent();
                    if (!raw) {
                        return [2 /*return*/, unavailableFullTrace(runId, "Full trace is not available for this run.")];
                    }
                    parsed = void 0;
                    try {
                        parsed = JSON.parse(raw);
                    }
                    catch (_c) {
                        return [2 /*return*/, unavailableFullTrace(runId, "Full trace payload could not be decoded.")];
                    }
                    return [2 /*return*/, normalizeFullTrace(runId, parsed)];
                case 2:
                    _a = _b.sent();
                    return [2 /*return*/, unavailableFullTrace(runId, "Full trace is temporarily unavailable. Timeline data is still available.", true)];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function getActors() {
    return __awaiter(this, void 0, void 0, function () {
        var redis, addresses, pipeline, _i, addresses_1, address, results, now, entries, i, value, parsed, age, status_1, _a;
        var _b, _c, _d, _e, _f, _g, _h;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0:
                    _j.trys.push([0, 3, , 4]);
                    redis = (0, redis_1.getRedis)();
                    return [4 /*yield*/, redis.smembers(REGISTRY_INDEX_KEY)];
                case 1:
                    addresses = _j.sent();
                    if (addresses.length === 0)
                        return [2 /*return*/, []];
                    pipeline = redis.pipeline();
                    for (_i = 0, addresses_1 = addresses; _i < addresses_1.length; _i++) {
                        address = addresses_1[_i];
                        pipeline.get("".concat(REGISTRY_ENTRY_PREFIX, ":").concat(address));
                    }
                    return [4 /*yield*/, pipeline.exec()];
                case 2:
                    results = _j.sent();
                    if (!results)
                        return [2 /*return*/, []];
                    now = Date.now();
                    entries = [];
                    for (i = 0; i < results.length; i++) {
                        value = (_b = results[i]) === null || _b === void 0 ? void 0 : _b[1];
                        if (typeof value !== "string") {
                            // Key expired → actor is stale/gone; still show it as stale
                            entries.push({
                                address: addresses[i],
                                name: (_c = addresses[i].split("/").pop()) !== null && _c !== void 0 ? _c : addresses[i],
                                capabilities: [],
                                updatedAt: 0,
                                status: "stale",
                            });
                            continue;
                        }
                        try {
                            parsed = JSON.parse(value);
                            age = now - ((_d = parsed.updatedAt) !== null && _d !== void 0 ? _d : 0);
                            status_1 = age < 30000 ? "alive" : "stale";
                            entries.push({
                                address: parsed.address,
                                name: (_f = (_e = parsed.name) !== null && _e !== void 0 ? _e : parsed.address.split("/").pop()) !== null && _f !== void 0 ? _f : parsed.address,
                                description: parsed.description,
                                capabilities: (_g = parsed.capabilities) !== null && _g !== void 0 ? _g : [],
                                updatedAt: (_h = parsed.updatedAt) !== null && _h !== void 0 ? _h : 0,
                                status: status_1,
                            });
                        }
                        catch (_k) {
                            // Skip malformed entries
                        }
                    }
                    return [2 /*return*/, entries.sort(function (a, b) { return b.updatedAt - a.updatedAt; })];
                case 3:
                    _a = _j.sent();
                    return [2 /*return*/, []];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function getDlq() {
    return __awaiter(this, arguments, void 0, function (limit) {
        var redis, events, start, chunk, _i, _a, _b, entryId, pairList, fields, data, lastId, _c;
        var _d, _e, _f, _g;
        if (limit === void 0) { limit = 100; }
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    _h.trys.push([0, 4, , 5]);
                    redis = (0, redis_1.getRedis)();
                    events = [];
                    start = "+";
                    _h.label = 1;
                case 1:
                    if (!(events.length < limit)) return [3 /*break*/, 3];
                    return [4 /*yield*/, redis.xrevrange(EVENTS_STREAM, start, "-", "COUNT", 500)];
                case 2:
                    chunk = _h.sent();
                    if (!chunk || chunk.length === 0)
                        return [3 /*break*/, 3];
                    for (_i = 0, _a = chunk; _i < _a.length; _i++) {
                        _b = _a[_i], entryId = _b[0], pairList = _b[1];
                        fields = pairsToObject(pairList);
                        if (fields.type !== "message_deadlettered")
                            continue;
                        data = void 0;
                        try {
                            data = fields.data ? JSON.parse(fields.data) : undefined;
                        }
                        catch (_j) {
                            data = undefined;
                        }
                        events.push({
                            id: entryId,
                            runId: fields.runId || undefined,
                            actor: fields.actor || undefined,
                            messageType: fields.messageType || undefined,
                            reason: (_e = (_d = data === null || data === void 0 ? void 0 : data.reason) !== null && _d !== void 0 ? _d : data === null || data === void 0 ? void 0 : data.error) !== null && _e !== void 0 ? _e : undefined,
                            ts: Number((_f = fields.ts) !== null && _f !== void 0 ? _f : 0),
                        });
                        if (events.length >= limit)
                            break;
                    }
                    lastId = (_g = chunk[chunk.length - 1]) === null || _g === void 0 ? void 0 : _g[0];
                    if (!lastId)
                        return [3 /*break*/, 3];
                    start = "(".concat(lastId);
                    if (chunk.length < 500)
                        return [3 /*break*/, 3];
                    return [3 /*break*/, 1];
                case 3: return [2 /*return*/, events];
                case 4:
                    _c = _h.sent();
                    return [2 /*return*/, []];
                case 5: return [2 /*return*/];
            }
        });
    });
}
//# sourceMappingURL=telemetry.js.map