"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedis = getRedis;
var ioredis_1 = require("ioredis");
var redisUrl = (_b = (_a = process.env.ACTOR_REDIS_URL) !== null && _a !== void 0 ? _a : process.env.REDIS_URL) !== null && _b !== void 0 ? _b : "redis://127.0.0.1:6379";
function getRedis() {
    var globalWithRedis = globalThis;
    if (!globalWithRedis.__actor_dashboard_redis__) {
        globalWithRedis.__actor_dashboard_redis__ = new ioredis_1.default(redisUrl, {
            lazyConnect: false,
            enableReadyCheck: true,
            maxRetriesPerRequest: 1,
        });
    }
    return globalWithRedis.__actor_dashboard_redis__;
}
//# sourceMappingURL=redis.js.map