import { fetchGitHubSnapshot } from "../services/githubService.js";
import type { LanguagesCardData } from "../types/index.js";
import { renderLanguagesCard } from "../utils/svgRenderer.js";
import { buildEndpointHandler } from "./common.js";

const LANGUAGES_TTL_MS = 24 * 60 * 60 * 1000;

function buildLanguagesData(
  snapshot: Awaited<ReturnType<typeof fetchGitHubSnapshot>>
): LanguagesCardData {
  return {
    languages: snapshot.languages,
    username: snapshot.username,
  };
}

export default buildEndpointHandler({
  cacheKeyPrefix: "endpoint:languages",
  cacheTtlMs: LANGUAGES_TTL_MS,
  loadData: buildLanguagesData,
  renderSvg: renderLanguagesCard,
  snapshotLoader: fetchGitHubSnapshot,
});
