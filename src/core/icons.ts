import { icons as lucide } from 'lucide';
import { html } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';

/**
 * Icons come from Lucide (ISC license). The builder UI and the Mobile kit share this set;
 * a library like ing-web would bring its own icon set and map the `icon` prop onto it.
 */
type IconNode = [string, Record<string, string | number>][];

const cache = new Map<string, string>();

const pascal = (name: string) =>
  name.replace(/(^|[-_\s]+)([a-z0-9])/g, (_m, _s, c: string) => c.toUpperCase());

export function hasIcon(name: string): boolean {
  return pascal(name) in lucide;
}

export const iconNames: string[] = Object.keys(lucide)
  .map((k) => k.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([a-zA-Z])([0-9])/g, '$1-$2').toLowerCase())
  .filter(hasIcon);

export function iconSvg(name: string, size = 16, strokeWidth = 2): string {
  const key = `${name}|${size}|${strokeWidth}`;
  let svg = cache.get(key);
  if (svg) return svg;
  const node = ((lucide as Record<string, unknown>)[pascal(name)] ?? lucide.CircleHelp) as IconNode;
  const inner = node
    .map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`)
    .join('');
  svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  cache.set(key, svg);
  return svg;
}

export const icon = (name: string, size = 16, strokeWidth = 2) => html`${unsafeSVG(iconSvg(name, size, strokeWidth))}`;
