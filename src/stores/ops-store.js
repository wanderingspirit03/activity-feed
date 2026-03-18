"use client";

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
Object.defineProperty(exports, "__esModule", { value: true });
exports.useOpsStore = void 0;
var zustand_1 = require("zustand");
function normalizeOp(op) {
	return __assign(__assign({}, op), {
		features: Array.isArray(op.features) ? op.features : [],
		events: Array.isArray(op.events) ? op.events : [],
		startedAt: Number(op.startedAt) || Date.now(),
		updatedAt: Number(op.updatedAt) || Date.now(),
	});
}
function sortOpsByUpdatedAt(ops) {
	return __spreadArray([], ops, true).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}
exports.useOpsStore = (0, zustand_1.create)((set, get) => ({
	ops: [],
	addOrUpdateOp: (op) => {
		var normalized = normalizeOp(op);
		set((state) => {
			var idx = state.ops.findIndex((existing) => existing.opId === normalized.opId);
			if (idx === -1) {
				return { ops: sortOpsByUpdatedAt(__spreadArray(__spreadArray([], state.ops, true), [normalized], false)) };
			}
			var next = __spreadArray([], state.ops, true);
			next[idx] = __assign(__assign(__assign({}, next[idx]), normalized), {
				features: normalized.features,
				events: normalized.events,
			});
			return { ops: sortOpsByUpdatedAt(next) };
		});
	},
	processEvent: (envelope) => {
		var _a;
		var type = envelope === null || envelope === void 0 ? void 0 : envelope.type;
		if (!type) return;
		if (type === "ops.list" && Array.isArray(envelope.data)) {
			set({ ops: sortOpsByUpdatedAt(envelope.data.map((op) => normalizeOp(op))) });
			return;
		}
		if (type === "ops.update" && ((_a = envelope.data) === null || _a === void 0 ? void 0 : _a.opId)) {
			get().addOrUpdateOp(envelope.data);
		}
	},
}));
//# sourceMappingURL=ops-store.js.map
