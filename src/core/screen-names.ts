import type { Screen } from './model.js';

export const kebab = (s: string) =>
  s.normalize('NFKD').replace(/[^\w\s-]/g, '').trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-').toLowerCase().replace(/^-|-$/g, '') || 'screen';

export const pascal = (s: string) => kebab(s).split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');

/** Reserve every original name before assigning suffixes, so "A 2" stays distinct. */
export function screenSlug(screen: Screen, screens: Screen[]): string {
  const reserved = new Set(screens.map((s) => kebab(s.name)));
  const used = new Set<string>();
  for (const s of screens) {
    const base = kebab(s.name);
    let slug = base;
    if (used.has(slug)) {
      let suffix = 2;
      do { slug = `${base}-${suffix++}`; } while (reserved.has(slug) || used.has(slug));
    }
    used.add(slug);
    if (s.id === screen.id) return slug;
  }
  return kebab(screen.name);
}
