import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

type EnvConfig = {
  githubToken: string;
  port: number;
  upstashRedisRestToken: string | null;
  upstashRedisRestUrl: string | null;
};

const ENV_PATH = resolve(process.cwd(), ".env");
const ENV_LINE = /^\s*([\w.-]+)\s*=\s*(.*)\s*$/;

let cachedEnv: EnvConfig | null = null;

function stripOuterQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function parseEnvFile(contents: string): Record<string, string> {
  const parsed: Record<string, string> = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = rawLine.match(ENV_LINE);
    if (!match) {
      continue;
    }

    const key = match[1];
    const rawValue = match[2] ?? "";
    let value = rawValue.trim();

    const hashIndex = value.indexOf("#");
    if (hashIndex >= 0 && !value.startsWith('"') && !value.startsWith("'")) {
      value = value.slice(0, hashIndex).trim();
    }

    if (!key) {
      continue;
    }

    parsed[key] = stripOuterQuotes(value);
  }

  return parsed;
}

function hydrateProcessEnv(): void {
  if (!existsSync(ENV_PATH)) {
    return;
  }

  const parsed = parseEnvFile(readFileSync(ENV_PATH, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }

  if (!process.env.GITHUB_TOKEN && process.env.githubtoken) {
    process.env.GITHUB_TOKEN = process.env.githubtoken;
  }
}

function parsePort(value: string | undefined): number {
  const fallback = 3000;
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1 || parsed > 65535) {
    return fallback;
  }

  return parsed;
}

function resolveUpstashRestUrl(): string | null {
  return (
    process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    process.env.KV_REST_API_URL?.trim() ||
    null
  );
}

function resolveUpstashRestToken(): string | null {
  return (
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    process.env.KV_REST_API_TOKEN?.trim() ||
    null
  );
}

export function getEnv(): EnvConfig {
  if (cachedEnv) {
    return cachedEnv;
  }

  hydrateProcessEnv();

  const githubToken = process.env.GITHUB_TOKEN?.trim();
  if (!githubToken) {
    throw new Error(
      "Missing GitHub token. Set GITHUB_TOKEN in the environment or .env file."
    );
  }

  cachedEnv = {
    githubToken,
    port: parsePort(process.env.PORT),
    upstashRedisRestToken: resolveUpstashRestToken(),
    upstashRedisRestUrl: resolveUpstashRestUrl(),
  };

  return cachedEnv;
}
