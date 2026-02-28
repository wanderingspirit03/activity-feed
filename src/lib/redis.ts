import Redis from "ioredis";

const redisUrl = process.env.ACTOR_REDIS_URL ?? process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

type GlobalWithRedis = typeof globalThis & { __actor_dashboard_redis__?: Redis };

export function getRedis(): Redis {
  const globalWithRedis = globalThis as GlobalWithRedis;
  if (!globalWithRedis.__actor_dashboard_redis__) {
    globalWithRedis.__actor_dashboard_redis__ = new Redis(redisUrl, {
      lazyConnect: false,
      enableReadyCheck: true,
      maxRetriesPerRequest: 1,
    });
  }
  return globalWithRedis.__actor_dashboard_redis__;
}
