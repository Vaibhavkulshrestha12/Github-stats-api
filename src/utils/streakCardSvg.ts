import type { StreakCardData, SVGRenderOptions } from "../types/index.js";
import { renderIcon } from "./icons.js";
import { CARD_FONT_FAMILY } from "./layout.js";
import { createCardSvg } from "./sharedCardContainer.js";

const COLORS = {
  accent: "#f59e0b",
  label: "#8b949e",
  subtext: "#6e7681",
  text: "#ffffff",
  track: "#21262d",
} as const;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function divider(x: number, height: number): string {
  return `<line x1="${x}" y1="20" x2="${x}" y2="${height - 20}" stroke="#30363d" stroke-width="1"/>`;
}

function sideBlock(
  centerX: number,
  value: string,
  label: string,
  subtext: string
): string {
  return `
    <text x="${centerX}" y="48" font-family="${CARD_FONT_FAMILY}" font-size="18" font-weight="700" fill="${COLORS.text}" text-anchor="middle">${escapeXml(
      value
    )}</text>
    <text x="${centerX}" y="70" font-family="${CARD_FONT_FAMILY}" font-size="11" fill="${COLORS.label}" text-anchor="middle">${escapeXml(
      label
    )}</text>
    <text x="${centerX}" y="90" font-family="${CARD_FONT_FAMILY}" font-size="10" fill="${COLORS.subtext}" text-anchor="middle">${escapeXml(
      subtext
    )}</text>
  `;
}

export function renderStreakCardSvg(
  data: StreakCardData,
  _options: SVGRenderOptions = {}
): string {
  const width = 286;
  const height = 111;
  const radius = 26;
  const strokeWidth = 5;
  const circumference = 2 * Math.PI * radius;
  const progress = data.longestStreak > 0 ? data.currentStreak / data.longestStreak : 0;
  const dashOffset = circumference * (1 - Math.max(0, Math.min(1, progress)));

  const content = `
    ${divider(95, height)}
    ${divider(190, height)}
    ${sideBlock(47.5, String(data.totalContributions), "Total Contributions", "Apr 18, 2016 - Present")}
    <g transform="translate(143 20)">
      ${renderIcon("clock", -6, -10, 12)}
    </g>
    <g transform="translate(143 42)">
      <circle cx="0" cy="0" r="${radius}" fill="none" stroke="${COLORS.track}" stroke-width="${strokeWidth}"/>
      <circle
        cx="0"
        cy="0"
        r="${radius}"
        fill="none"
        stroke="${COLORS.accent}"
        stroke-width="${strokeWidth}"
        stroke-linecap="round"
        stroke-dasharray="${circumference.toFixed(2)}"
        stroke-dashoffset="${dashOffset.toFixed(2)}"
        transform="rotate(-90 0 0)"
      />
    </g>
    <text x="143" y="49" font-family="${CARD_FONT_FAMILY}" font-size="18" font-weight="700" fill="${COLORS.text}" text-anchor="middle">${data.currentStreak}</text>
    <text x="143" y="80" font-family="${CARD_FONT_FAMILY}" font-size="11" fill="${COLORS.accent}" font-weight="600" text-anchor="middle">Current Streak</text>
    <text x="143" y="98" font-family="${CARD_FONT_FAMILY}" font-size="10" fill="${COLORS.subtext}" text-anchor="middle">${escapeXml(
      data.currentStreakRangeLabel
    )}</text>
    ${sideBlock(238, String(data.longestStreak), "Longest Streak", data.longestStreakRangeLabel)}
  `;

  return createCardSvg(width, height, `${data.username} streak card`, content);
}
