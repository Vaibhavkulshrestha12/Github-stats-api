import {
  CARD_BACKGROUND,
  CARD_BORDER,
  CARD_RADIUS,
} from "./layout.js";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function createCardSvg(
  width: number,
  height: number,
  label: string,
  content: string
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(
    label
  )}" shape-rendering="geometricPrecision">
  <rect
    x="0.5"
    y="0.5"
    width="${width - 1}"
    height="${height - 1}"
    rx="${CARD_RADIUS - 0.5}"
    fill="${CARD_BACKGROUND}"
    stroke="${CARD_BORDER}"
    stroke-width="1"
  />
  ${content}
</svg>`;
}
