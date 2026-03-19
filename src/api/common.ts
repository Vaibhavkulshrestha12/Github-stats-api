import { createHash } from "node:crypto";

import type {
  CardData,
  GitHubSnapshot,
  ResponseFormat,
  SVGRenderOptions,
  Theme,
} from "../types/index.js";
import { getOrSetAsync } from "../utils/cache.js";
import { checkRateLimit, extractIP } from "../utils/rateLimiter.js";

const VALID_FORMATS = new Set<ResponseFormat>(["json", "svg"]);
const VALID_THEMES = new Set<Theme>(["dark"]);

type BuildEndpointHandlerOptions<T extends CardData> = {
  cacheKeyPrefix: string;
  cacheTtlMs: number;
  loadData: (snapshot: GitHubSnapshot) => T;
  renderSvg: (data: T, options?: SVGRenderOptions) => string;
  snapshotLoader: (username: string) => Promise<GitHubSnapshot>;
};

interface ParsedParams {
  format: ResponseFormat;
  theme: Theme;
  username: string;
}

function createEtag(body: string): string {
  return `"${createHash("sha1").update(body).digest("hex")}"`;
}

function buildSecurityHeaders(
  status: number,
  contentType: string,
  extraHeaders?: HeadersInit
): Headers {
  const headers = new Headers(extraHeaders);

  headers.set("Content-Type", contentType);
  headers.set(
    "Cache-Control",
    status === 200
      ? "public, stale-while-revalidate=86400"
      : "no-store"
  );
  headers.set(
    "Content-Security-Policy",
    "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
  );
  headers.set("Cross-Origin-Resource-Policy", "cross-origin");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");

  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, If-None-Match");
  headers.set("Vary", "If-None-Match");

  return headers;
}

async function buildRateLimitState(request: Request): Promise<{
  allowed: boolean;
  headers: HeadersInit;
}> {
  const ip = extractIP(request);
  const result = await checkRateLimit(ip);

  return {
    allowed: result.allowed,
    headers: {
      "X-RateLimit-Limit": "30",
      "X-RateLimit-Remaining": String(result.remaining),
      "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
      ...(result.allowed ? {} : { "Retry-After": "60" }),
    },
  };
}

function errorResponse(
  message: string,
  status: number,
  extraHeaders?: HeadersInit
): Response {
  return new Response(JSON.stringify({ code: status, error: message }, null, 2), {
    status,
    headers: buildSecurityHeaders(
      status,
      "application/json; charset=utf-8",
      extraHeaders
    ),
  });
}

function parseParams(url: URL): ParsedParams | { error: string; status: number } {
  const username = url.searchParams.get("username")?.trim() ?? "";
  if (!username) {
    return { error: "Missing required parameter: username", status: 400 };
  }

  const rawFormat = url.searchParams.get("format") ?? "svg";
  const rawTheme = url.searchParams.get("theme") ?? "dark";

  return {
    format: VALID_FORMATS.has(rawFormat as ResponseFormat)
      ? (rawFormat as ResponseFormat)
      : "svg",
    theme: VALID_THEMES.has(rawTheme as Theme) ? "dark" : "dark",
    username,
  };
}

function maybeNotModified(request: Request, body: string): Response | null {
  const etag = createEtag(body);
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, {
      status: 304,
      headers: buildSecurityHeaders(304, "text/plain; charset=utf-8", {
        ETag: etag,
      }),
    });
  }

  return null;
}

export function buildEndpointHandler<T extends CardData>(
  options: BuildEndpointHandlerOptions<T>
): (request: Request) => Promise<Response> {
  return async function endpointHandler(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: buildSecurityHeaders(204, "text/plain; charset=utf-8"),
      });
    }

    const rateLimit = await buildRateLimitState(request);

    if (request.method !== "GET") {
      return errorResponse("Method not allowed.", 405, rateLimit.headers);
    }

    if (!rateLimit.allowed) {
      return errorResponse(
        "Rate limit exceeded. Try again in a minute.",
        429,
        rateLimit.headers
      );
    }

    const parsed = parseParams(new URL(request.url));
    if ("error" in parsed) {
      return errorResponse(parsed.error, parsed.status, rateLimit.headers);
    }

    const normalizedUsername = parsed.username.toLowerCase();
    const effectiveTtlSeconds = Math.floor(options.cacheTtlMs / 1000);
    const effectiveTtlMs = options.cacheTtlMs;

    try {
      const cacheResult = await getOrSetAsync(
        `${options.cacheKeyPrefix}:${normalizedUsername}`,
        effectiveTtlMs,
        async () => {
          const snapshot = await options.snapshotLoader(parsed.username);
          return options.loadData(snapshot);
        }
      );

      if (parsed.format === "json") {
        const body = JSON.stringify(cacheResult.value, null, 2);
        const notModified = maybeNotModified(request, body);
        if (notModified) {
          return notModified;
        }

        return new Response(body, {
          status: 200,
          headers: buildSecurityHeaders(200, "application/json; charset=utf-8", {
            ...rateLimit.headers,
            "Cache-Control": `public, s-maxage=${effectiveTtlSeconds}, stale-while-revalidate=86400`,
            ETag: createEtag(body),
            "X-Cache": cacheResult.hit ? "HIT" : "MISS",
          }),
        });
      }

      const svg = options.renderSvg(cacheResult.value, { theme: parsed.theme });
      const notModified = maybeNotModified(request, svg);
      if (notModified) {
        return notModified;
      }

      return new Response(svg, {
        status: 200,
        headers: buildSecurityHeaders(200, "image/svg+xml; charset=utf-8", {
          ...rateLimit.headers,
          "Cache-Control": `public, s-maxage=${effectiveTtlSeconds}, stale-while-revalidate=86400`,
          ETag: createEtag(svg),
          "X-Cache": cacheResult.hit ? "HIT" : "MISS",
        }),
      });
    } catch (error: unknown) {
      const knownError = error as Error & { statusCode?: number };
      return errorResponse(
        knownError.message || "Unexpected error.",
        knownError.statusCode ?? 500,
        rateLimit.headers
      );
    }
  };
}
