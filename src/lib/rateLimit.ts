import { config } from "@/lib/config";
import { logger } from "@/lib/logger";

/**
 * Sliding-window rate limiter. Uses Redis when REDIS_URL is configured so
 * limits are enforced consistently across multiple Azure App Service
 * instances; falls back to an in-memory store for local development or
 * single-instance deployments (documented limitation — see README).
 */

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

interface RateLimiterBackend {
  hit(key: string, windowMs: number, max: number): Promise<RateLimitResult>;
}

class InMemoryBackend implements RateLimiterBackend {
  private store = new Map<string, number[]>();

  async hit(key: string, windowMs: number, max: number): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const timestamps = (this.store.get(key) ?? []).filter((t) => t > windowStart);
    timestamps.push(now);
    this.store.set(key, timestamps);

    // Best-effort cleanup so the map doesn't grow unbounded in long-running dev processes.
    if (this.store.size > 50_000) {
      for (const [k, v] of this.store) {
        if (v.every((t) => t <= windowStart)) this.store.delete(k);
      }
    }

    return {
      allowed: timestamps.length <= max,
      remaining: Math.max(0, max - timestamps.length),
      resetAt: now + windowMs,
    };
  }
}

class RedisBackend implements RateLimiterBackend {
  private client: import("ioredis").Redis;

  constructor(redisUrl: string) {
    // Lazily required so environments without REDIS_URL never need ioredis to connect.
    const Redis = require("ioredis") as typeof import("ioredis").default;
    this.client = new Redis(redisUrl, { maxRetriesPerRequest: 2, lazyConnect: false });
    this.client.on("error", (err) => logger.error("Redis rate limiter error", { err: String(err) }));
  }

  async hit(key: string, windowMs: number, max: number): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const redisKey = `ratelimit:${key}`;

    const pipeline = this.client.pipeline();
    pipeline.zremrangebyscore(redisKey, 0, windowStart);
    pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);
    pipeline.zcard(redisKey);
    pipeline.pexpire(redisKey, windowMs);
    const results = await pipeline.exec();

    const count = (results?.[2]?.[1] as number) ?? 0;

    return {
      allowed: count <= max,
      remaining: Math.max(0, max - count),
      resetAt: now + windowMs,
    };
  }
}

let backend: RateLimiterBackend | null = null;

function getBackend(): RateLimiterBackend {
  if (backend) return backend;
  backend = config.REDIS_URL ? new RedisBackend(config.REDIS_URL) : new InMemoryBackend();
  return backend;
}

export async function checkRateLimit(
  key: string,
  options?: { windowMinutes?: number; maxRequests?: number },
): Promise<RateLimitResult> {
  const windowMs = (options?.windowMinutes ?? config.RATE_LIMIT_WINDOW_MIN) * 60_000;
  const max = options?.maxRequests ?? config.RATE_LIMIT_MAX_REQUESTS;
  return getBackend().hit(key, windowMs, max);
}

export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}
