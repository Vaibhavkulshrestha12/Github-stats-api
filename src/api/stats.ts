import { fetchGitHubSnapshot } from "../services/githubService.js";
import type { StatsCardData } from "../types/index.js";
import { renderStatsCard } from "../utils/svgRenderer.js";
import { buildEndpointHandler } from "./common.js";

const STATS_TTL_MS = 60 * 60 * 1000;

function buildStatsData(snapshot: Awaited<ReturnType<typeof fetchGitHubSnapshot>>): StatsCardData {
  return {
    contributedTo: snapshot.contributedTo,
    currentStreak: snapshot.streak.current,
    currentStreakRangeLabel: snapshot.streak.currentRangeLabel,
    issues: snapshot.issues,
    longestStreak: snapshot.streak.longest,
    longestStreakRangeLabel: snapshot.streak.longestRangeLabel,
    pullRequests: snapshot.pullRequests,
    totalCommits: snapshot.totalCommits,
    totalContributions: snapshot.totalContributions,
    totalStars: snapshot.totalStars,
    username: snapshot.username,
  };
}

export default buildEndpointHandler({
  cacheKeyPrefix: "endpoint:stats",
  cacheTtlMs: STATS_TTL_MS,
  loadData: buildStatsData,
  renderSvg: renderStatsCard,
  snapshotLoader: fetchGitHubSnapshot,
});
