import { fetchGitHubSnapshot } from "../services/githubService.js";
import type { GraphCardData } from "../types/index.js";
import {
  buildGraphCardData,
  renderGraphCard,
} from "../utils/svgRenderer.js";
import { buildEndpointHandler } from "./common.js";

const GRAPH_TTL_MS = 6 * 60 * 60 * 1000;

function buildGraphData(
  snapshot: Awaited<ReturnType<typeof fetchGitHubSnapshot>>
): GraphCardData {
  return buildGraphCardData({
    contributions: snapshot.contributions,
    createdAt: snapshot.createdAt,
    currentYearContributions: snapshot.currentYearContributions,
    displayName: snapshot.displayName,
    email: snapshot.email,
    totalRepos: snapshot.totalRepos,
    username: snapshot.username,
  });
}

export default buildEndpointHandler({
  cacheKeyPrefix: "endpoint:graph",
  cacheTtlMs: GRAPH_TTL_MS,
  loadData: buildGraphData,
  renderSvg: renderGraphCard,
  snapshotLoader: fetchGitHubSnapshot,
});
