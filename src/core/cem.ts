import type { ComponentDef, PropDef } from './registry.js';
import { humanize } from './registry.js';

/**
 * Turns a Custom Elements Manifest (https://github.com/webcomponents/custom-elements-manifest)
 * into builder component defs. Most Lit libraries (Lion, ing-web, Shoelace, ...) can
 * generate one with `@custom-elements-manifest/analyzer`, so a library can be exposed in
 * the builder without hand-writing metadata. Curate with `include` and `overrides`.
 */

interface CemAttribute {
  name: string;
  fieldName?: string;
  type?: { text?: string };
  default?: string;
  description?: string;
}

interface CemDeclaration {
  tagName?: string;
  name?: string;
  description?: string;
  summary?: string;
  customElement?: boolean;
  attributes?: CemAttribute[];
  slots?: { name: string; description?: string }[];
  definedIn?: string;
}

export interface CemManifest {
  modules: { path: string; declarations?: CemDeclaration[]; exports?: { kind: string; name: string }[] }[];
}

export interface CemOverride extends Partial<Omit<ComponentDef, 'props'>> {
  /** Attribute allowlist (in display order). Omit to keep every supported attribute. */
  attributes?: string[];
  /** Per-attribute tweaks: label, options, default, group... */
  propOverrides?: Record<string, Partial<PropDef>>;
  /** Extra props not described by the manifest, e.g. text in the default slot. */
  extraProps?: PropDef[];
}

export interface CemOptions {
  library: string;
  /** Only these tags (in this order). Omit for all. */
  include?: string[];
  /** Tags to drop. */
  exclude?: (tag: string) => boolean;
  category?: string;
  importPath: (tag: string, definedIn?: string) => string | undefined;
  load: (tag: string, definedIn?: string) => () => Promise<unknown>;
  overrides?: Record<string, CemOverride>;
}

/** Framework-internal state attributes that make no sense to edit in a builder. */
const INTERNAL_ATTRS = new Set([
  'focused',
  'focused-visible',
  'touched',
  'dirty',
  'filled',
  'prefilled',
  'is-pending',
  'shows-feedback-for',
  'allow-cross-root-registration',
  'tabindex',
  'active',
  'autofocus',
  'submitted',
  'opened',
  'model-value',
  'modelvalue',
]);

const ICON_HINTS: [RegExp, string][] = [
  [/button/, 'mouse-pointer-click'],
  [/switch|toggle/, 'toggle-right'],
  [/checkbox/, 'square-check'],
  [/radio/, 'circle-dot'],
  [/amount|money|currency/, 'euro'],
  [/iban|account/, 'landmark'],
  [/date|calendar/, 'calendar'],
  [/email/, 'at-sign'],
  [/tel|phone/, 'phone'],
  [/textarea/, 'text'],
  [/select|combo|listbox|option/, 'list'],
  [/input|field/, 'text-cursor-input'],
  [/accordion|collapsible/, 'chevrons-up-down'],
  [/tab/, 'panel-top'],
  [/dialog|drawer|tooltip/, 'message-square'],
  [/progress|spinner|loader/, 'loader'],
  [/icon/, 'smile'],
  [/step/, 'list-ordered'],
  [/pagination/, 'ellipsis'],
  [/card/, 'square'],
  [/alert|banner|note/, 'info'],
  [/badge|tag/, 'tag'],
];

export function guessIcon(tag: string): string {
  return ICON_HINTS.find(([re]) => re.test(tag))?.[1] ?? 'box';
}

/** Maps a CEM type string to a builder prop type. Returns null for types we cannot edit. */
export function propFromType(typeText: string | undefined): Pick<PropDef, 'type' | 'options'> | null {
  const t = (typeText ?? 'string').replace(/\s*\|\s*(undefined|null)\s*/g, '').trim();
  if (t === 'boolean') return { type: 'boolean' };
  if (t === 'number') return { type: 'number' };
  if (t === 'string' || t === '') return { type: 'text' };
  const parts = t.split('|').map((s) => s.trim());
  if (parts.length > 1 && parts.every((s) => /^(['"`]).*\1$/.test(s))) {
    return { type: 'select', options: parts.map((s) => ({ value: s.slice(1, -1) })) };
  }
  return null;
}

function parseDefault(raw: string | undefined, type: PropDef['type']): PropDef['default'] {
  if (raw === undefined) return undefined;
  const v = raw.trim();
  if (type === 'boolean') return v === 'true';
  if (type === 'number') return Number.isFinite(Number(v)) ? Number(v) : undefined;
  if (/^(['"`]).*\1$/.test(v)) return v.slice(1, -1);
  return undefined;
}

export function declarationsOf(manifest: CemManifest): CemDeclaration[] {
  const defined = new Map<string, string>();
  for (const m of manifest.modules) {
    for (const e of m.exports ?? []) if (e.kind === 'custom-element-definition') defined.set(e.name, m.path);
  }
  return manifest.modules.flatMap((m) =>
    (m.declarations ?? [])
      .filter((d) => d.tagName && (d.customElement ?? true))
      .map((d) => ({ ...d, tagName: d.tagName!.replace(/`/g, ''), definedIn: d.definedIn ?? defined.get(d.tagName!) ?? m.path })),
  );
}

export function fromManifest(manifest: CemManifest, options: CemOptions): ComponentDef[] {
  const decls = declarationsOf(manifest);
  const byTag = new Map(decls.map((d) => [d.tagName!, d]));
  const tags = options.include ?? decls.map((d) => d.tagName!);

  const defs: ComponentDef[] = [];
  for (const tag of tags) {
    const decl = byTag.get(tag);
    if (!decl || options.exclude?.(tag)) continue;
    const ov = options.overrides?.[tag] ?? {};

    const props: PropDef[] = [];
    const seen = new Set<string>();
    const attrs = decl.attributes ?? [];
    const ordered = ov.attributes
      ? (ov.attributes.map((a) => attrs.find((x) => x.name === a)).filter(Boolean) as CemAttribute[])
      : attrs;
    for (const a of ordered) {
      if (seen.has(a.name) || /[A-Z]/.test(a.name)) continue;
      if (!ov.attributes && INTERNAL_ATTRS.has(a.name.toLowerCase())) continue;
      const mapped = propFromType(a.type?.text);
      if (!mapped) continue;
      seen.add(a.name);
      props.push({
        name: a.name,
        label: humanize(a.name),
        ...mapped,
        default: parseDefault(a.default, mapped.type),
        description: a.description,
        group: mapped.type === 'boolean' ? 'behavior' : 'content',
        ...ov.propOverrides?.[a.name],
      });
    }

    const hasDefaultSlot = decl.slots?.some((s) => s.name === '');
    const slots = [...new Set((decl.slots ?? []).map((s) => s.name || 'default'))];
    if (hasDefaultSlot && !ov.extraProps?.some((p) => p.binding === 'text')) {
      props.unshift({ name: 'text', label: 'Text', type: 'text', binding: 'text', default: humanize(tag.split('-').slice(1).join(' ')), group: 'content' });
    }
    props.unshift(...(ov.extraProps ?? []));

    const { attributes: _a, propOverrides: _p, extraProps: _e, ...rest } = ov;
    defs.push({
      type: `${options.library}/${tag}`,
      library: options.library,
      tag,
      label: humanize(tag.replace(/^[a-z0-9]+-/, '')),
      icon: guessIcon(tag),
      category: options.category ?? 'Components',
      description: decl.summary || decl.description?.split('\n')[0],
      props,
      container: slots.length ? { slot: hasDefaultSlot ? 'default' : slots[0], slots, direction: 'vertical' } : undefined,
      importPath: options.importPath(tag, decl.definedIn),
      load: options.load(tag, decl.definedIn),
      inlineEdit: props.find((p) => p.binding === 'text')?.name ?? props.find((p) => p.name === 'label')?.name,
      summary: props.find((p) => p.binding === 'text' || p.name === 'label')?.name,
      ...rest,
    });
  }
  return defs;
}
