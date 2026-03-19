# github-stats-api

GitHub profile cards API with four SVG endpoints:

- `/api/stats`
- `/api/languages`
- `/api/graph`
- `/api/streak`

Each endpoint also supports `format=json`.

## Query params

- `username` required
- `format` optional: `svg` or `json`
- `theme` optional: currently `dark`

## TTL

| Endpoint | TTL |
| --- | --- |
| `stats` | 1 hour |
| `languages` | 24 hours |
| `graph` | 6 hours |
| `streak` | 1 hour |

## Local run

1. Set [`.env`] with `GITHUB_TOKEN`
2. Run `bun run src/server.ts`

## api endpoints 


## Refresh behavior

For deployed embeds on Vercel there is no true hot reloader. Cards refresh through cache revalidation using fixed endpoint TTLs:

- `stats`: 1 hour
- `streak`: 1 hour
- `graph`: 6 hours
- `languages`: 24 hours

For README/portfolio usage:

- Vercel revalidates based on `s-maxage`
- stats-related cards update within 1 hour
- language usage updates within 24 hours
- GitHub README image caching can still delay visible updates slightly
- to force an immediate client-side refresh, change the URL query string, for example `&v=2`

## Security and performance

- per-IP rate limiting
- shared-cache and shared-rate-limit capable when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are configured
- ETag / `If-None-Match` support for `304 Not Modified`
- strict response security headers
- in-memory cache with in-flight request deduplication
- shared GitHub snapshot cache to avoid duplicate upstream calls
