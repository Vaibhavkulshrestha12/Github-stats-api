import type { StatsCardData } from "../types/index.js";
import type { SVGRenderOptions } from "../types/index.js";
import { calculateGrade } from "./gradeCalculator.js";
import { createCardSvg } from "./sharedCardContainer.js";
import { renderIcon } from "./icons.js";
import {
  CARD_FONT_FAMILY,
  CARD_PADDING,
} from "./layout.js";

const COLORS = {
  accent: "#ec4899",
  label: "#cbd5f5",
  track: "#3b2a52",
  value: "#ffffff",
} as const;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  }

  return String(value);
}

function renderRow(
  iconName: "star" | "commits" | "pullRequest" | "issue" | "repo",
  label: string,
  value: string,
  rowIndex: number
): string {
  const y = 92 + rowIndex * 28;
  return `
    ${renderIcon(iconName, 28, y - 8, 16)}
    <text x="60" y="${y}" font-family="${CARD_FONT_FAMILY}" font-size="16" fill="${COLORS.label}" dominant-baseline="middle">${escapeXml(
      label
    )}</text>
    <text x="280" y="${y}" font-family="${CARD_FONT_FAMILY}" font-size="18" font-weight="600" fill="${COLORS.value}" text-anchor="end" dominant-baseline="middle">${escapeXml(
      value
    )}</text>
  `;
}

export function renderStatsSvg(
  stats: StatsCardData,
  _options: SVGRenderOptions = {}
): string {
  const width = 760;
  const height = 280;
  const radius = 60;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const grade = calculateGrade(stats);
  const dashOffset = circumference * (1 - grade.score);

  const rows = [
    renderRow("star", "Total Stars", formatCompact(stats.totalStars), 0),
    renderRow("commits", "Total Commits", formatCompact(stats.totalCommits), 1),
    renderRow("pullRequest", "Total PRs", formatCompact(stats.pullRequests), 2),
    renderRow("issue", "Total Issues", formatCompact(stats.issues), 3),
    renderRow("repo", "Contributed to", formatCompact(stats.contributedTo), 4),
  ].join("");

  const content = `
  <text x="${CARD_PADDING}" y="48" font-family="${CARD_FONT_FAMILY}" font-size="28" font-weight="700" fill="#f472b6">${escapeXml(
    `${stats.username}'s GitHub Stats`
  )}</text>
  ${rows}
  <g transform="translate(560 140)">
    <circle cx="0" cy="0" r="${radius}" fill="none" stroke="${COLORS.track}" stroke-width="${strokeWidth}"/>
    <circle cx="0" cy="0" r="${radius}" fill="none" stroke="${COLORS.accent}" stroke-width="${strokeWidth}"
      stroke-linecap="round" stroke-dasharray="${circumference.toFixed(2)}"
      stroke-dashoffset="${dashOffset.toFixed(2)}" transform="rotate(-90 0 0)"/>
    <text x="0" y="10" font-family="${CARD_FONT_FAMILY}" font-size="28" font-weight="700" fill="${COLORS.value}" text-anchor="middle">${grade.grade}</text>
  </g>
`;

  return createCardSvg(width, height, `${stats.username} GitHub stats`, content);
}
