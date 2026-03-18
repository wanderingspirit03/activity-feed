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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getScores = getScores;
var node_fs_1 = require("node:fs");
var node_path_1 = require("node:path");
var redis_1 = require("@/lib/redis");
/* ── Helpers ───────────────────────────────────────────── */
function avg(nums) {
	if (nums.length === 0) return 0;
	return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}
function sliceAvg(entries, count) {
	var slice = entries.slice(-count);
	return {
		avgQuality: avg(slice.map((e) => e.scores.quality)),
		avgEfficiency: avg(slice.map((e) => e.scores.efficiency)),
		avgToolSelection: avg(slice.map((e) => e.scores.toolSelection)),
		avgCommunication: avg(slice.map((e) => e.scores.communication)),
	};
}
/* ── Data Loading ──────────────────────────────────────── */
var SCORES_KEY = "actor:scores:entries";
var SCORES_DIR = node_path_1.default.resolve(process.cwd(), "../memory/scores");
function readJsonSafe(filePath) {
	return __awaiter(this, void 0, void 0, function () {
		var raw, _a;
		return __generator(this, (_b) => {
			switch (_b.label) {
				case 0:
					_b.trys.push([0, 2, , 3]);
					return [4 /*yield*/, node_fs_1.promises.readFile(filePath, "utf-8")];
				case 1:
					raw = _b.sent();
					return [2 /*return*/, JSON.parse(raw)];
				case 2:
					_a = _b.sent();
					return [2 /*return*/, null];
				case 3:
					return [2 /*return*/];
			}
		});
	});
}
function getScoresFromRedis() {
	return __awaiter(this, void 0, void 0, function () {
		var redis, members, entries, _i, members_1, m, _a;
		return __generator(this, (_b) => {
			switch (_b.label) {
				case 0:
					_b.trys.push([0, 2, , 3]);
					redis = (0, redis_1.getRedis)();
					return [4 /*yield*/, redis.zrange(SCORES_KEY, 0, -1)];
				case 1:
					members = _b.sent();
					if (!members || members.length === 0) return [2 /*return*/, null];
					entries = [];
					for (_i = 0, members_1 = members; _i < members_1.length; _i++) {
						m = members_1[_i];
						try {
							entries.push(JSON.parse(m));
						} catch (_c) {}
					}
					return [2 /*return*/, entries.length > 0 ? entries : null];
				case 2:
					_a = _b.sent();
					return [2 /*return*/, null];
				case 3:
					return [2 /*return*/];
			}
		});
	});
}
function getScores() {
	return __awaiter(this, void 0, void 0, function () {
		var entries,
			redisEntries,
			scoresData,
			impactData,
			scored,
			totalToolCalls,
			totalToolErrors,
			totals,
			byDay,
			_i,
			scored_1,
			entry,
			date,
			existing,
			daily,
			worstTasks;
		var _a, _b;
		return __generator(this, (_c) => {
			switch (_c.label) {
				case 0:
					return [4 /*yield*/, getScoresFromRedis()];
				case 1:
					redisEntries = _c.sent();
					if (!(redisEntries && redisEntries.length > 0)) return [3 /*break*/, 2];
					entries = redisEntries;
					return [3 /*break*/, 4];
				case 2:
					return [4 /*yield*/, readJsonSafe(node_path_1.default.join(SCORES_DIR, "task-scores.json"))];
				case 3:
					scoresData = _c.sent();
					entries =
						(_a = scoresData === null || scoresData === void 0 ? void 0 : scoresData.entries) !== null && _a !== void 0
							? _a
							: [];
					_c.label = 4;
				case 4:
					return [4 /*yield*/, readJsonSafe(node_path_1.default.join(SCORES_DIR, "improvement-impact.json"))];
				case 5:
					impactData = _c.sent();
					scored = entries.filter((e) => e.scores);
					totalToolCalls = scored.reduce((sum, e) => {
						var _a, _b;
						return (
							sum +
							((_b = (_a = e.stats) === null || _a === void 0 ? void 0 : _a.toolCalls) !== null && _b !== void 0
								? _b
								: 0)
						);
					}, 0);
					totalToolErrors = scored.reduce((sum, e) => {
						var _a, _b;
						return (
							sum +
							((_b = (_a = e.stats) === null || _a === void 0 ? void 0 : _a.toolErrors) !== null && _b !== void 0
								? _b
								: 0)
						);
					}, 0);
					totals = __assign(__assign({ count: scored.length }, sliceAvg(scored, scored.length)), {
						errorRate: totalToolCalls > 0 ? Math.round((totalToolErrors / totalToolCalls) * 1000) / 10 : 0,
					});
					byDay = new Map();
					for (_i = 0, scored_1 = scored; _i < scored_1.length; _i++) {
						entry = scored_1[_i];
						date = entry.timestamp.slice(0, 10);
						existing = (_b = byDay.get(date)) !== null && _b !== void 0 ? _b : [];
						existing.push(entry);
						byDay.set(date, existing);
					}
					daily = Array.from(byDay.entries())
						.map((_a) => {
							var date = _a[0],
								dayEntries = _a[1];
							return __assign({ date: date, count: dayEntries.length }, sliceAvg(dayEntries, dayEntries.length));
						})
						.sort((a, b) => a.date.localeCompare(b.date));
					worstTasks = __spreadArray([], scored, true)
						.sort((a, b) => a.scores.quality - b.scores.quality)
						.slice(0, 10);
					return [
						2 /*return*/,
						{
							entries: scored,
							totals: totals,
							recent30: sliceAvg(scored, 30),
							recent10: sliceAvg(scored, 10),
							daily: daily,
							impact: impactData,
							worstTasks: worstTasks,
						},
					];
			}
		});
	});
}
//# sourceMappingURL=scores.js.map
