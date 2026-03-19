export const icons = {
  clock: `<g
  stroke="#8b949e"
  stroke-width="1.5"
  fill="none"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <circle cx="12" cy="12" r="10"/>
  <path d="M12 6v6l4 2"/>
</g>`,
  commits: `<g
  stroke="#8b949e"
  stroke-width="1.5"
  fill="none"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
  <path d="M3 3v5h5"/>
  <path d="M12 7v5l4 2"/>
</g>`,
  contributed: `<g
  stroke="#8b949e"
  stroke-width="1.5"
  fill="none"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M10 2v8l3-3 3 3V2"/>
  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>
</g>`,
  email: `<g
  stroke="#8b949e"
  stroke-width="1.5"
  fill="none"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/>
  <rect x="2" y="4" width="20" height="16" rx="2"/>
</g>`,
  github: `<g
  stroke="#8b949e"
  stroke-width="1.5"
  fill="none"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
  <path d="M9 18c-4.51 2-5-2-7-2"/>
</g>`,
  issue: `<g
  stroke="#8b949e"
  stroke-width="1.5"
  fill="none"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <circle cx="12" cy="12" r="10"/>
  <line x1="12" x2="12" y1="8" y2="12"/>
  <line x1="12" x2="12.01" y1="16" y2="16"/>
</g>`,
  pullRequest: `<g
  stroke="#8b949e"
  stroke-width="1.5"
  fill="none"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <circle cx="18" cy="18" r="3"/>
  <circle cx="6" cy="6" r="3"/>
  <path d="M13 6h3a2 2 0 0 1 2 2v7"/>
  <line x1="6" x2="6" y1="9" y2="21"/>
</g>`,
  repo: `<g
  stroke="#8b949e"
  stroke-width="1.5"
  fill="none"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M10 2v8l3-3 3 3V2"/>
  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>
</g>`,
  star: `<g
  stroke="#8b949e"
  stroke-width="1.5"
  fill="none"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>
</g>`,
} as const;

export function renderIcon(
  name: keyof typeof icons,
  x: number,
  y: number,
  size = 16
): string {
  const scale = size / 24;

  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      ${icons[name]}
    </g>
  `;
}
