import { getEnv } from "./config/env.js";
import graphHandler from "./api/graph.js";
import languagesHandler from "./api/languages.js";
import statsHandler from "./api/stats.js";
import streakHandler from "./api/streak.js";

const { port } = getEnv();

const routes = new Map<string, (request: Request) => Promise<Response>>([
  ["/api/graph", graphHandler],
  ["/api/languages", languagesHandler],
  ["/api/stats", statsHandler],
  ["/api/streak", streakHandler],
]);

Bun.serve({
  port,
  async fetch(request) {
    const pathname = new URL(request.url).pathname;
    const handler = routes.get(pathname);

    if (!handler) {
      return new Response(
        JSON.stringify(
          {
            endpoints: ["/api/stats", "/api/languages", "/api/graph", "/api/streak"],
            error: "Route not found.",
          },
          null,
          2
        ),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
        }
      );
    }

    return handler(request);
  },
});

console.log(`Server running at http://localhost:${port}`);
console.log(`Stats: http://localhost:${port}/api/stats?username=Vaibhavkulshrestha12`);
console.log(`Languages: http://localhost:${port}/api/languages?username=Vaibhavkulshrestha12`);
console.log(`Graph: http://localhost:${port}/api/graph?username=Vaibhavkulshrestha12`);
console.log(`Streak: http://localhost:${port}/api/streak?username=Vaibhavkulshrestha12`);
