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
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = exports.runtime = void 0;
exports.GET = GET;
var server_1 = require("next/server");
var redis_1 = require("@/lib/redis");
exports.runtime = "nodejs";
exports.dynamic = "force-dynamic";
function normalizeOpData(input) {
	if (!input || typeof input !== "object") return null;
	var op = input;
	if (typeof op.opId !== "string" || op.opId.length === 0) return null;
	if (typeof op.title !== "string" || typeof op.status !== "string") return null;
	var features = Array.isArray(op.features)
		? op.features
				.filter((feature) => Boolean(feature && typeof feature === "object"))
				.map((feature) => {
					var _a, _b, _c, _d;
					return {
						id: String((_a = feature.id) !== null && _a !== void 0 ? _a : ""),
						title: String((_b = feature.title) !== null && _b !== void 0 ? _b : ""),
						status: (_c = feature.status) !== null && _c !== void 0 ? _c : "pending",
						phase: Number(feature.phase) || 0,
						assignedModel: String((_d = feature.assignedModel) !== null && _d !== void 0 ? _d : ""),
						attempts: Number(feature.attempts) || 0,
					};
				})
		: [];
	var events = Array.isArray(op.events)
		? op.events
				.filter((event) => Boolean(event && typeof event === "object"))
				.map((event) => {
					var _a, _b, _c;
					return {
						id: String((_a = event.id) !== null && _a !== void 0 ? _a : ""),
						timestamp: Number(event.timestamp) || 0,
						type: String((_b = event.type) !== null && _b !== void 0 ? _b : ""),
						title: String((_c = event.title) !== null && _c !== void 0 ? _c : ""),
						featureId: typeof event.featureId === "string" ? event.featureId : undefined,
						status: typeof event.status === "string" ? event.status : undefined,
						verdict: typeof event.verdict === "string" ? event.verdict : undefined,
					};
				})
		: [];
	return {
		opId: op.opId,
		title: op.title,
		status: op.status,
		features: features,
		currentPhase: Number(op.currentPhase) || 0,
		totalPhases: Number(op.totalPhases) || 0,
		startedAt: Number(op.startedAt) || 0,
		updatedAt: Number(op.updatedAt) || 0,
		events: events,
	};
}
function GET(_request, context) {
	return __awaiter(this, void 0, void 0, function () {
		var opId, redis, snapshot, parsed, op, error_1;
		return __generator(this, (_a) => {
			switch (_a.label) {
				case 0:
					_a.trys.push([0, 3, , 4]);
					return [4 /*yield*/, context.params];
				case 1:
					opId = _a.sent().opId;
					redis = (0, redis_1.getRedis)();
					return [4 /*yield*/, redis.get("ops:snapshot:".concat(opId))];
				case 2:
					snapshot = _a.sent();
					if (!snapshot) {
						return [2 /*return*/, server_1.NextResponse.json({ error: "Op not found" }, { status: 404 })];
					}
					parsed = JSON.parse(snapshot);
					op = normalizeOpData(parsed);
					if (!op) {
						return [2 /*return*/, server_1.NextResponse.json({ error: "Op not found" }, { status: 404 })];
					}
					return [2 /*return*/, server_1.NextResponse.json({ op: op })];
				case 3:
					error_1 = _a.sent();
					return [
						2 /*return*/,
						server_1.NextResponse.json({ error: "Failed to load op data", detail: String(error_1) }, { status: 500 }),
					];
				case 4:
					return [2 /*return*/];
			}
		});
	});
}
//# sourceMappingURL=route.js.map
