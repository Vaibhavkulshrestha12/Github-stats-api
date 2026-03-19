import type { LanguagesCardData, SVGRenderOptions } from "../types/index.js";
import { getLanguageColor } from "./languageColors.js";
import {
  BAR_TO_LIST_GAP,
  CARD_FONT_FAMILY,
  CARD_PADDING,
  LIST_ROW_GAP,
  TITLE_TO_BAR_GAP,
} from "./layout.js";
import { createCardSvg } from "./sharedCardContainer.js";

const COLORS = {
  title: "#c9d1d9",
  value: "#58a6ff",
} as const;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderLanguageCardSvg(
  data: LanguagesCardData,
  _options: SVGRenderOptions = {}
): string {
  const width = 330;
  const height = 150;
  const sorted = [...data.languages].sort((left, right) => right.size - left.size);
  const limited = sorted.slice(0, 5);
  const remaining = sorted.slice(6);

  if (remaining.length > 0) {
    const otherSize = remaining.reduce((sum, language) => sum + language.size, 0);
    const totalSize = sorted.reduce((sum, language) => sum + language.size, 0);
    limited.push({
      color: "#8b949e",
      name: "Other",
      percentage: Number(((otherSize / Math.max(totalSize, 1)) * 100).toFixed(2)),
      size: otherSize,
    });
  }

  const titleY = 34;
  const barY = 52;
  const barX = CARD_PADDING;
  const barWidth = width - CARD_PADDING * 2;
  let currentX = barX;

  const segments = limited
    .map((language, index) => {
      const widthValue =
        index === limited.length - 1
          ? barX + barWidth - currentX
          : (language.percentage / 100) * barWidth;
      const fill = getLanguageColor(language.name);
      const rect = `<rect x="${currentX.toFixed(2)}" y="${barY}" width="${Math.max(
        0,
        widthValue
      ).toFixed(2)}" height="8" fill="${fill}"/>`;
      currentX += widthValue;
      return rect;
    })
    .join("");

  const leftColumn = limited.filter((_, index) => index % 2 === 0);
  const rightColumn = limited.filter((_, index) => index % 2 === 1);

  const renderColumn = (items: typeof limited, x: number): string =>
    items
      .map((language, index) => {
        const y = 86 + index * 28;
        return `<circle cx="${x}" cy="${y - 4}" r="4" fill="${getLanguageColor(language.name)}"/>
        <text x="${x + 12}" y="${y}" font-family="${CARD_FONT_FAMILY}" font-size="13" fill="${COLORS.value}">${escapeXml(
          `${language.name} ${language.percentage.toFixed(2)}%`
        )}</text>`;
      })
      .join("");

  const content = `
    <text x="${CARD_PADDING}" y="${titleY}" font-family="${CARD_FONT_FAMILY}" font-size="16" font-weight="600" fill="#facc15">Most Used Languages</text>
    <rect x="${barX}" y="${barY}" width="${barWidth}" height="8" rx="6" fill="#161b22"/>
    <clipPath id="languagesBarClip">
      <rect x="${barX}" y="${barY}" width="${barWidth}" height="8" rx="6"/>
    </clipPath>
    <g clip-path="url(#languagesBarClip)">${segments}</g>
    ${renderColumn(leftColumn, CARD_PADDING + 6)}
    ${renderColumn(rightColumn, 175)}
  `;

  return createCardSvg(width, height, `${data.username} language card`, content);
}
