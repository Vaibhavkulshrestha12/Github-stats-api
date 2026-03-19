import type { GraphCardData, SVGRenderOptions } from "../types/index.js";
import { renderIcon } from "./icons.js";
import {
  CARD_FONT_FAMILY,
  CARD_PADDING,
} from "./layout.js";
import { createCardSvg } from "./sharedCardContainer.js";

const COLORS = {
  area: "rgba(167, 139, 250, 0.25)",
  axis: "#8b949e",
  grid: "#21262d",
  line: "#a78bfa",
  title: "#f778ba",
  value: "#c9d1d9",
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

function weekTotals(days: GraphCardData["contributions"]): number[] {
  const totals: number[] = [];
  for (let index = 0; index < days.length; index += 7) {
    totals.push(days.slice(index, index + 7).reduce((sum, day) => sum + day.count, 0));
  }
  return totals;
}

function smoothLine(points: Array<[number, number]>): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0]![0]} ${points[0]![1]}`;

  const tension = 0.14;
  let path = `M ${points[0]![0].toFixed(2)} ${points[0]![1].toFixed(2)}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[Math.max(0, index - 1)]!;
    const p1 = points[index]!;
    const p2 = points[index + 1]!;
    const p3 = points[Math.min(points.length - 1, index + 2)]!;
    const cp1x = p1[0] + (p2[0] - p0[0]) * tension;
    const cp1y = p1[1] + (p2[1] - p0[1]) * tension;
    const cp2x = p2[0] - (p3[0] - p1[0]) * tension;
    const cp2y = p2[1] - (p3[1] - p1[1]) * tension;
    path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(
      2
    )}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }

  return path;
}

function closeArea(path: string, points: Array<[number, number]>, baseY: number): string {
  if (!path || points.length === 0) return "";
  const first = points[0]!;
  const last = points[points.length - 1]!;
  return `${path} L ${last[0].toFixed(2)} ${baseY.toFixed(2)} L ${first[0].toFixed(2)} ${baseY.toFixed(
    2
  )} Z`;
}

function formatDateLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

function buildDateTicks(days: GraphCardData["contributions"]): string[] {
  const desiredTicks = 6;
  const result: string[] = [];
  if (days.length === 0) return result;
  for (let index = 0; index < desiredTicks; index += 1) {
    const dayIndex = Math.min(days.length - 1, Math.round((index / (desiredTicks - 1)) * (days.length - 1)));
    result.push(formatDateLabel(days[dayIndex]!.date));
  }
  return result;
}

function buildAxisTicks(maxValue: number): number[] {
  const roundedMax = Math.max(1, Math.ceil(maxValue / 2) * 2);
  const step = Math.max(1, Math.ceil(roundedMax / 4));
  return [0, step, step * 2, step * 3, step * 4];
}

function infoRow(
  iconName: "clock" | "repo" | "github" | "email",
  text: string,
  y: number
): string {
  return `${renderIcon(iconName, CARD_PADDING, y - 12, 16)}
  <text x="${CARD_PADDING + 24}" y="${y}" font-family="${CARD_FONT_FAMILY}" font-size="14" fill="${COLORS.value}" dominant-baseline="middle">${escapeXml(
    text
  )}</text>`;
}

export function renderGraphSvg(
  data: GraphCardData,
  _options: SVGRenderOptions = {}
): string {
  const width = 820;
  const height = 230;
  const chartX = 368;
  const chartY = 36;
  const chartWidth = width - chartX - CARD_PADDING - 14;
  const chartHeight = 140;
  const totals = weekTotals(data.contributions);
  const maxTotal = Math.max(1, ...totals);
  const axisTicks = buildAxisTicks(maxTotal);
  const axisMax = axisTicks[axisTicks.length - 1]!;
  const points: Array<[number, number]> = totals.map((value, index) => {
    const x = chartX + (index / Math.max(totals.length - 1, 1)) * chartWidth;
    const y = chartY + chartHeight - (value / axisMax) * chartHeight;
    return [x, y];
  });
  const linePath = smoothLine(points);
  const areaPath = closeArea(linePath, points, chartY + chartHeight);
  const xLabels = buildDateTicks(data.contributions);
  const currentYear = new Date().getUTCFullYear();

  const content = `
    <text x="${CARD_PADDING}" y="40" font-family="${CARD_FONT_FAMILY}" font-size="18" font-weight="600" fill="${COLORS.title}">${escapeXml(
      `${data.username} (${data.displayName})`
    )}</text>
    ${infoRow("clock", `${formatCompact(data.currentYearContributions)} Contributions in ${currentYear}`, 76)}
    ${infoRow("repo", `${formatCompact(data.totalRepos)} Public Repos`, 108)}
    ${infoRow("github", data.memberSinceLabel, 140)}
    ${infoRow("email", data.email ?? "Public email not available", 172)}
    <text x="${chartX + chartWidth - 2}" y="24" font-family="${CARD_FONT_FAMILY}" font-size="12" fill="${COLORS.axis}" text-anchor="end">contributions in the last year</text>
    ${axisTicks
      .map((tick) => {
        const y = chartY + chartHeight - (tick / axisMax) * chartHeight;
        return `<line x1="${chartX}" y1="${y}" x2="${chartX + chartWidth}" y2="${y}" stroke="${COLORS.grid}" stroke-width="1" opacity="0.2"/>
        <text x="${chartX + chartWidth + 18}" y="${y + 4}" font-family="${CARD_FONT_FAMILY}" font-size="11" fill="${COLORS.axis}" text-anchor="end">${tick}</text>`;
      })
      .join("")}
    <path d="${areaPath}" fill="${COLORS.area}"/>
    <path d="${linePath}" fill="none" stroke="${COLORS.line}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    ${xLabels
      .map((label, index) => {
        const x = chartX + (index / Math.max(xLabels.length - 1, 1)) * chartWidth;
        return `<text x="${x}" y="${chartY + chartHeight + 20}" font-family="${CARD_FONT_FAMILY}" font-size="12" fill="${COLORS.axis}" text-anchor="middle">${label}</text>`;
      })
      .join("")}
  `;

  return createCardSvg(width, height, `${data.username} contribution graph card`, content);
}
