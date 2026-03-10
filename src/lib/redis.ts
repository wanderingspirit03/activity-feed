import Redis from "ioredis";

export const redisUrl =
  process.env.ACTOR_REDIS_URL ?? process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

const REDIS_RETRY_BASE_MS = 250;
const REDIS_RETRY_MAX_MS = 2_000;

type GlobalWithRedis = typeof globalThis & { __actor_dashboard_redis__?: Redis };

function createRedisClient(): Redis {
  const client = new Redis(redisUrl, {
    lazyConnect: true,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    connectTimeout: 10_000,
    retryStrategy: (attempts) => Math.min(attempts * REDIS_RETRY_BASE_MS, REDIS_RETRY_MAX_MS),
  });

  client.on("error", (error) => {
    console.error("[control-center] redis error", error);
  });

  return client;
}

export function getRedis(): Redis {
  const globalWithRedis = globalThis as GlobalWithRedis;
  if (!globalWithRedis.__actor_dashboard_redis__) {
    globalWithRedis.__actor_dashboard_redis__ = createRedisClient();
  }
  return globalWithRedis.__actor_dashboard_redis__;
}
