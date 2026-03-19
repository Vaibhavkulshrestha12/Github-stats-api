import { fetchGitHubSnapshot } from "../services/githubService.js";
import type { StreakCardData } from "../types/index.js";
import { renderStreakCardSvg } from "../utils/streakCardSvg.js";
import { buildEndpointHandler } from "./common.js";

const STREAK_TTL_MS = 60 * 60 * 1000;

function buildStreakData(
  snapshot: Awaited<ReturnType<typeof fetchGitHubSnapshot>>
): StreakCardData {
  return {
    currentStreak: snapshot.streak.current,
    currentStreakRangeLabel: snapshot.streak.currentRangeLabel,
    longestStreak: snapshot.streak.longest,
    longestStreakRangeLabel: snapshot.streak.longestRangeLabel,
    totalContributions: snapshot.totalContributions,
    username: snapshot.username,
  };
}

export default buildEndpointHandler({
  cacheKeyPrefix: "endpoint:streak",
  cacheTtlMs: STREAK_TTL_MS,
  loadData: buildStreakData,
  renderSvg: renderStreakCardSvg,
  snapshotLoader: fetchGitHubSnapshot,
});
