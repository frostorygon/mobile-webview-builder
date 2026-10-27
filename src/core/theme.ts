import type { Theme } from './model.js';

/**
 * Design tokens shared by every screen. Components read them as CSS custom properties
 * (`--mk-*`), so a theme change restyles all screens at once and keeps the app consistent.
 */

export const SPACE = { none: '0px', xs: '4px', s: '8px', m: '16px', l: '24px', xl: '32px', xxl: '48px' } as const;
export type SpaceToken = keyof typeof SPACE;
export const SPACE_TOKENS = Object.keys(SPACE) as SpaceToken[];

export const space = (token: unknown, fallback: SpaceToken = 'none') =>
  `var(--mk-space-${(token as SpaceToken) in SPACE ? token : fallback})`;

const base: Omit<Theme, 'preset'> = {
  colorPrimary: '#FF6200',
  colorOnPrimary: '#FFFFFF',
  colorAccent: '#525199',
  colorText: '#333333',
  colorTextMuted: '#696969',
  colorSurface: '#FFFFFF',
  colorSurfaceSubtle: '#F4F4F4',
  colorBorder: '#E0E0E0',
  colorSuccess: '#349651',
  colorWarning: '#D98A00',
  colorError: '#D70000',
  radius: 8,
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  fontScale: 1,
};

export const THEME_PRESETS: Record<string, { label: string; theme: Theme }> = {
  orange: { label: 'Orange', theme: { preset: 'orange', ...base } },
  ink: {
    label: 'Ink (reference)',
    theme: {
      preset: 'ink',
      ...base,
      colorPrimary: '#111827',
      colorAccent: '#5B4FCF',
      colorText: '#111827',
      colorTextMuted: '#6B7280',
      colorSurfaceSubtle: '#F3F4F6',
      colorBorder: '#E5E7EB',
      radius: 12,
    },
  },
  night: {
    label: 'Night',
    theme: {
      preset: 'night',
      ...base,
      colorPrimary: '#FF7A26',
      colorAccent: '#A5A4F0',
      colorText: '#F5F5F5',
      colorTextMuted: '#A3A3A3',
      colorSurface: '#141414',
      colorSurfaceSubtle: '#232323',
      colorBorder: '#333333',
      radius: 8,
    },
  },
};

export const defaultTheme = (): Theme => ({ ...THEME_PRESETS.orange.theme });

export function themeVars(t: Theme): Record<string, string> {
  const vars: Record<string, string> = {
    '--mk-color-primary': t.colorPrimary,
    '--mk-color-on-primary': t.colorOnPrimary,
    '--mk-color-accent': t.colorAccent,
    '--mk-color-text': t.colorText,
    '--mk-color-text-muted': t.colorTextMuted,
    '--mk-color-surface': t.colorSurface,
    '--mk-color-surface-subtle': t.colorSurfaceSubtle,
    '--mk-color-border': t.colorBorder,
    '--mk-color-success': t.colorSuccess,
    '--mk-color-warning': t.colorWarning,
    '--mk-color-error': t.colorError,
    '--mk-radius': `${t.radius}px`,
    '--mk-font-family': t.fontFamily,
    '--mk-font-scale': String(t.fontScale),
  };
  for (const [k, v] of Object.entries(SPACE)) vars[`--mk-space-${k}`] = v;
  return vars;
}

export function themeCss(t: Theme, selector = ':root'): string {
  const body = Object.entries(themeVars(t))
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');
  return `${selector} {\n${body}\n}\n`;
}

/** Inline style string for a theme scope element. */
export function themeStyle(t: Theme): string {
  return Object.entries(themeVars(t))
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
}
