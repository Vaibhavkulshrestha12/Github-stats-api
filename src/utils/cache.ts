import { getEnv } from "../config/env.js";
import type { CacheEntry } from "../types/index.js";

const store = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();
const DEFAULT_TTL_MS = 60 * 60 * 1000;
const MAX_ENTRIES = 1000;

type UpstashCommandResult<T> = Array<{
  error?: string;
  result?: T;
}>;

function evictExpiredEntries(now: number): void {
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt <= now) {
      store.delete(key);
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

export const cache = {
  get<T>(key: string): T | null {
    const now = Date.now();
    const entry = store.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= now) {
      store.delete(key);
      return null;
    }

    return entry.data;
  },

  set<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): void {
    const now = Date.now();
    if (store.size >= MAX_ENTRIES) {
      evictExpiredEntries(now);
    }

    store.set(key, {
      data,
      expiresAt: now + ttlMs,
    });
  },

  delete(key: string): void {
    store.delete(key);
  },
};

export async function getOrSetAsync<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<{ hit: boolean; value: T }> {
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return { hit: true, value: cached };
  }

  const remote = await runPipeline<string>([["GET", key]]);
  const remoteValue = remote?.[0]?.result;
  if (typeof remoteValue === "string") {
    const parsed = JSON.parse(remoteValue) as T;
    cache.set(key, parsed, ttlMs);
    return { hit: true, value: parsed };
  }

  const existingPromise = inFlight.get(key) as Promise<T> | undefined;
  if (existingPromise) {
    return {
      hit: false,
      value: await existingPromise,
    };
  }

  const promise = (async () => {
    const value = await loader();
    cache.set(key, value, ttlMs);
    await runPipeline([
      ["SET", key, JSON.stringify(value), "PX", ttlMs],
    ]);
    return value;
  })().finally(() => {
    inFlight.delete(key);
  });

  inFlight.set(key, promise);

  return {
    hit: false,
    value: await promise,
  };
}
