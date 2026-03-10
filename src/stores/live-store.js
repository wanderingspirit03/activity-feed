"use client";
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useLiveStore = void 0;
var zustand_1 = require("zustand");
function normalizeActivity(item) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    var startedAt = (_b = (_a = item.startedAt) !== null && _a !== void 0 ? _a : item.timestamp) !== null && _b !== void 0 ? _b : Date.now();
    var inferredStatus = item.status === "error"
        ? "error"
        : item.status === "success" || item.isActive === false
            ? "success"
            : "running";
    return {
        id: (_c = item.id) !== null && _c !== void 0 ? _c : "".concat((_d = item.toolName) !== null && _d !== void 0 ? _d : "event", "-").concat(startedAt),
        type: (_e = item.type) !== null && _e !== void 0 ? _e : "activity",
        title: (_h = (_g = (_f = item.title) !== null && _f !== void 0 ? _f : item.description) !== null && _g !== void 0 ? _g : item.toolName) !== null && _h !== void 0 ? _h : "Activity",
        toolName: item.toolName,
        toolArgs: item.toolArgs,
        result: item.result,
        status: inferredStatus,
        startedAt: startedAt,
        completedAt: (_j = item.completedAt) !== null && _j !== void 0 ? _j : (inferredStatus === "running" ? undefined : Date.now()),
        progress: item.progress,
    };
}
function normalizeRun(run) {
    var _a, _b, _c, _d, _e, _f;
    return {
        runId: run.runId,
        taskPreview: (_a = run.task) !== null && _a !== void 0 ? _a : "",
        status: (_b = run.phase) !== null && _b !== void 0 ? _b : "queued",
        startedAt: (_c = run.startedAt) !== null && _c !== void 0 ? _c : Date.now(),
        lastAt: (_d = run.updatedAt) !== null && _d !== void 0 ? _d : Date.now(),
        tools: ((_e = run.activities) !== null && _e !== void 0 ? _e : []).map(function (activity) { return normalizeActivity(activity); }),
        currentPhase: (_f = run.phase) !== null && _f !== void 0 ? _f : "queued",
    };
}
exports.useLiveStore = (0, zustand_1.create)(function (set) { return ({
    runs: new Map(),
    isConnected: false,
    lastEventAt: null,
    addEvent: function (event) {
        var message = (event !== null && event !== void 0 ? event : {});
        if (!message.type) {
            return;
        }
        set(function (state) {
            var _a, _b, _c, _d, _e, _f;
            var nextRuns = new Map(state.runs);
            var now = Date.now();
            if (message.type === "runs" && Array.isArray(message.data)) {
                for (var _i = 0, _g = message.data; _i < _g.length; _i++) {
                    var run = _g[_i];
                    if (!(run === null || run === void 0 ? void 0 : run.runId))
                        continue;
                    nextRuns.set(run.runId, normalizeRun(run));
                }
                return { runs: nextRuns, lastEventAt: now };
            }
            if (message.type === "run.update" && ((_a = message.data) === null || _a === void 0 ? void 0 : _a.runId)) {
                var incoming = normalizeRun(message.data);
                var existing = nextRuns.get(incoming.runId);
                nextRuns.set(incoming.runId, __assign(__assign(__assign({}, existing), incoming), { tools: incoming.tools.length > 0 ? incoming.tools : (_b = existing === null || existing === void 0 ? void 0 : existing.tools) !== null && _b !== void 0 ? _b : [] }));
                return { runs: nextRuns, lastEventAt: now };
            }
            if (message.type === "activity" && ((_c = message.data) === null || _c === void 0 ? void 0 : _c.runId)) {
                var activityRaw = message.data;
                var runId = activityRaw.runId;
                var activity_1 = normalizeActivity(activityRaw);
                var existing = (_d = nextRuns.get(runId)) !== null && _d !== void 0 ? _d : {
                    runId: runId,
                    taskPreview: "",
                    status: "running",
                    startedAt: activity_1.startedAt,
                    lastAt: activity_1.startedAt,
                    tools: [],
                    currentPhase: (_e = activityRaw.phase) !== null && _e !== void 0 ? _e : "working",
                };
                var tools = __spreadArray([], existing.tools, true);
                var idx = tools.findIndex(function (tool) { return tool.id === activity_1.id; });
                if (idx >= 0) {
                    tools[idx] = activity_1;
                }
                else {
                    tools.push(activity_1);
                }
                nextRuns.set(runId, __assign(__assign({}, existing), { status: activity_1.status === "error" ? "error" : existing.status, lastAt: activity_1.startedAt, currentPhase: (_f = activityRaw.phase) !== null && _f !== void 0 ? _f : existing.currentPhase, tools: tools }));
                return { runs: nextRuns, lastEventAt: now };
            }
            return { runs: nextRuns, lastEventAt: now };
        });
    },
    setConnected: function (value) {
        set({ isConnected: value });
    },
    clearRuns: function () {
        set({ runs: new Map(), lastEventAt: null });
    },
}); });
//# sourceMappingURL=live-store.js.map