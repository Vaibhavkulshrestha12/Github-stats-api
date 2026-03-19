import type {
  GraphCardData,
  LanguagesCardData,
  StatsCardData,
  SVGRenderOptions,
} from "../types/index.js";
import { renderGraphSvg } from "./graphSvg.js";
import { renderLanguageCardSvg } from "./languageCardSvg.js";
import { renderStatsSvg } from "./statsSvg.js";

export function renderStatsCard(
  data: StatsCardData,
  options: SVGRenderOptions = {}
): string {
  return renderStatsSvg(data, options);
}

export function renderLanguagesCard(
  data: LanguagesCardData,
  options: SVGRenderOptions = {}
): string {
  return renderLanguageCardSvg(data, options);
}

export function renderGraphCard(
  data: GraphCardData,
  options: SVGRenderOptions = {}
): string {
  return renderGraphSvg(data, options);
}

function buildMemberSinceLabel(isoDate: string): string {
  const createdAt = new Date(isoDate);
  const now = new Date();
  const years =
    now.getUTCFullYear() -
    createdAt.getUTCFullYear() -
    (now.getUTCMonth() < createdAt.getUTCMonth() ||
    (now.getUTCMonth() === createdAt.getUTCMonth() &&
      now.getUTCDate() < createdAt.getUTCDate())
      ? 1
      : 0);

  if (years <= 1) {
    return "Joined GitHub 1 year ago";
  }

  return `Joined GitHub ${years} years ago`;
}

export function buildGraphCardData(input: {
  contributions: GraphCardData["contributions"];
  createdAt: string;
  currentYearContributions: number;
  displayName: string;
  email: string | null;
  totalRepos: number;
  username: string;
}): GraphCardData {
  return {
    contributions: input.contributions,
    currentYearContributions: input.currentYearContributions,
    displayName: input.displayName,
    email: input.email,
    memberSinceLabel: buildMemberSinceLabel(input.createdAt),
    totalRepos: input.totalRepos,
    username: input.username,
  };
}
