import { getEnv } from "../config/env.js";
import type { RateLimitEntry } from "../types/index.js";

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 30;
const store = new Map<string, RateLimitEntry>();

type UpstashCommandResult<T> = Array<{
  error?: string;
  result?: T;
}>;

let lastCleanup = 0;

function maybeCleanup(now: number): void {
  if (now - lastCleanup < 5 * 60 * 1000) {
    return;
  }

  lastCleanup = now;

  for (const [ip, entry] of store.entries()) {
    if (now - entry.windowStart > WINDOW_MS) {
      store.delete(ip);
    }
  }
}

function getUpstashConfig(): { token: string; url: string } | null {
  const env = getEnv();
  if (!env.upstashRedisRestToken || !env.upstashRedisRestUrl) {
    return null;
  }

  return {
    token: env.upstashRedisRestToken,
    url: env.upstashRedisRestUrl,
  };
}

async function runPipeline<T>(
  commands: Array<Array<string | number>>
): Promise<UpstashCommandResult<T> | null> {
  const config = getUpstashConfig();
  if (!config) {
    return null;
  }

  try {
    const response = await fetch(`${config.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(3_000),
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as UpstashCommandResult<T>;
  } catch {
    return null;
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const redisKey = `ratelimit:${ip}`;
  const remote = await runPipeline<number>([
    ["INCR", redisKey],
    ["PEXPIRE", redisKey, WINDOW_MS],
    ["PTTL", redisKey],
  ]);

  if (remote?.[0]?.result !== undefined && remote?.[2]?.result !== undefined) {
    const count = Number(remote[0].result);
    const ttl = Math.max(0, Number(remote[2].result));
    const now = Date.now();
    return {
      allowed: count <= MAX_REQUESTS,
      remaining: Math.max(0, MAX_REQUESTS - count),
      resetAt: now + ttl,
    };
  }

  const now = Date.now();
  maybeCleanup(now);

  const existing = store.get(ip);
  if (!existing || now - existing.windowStart > WINDOW_MS) {
    store.set(ip, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: MAX_REQUESTS - 1,
      resetAt: now + WINDOW_MS,
    };
  }

  existing.count += 1;

  return {
    allowed: existing.count <= MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - existing.count),
    resetAt: existing.windowStart + WINDOW_MS,
  };
}

export function extractIP(request: Request): string {
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return "unknown";
}
