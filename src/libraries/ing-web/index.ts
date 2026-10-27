import type { LibraryDef } from '../../core/registry.js';

/**
 * ing-web adapter (template).
 *
 * ing-web is internal, so it isn't installed here. To bring it in:
 *
 *   1. Install it from the internal registry:
 *        npm install ing-web
 *
 *   2. Generate a slim manifest. Use the package's custom-elements.json if it ships one;
 *      otherwise run `npx @custom-elements-manifest/analyzer analyze --litelement` in the
 *      ing-web repo first:
 *        node scripts/slim-manifest.mjs node_modules/ing-web/custom-elements.json \
 *             src/libraries/ing-web/ing-web.manifest.json --prefix=ing- --package=ing-web
 *
 *   3. Fill in DEFINE and `overrides` below (copy the pattern from ../lion/index.ts),
 *      set ENABLED to true, and the components appear in the palette.
 *
 * Tip: ing-web already themes Lion, so drop the Lion library in src/libraries/index.ts
 * once this works.
 */
const ENABLED = false;

// import { fromManifest, type CemManifest } from '../../core/cem.js';
// const DEFINE: Record<string, () => Promise<unknown>> = {
//   'ing-button': () => import('ing-web/define/ing-button.js'),
//   'ing-input': () => import('ing-web/define/ing-input.js'),
//   'ing-icon': () => import('ing-web/define/ing-icon.js'),
// };

export const ingWebLibrary: LibraryDef | null = ENABLED
  ? {
      id: 'ing-web',
      name: 'ing-web',
      description: 'ING Lit component library (Lion based).',
      badge: 'ing-web',
      color: '#FF6200',
      source: 'code',
      components: async () => {
        // const manifest = (await import('./ing-web.manifest.json')).default as unknown as CemManifest;
        // return fromManifest(manifest, {
        //   library: 'ing-web',
        //   category: 'ing-web',
        //   include: Object.keys(DEFINE),
        //   importPath: (tag) => `ing-web/define/${tag}.js`,
        //   load: (tag) => DEFINE[tag],
        //   overrides: { 'ing-button': { extraProps: [{ name: 'text', type: 'text', binding: 'text', default: 'Button' }] } },
        // });
        return [];
      },
    }
  : null;
