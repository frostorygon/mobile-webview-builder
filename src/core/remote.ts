import { fromManifest, type CemManifest } from './cem.js';
import type { RemoteLibrary } from './model.js';
import { registry, type LibraryDef } from './registry.js';

/**
 * Libraries added at runtime from URLs: an ES module (or a base URL for per-component
 * modules) that defines the elements, plus a Custom Elements Manifest describing them.
 * No code changes or rebuilds needed, which suits trying out a library, or an internal
 * CDN build of ing-web.
 */

const modules = new Map<string, Promise<unknown>>();

function loadModule(url: string) {
  let p = modules.get(url);
  if (!p) {
    p = import(/* @vite-ignore */ url);
    modules.set(url, p);
  }
  return p;
}

export function remoteLibraryDef(lib: RemoteLibrary): LibraryDef {
  return {
    id: lib.id,
    name: lib.name,
    description: `Loaded from ${new URL(lib.moduleUrl, location.href).host || 'local URL'}`,
    badge: lib.name.slice(0, 10),
    color: '#0EA5E9',
    source: 'remote',
    stylesheets: lib.stylesheetUrl ? [lib.stylesheetUrl] : [],
    components: async () => {
      const res = await fetch(lib.manifestUrl);
      if (!res.ok) throw new Error(`Manifest request failed (${res.status})`);
      const manifest = (await res.json()) as CemManifest;
      const prefix = lib.tagPrefix?.trim();
      // A URL ending in "/" is a base: each tag loads the module the manifest says defines it.
      const perTag = lib.moduleUrl.endsWith('/');
      const urlFor = (definedIn?: string) => (perTag && definedIn ? new URL(definedIn.replace(/^\//, ''), lib.moduleUrl).href : lib.moduleUrl);
      return fromManifest(manifest, {
        library: lib.id,
        category: lib.name,
        exclude: prefix ? (tag) => !tag.startsWith(prefix) : undefined,
        importPath: (_tag, definedIn) => urlFor(definedIn),
        load: (_tag, definedIn) => () => loadModule(urlFor(definedIn)),
      });
    },
  };
}

export async function registerRemote(lib: RemoteLibrary) {
  if (!lib.enabled) return;
  await registry.register(remoteLibraryDef(lib));
}

/** Example values for the "Add library" form: Shoelace, a public Lit-based library. */
export const SHOELACE_EXAMPLE = {
  name: 'Shoelace',
  moduleUrl: 'https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.20.1/cdn/',
  manifestUrl: 'https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.20.1/cdn/custom-elements.json',
  stylesheetUrl: 'https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.20.1/cdn/themes/light.css',
  tagPrefix: 'sl-',
};
