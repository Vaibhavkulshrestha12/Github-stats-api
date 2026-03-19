const LANGUAGE_COLORS: Record<string, string> = {
  "C++": "#f34b7d",
  CSS: "#563d7c",
  HTML: "#e34c26",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Shell: "#89e051",
  TypeScript: "#3178c6",
  "Vim Script": "#199f4b",
};

export function getLanguageColor(name: string): string {
  return LANGUAGE_COLORS[name] ?? "#8b949e";
}
