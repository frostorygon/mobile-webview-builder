import type { Node, Props, PropValue } from './model.js';
import { uid } from './model.js';

/**
 * Component registry.
 *
 * Every component the builder can place is described by a `ComponentDef`: which custom
 * element to render, how its props map onto attributes/properties/text, whether it accepts
 * children, and how to import it in generated code. Libraries are groups of defs and can
 * come from code (Mobile kit, Lion, your own components) or be added at runtime from a URL.
 */

export type PropType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'icon'
  | 'space'
  | 'image'
  | 'color';

export interface PropOption {
  value: string;
  label?: string;
  icon?: string;
}

export interface PropDef {
  name: string;
  label?: string;
  type: PropType;
  options?: PropOption[];
  default?: PropValue;
  /** How the value reaches the element. Defaults to `attribute`. */
  binding?: 'attribute' | 'property' | 'text';
  /** Attribute name when it differs from `name`. */
  attribute?: string;
  group?: 'content' | 'style' | 'behavior';
  description?: string;
  placeholder?: string;
  /** Hide the field unless this returns true for the current props. */
  when?: (props: Props) => boolean;
}

export interface ContainerSpec {
  /** Slot the children render into. `default` = unnamed slot. */
  slot: string;
  /** All editable slots, including the primary slot. Omit for a single slot. */
  slots?: string[];
  direction: 'vertical' | 'horizontal';
}

export function containerSlots(def: ComponentDef | undefined): string[] {
  return def?.container ? [...new Set([def.container.slot, ...(def.container.slots ?? [])])] : [];
}

/** Builder-native elements (layout primitives) render as plain HTML instead of a custom element. */
export interface NativeSpec {
  tag: string;
  className: (props: Props) => string;
  style?: (props: Props) => Record<string, string>;
  /** Optional heading rendered before the children (e.g. a section title). */
  title?: (props: Props) => string | undefined;
}

export interface ComponentDef {
  /** Unique id, `<library>/<name>`. */
  type: string;
  library: string;
  label: string;
  /** Lucide icon name (kebab-case) for palette and layers. */
  icon: string;
  category: string;
  description?: string;
  keywords?: string[];
  /** Custom element tag. Ignored when `native` is set. */
  tag: string;
  native?: NativeSpec;
  props: PropDef[];
  container?: ContainerSpec;
  /** Default children when dropped from the palette. */
  children?: () => Node[];
  /** Prop edited by double-clicking on the canvas. */
  inlineEdit?: string;
  /** Prop shown next to the label in the layers tree. */
  summary?: string;
  /** Module specifier written into generated code. */
  importPath?: string;
  /** Defines the custom element (lazy). */
  load?: () => Promise<unknown>;
  /** Not shown in the palette. */
  hidden?: boolean;
}

export interface LibraryDef {
  id: string;
  name: string;
  description: string;
  /** Short badge text and color in the palette. */
  badge: string;
  color: string;
  source: 'builtin' | 'code' | 'remote';
  /** Returns component defs. Async so big libraries can load their manifest lazily. */
  components: () => ComponentDef[] | Promise<ComponentDef[]>;
  /** Document stylesheets the library needs (e.g. a theme file). */
  stylesheets?: string[];
  /** CSS injected into every screen, e.g. to style a library's light-DOM parts. */
  css?: string;
  /** Prop defaults equal the elements' own defaults, so generated code can omit them. */
  omitDefaults?: boolean;
}

type Listener = () => void;

class Registry {
  private libs = new Map<string, LibraryDef>();
  private defs = new Map<string, ComponentDef>();
  private byLib = new Map<string, ComponentDef[]>();
  private loading = new Map<string, Promise<unknown>>();
  private listeners = new Set<Listener>();
  private failed = new Map<string, string>();
  version = 0;

  async register(lib: LibraryDef): Promise<void> {
    this.libs.set(lib.id, lib);
    try {
      const defs = await lib.components();
      this.byLib.set(lib.id, defs);
      for (const d of defs) this.defs.set(d.type, d);
      for (const href of lib.stylesheets ?? []) addStylesheet(href);
      this.failed.delete(lib.id);
    } catch (err) {
      console.error(`[registry] failed to load library ${lib.id}`, err);
      this.failed.set(lib.id, String((err as Error)?.message ?? err));
      this.byLib.set(lib.id, []);
    }
    this.emit();
  }

  unregister(libId: string): void {
    for (const d of this.byLib.get(libId) ?? []) this.defs.delete(d.type);
    this.byLib.delete(libId);
    this.libs.delete(libId);
    this.emit();
  }

  libraries(): LibraryDef[] {
    return [...this.libs.values()];
  }

  library(id: string): LibraryDef | undefined {
    return this.libs.get(id);
  }

  error(libId: string): string | undefined {
    return this.failed.get(libId);
  }

  components(libId?: string): ComponentDef[] {
    if (libId) return this.byLib.get(libId) ?? [];
    return [...this.byLib.values()].flat();
  }

  get(type: string): ComponentDef | undefined {
    return this.defs.get(type);
  }

  /** Ensures the custom element behind a def is defined. Safe to call on every render. */
  ensure(def: ComponentDef): Promise<unknown> | undefined {
    if (!def.load || def.native) return undefined;
    let p = this.loading.get(def.type);
    if (!p) {
      p = def.load().catch((err) => console.error(`[registry] failed to load ${def.tag}`, err));
      this.loading.set(def.type, p);
    }
    return p;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.version++;
    this.listeners.forEach((l) => l());
  }
}

export const registry = new Registry();

function addStylesheet(href: string) {
  if (document.head.querySelector(`link[data-lib-style="${CSS.escape(href)}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.libStyle = href;
  document.head.append(link);
}

/** Creates a fresh node for a component type with its default props and children. */
export function createNode(def: ComponentDef): Node {
  const props: Props = {};
  for (const p of def.props) if (p.default !== undefined) props[p.name] = p.default;
  const node: Node = { id: uid(), type: def.type, props };
  if (def.container) {
    node.slots = Object.fromEntries(containerSlots(def).map((slot) => [slot, slot === def.container!.slot ? def.children?.() ?? [] : []]));
  }
  return node;
}

/** Shorthand used by templates and default children. */
export function n(type: string, props: Props = {}, children?: Node[]): Node {
  const def = registry.get(type);
  const base: Props = {};
  for (const p of def?.props ?? []) if (p.default !== undefined) base[p.name] = p.default;
  const node: Node = { id: uid(), type, props: { ...base, ...props } };
  if (def?.container || children) node.slots = { [def?.container?.slot ?? 'default']: children ?? [] };
  return node;
}

export function propLabel(p: PropDef): string {
  return p.label ?? humanize(p.name);
}

export function humanize(s: string): string {
  const words = s
    .replace(/^\$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export const opts = (...values: string[]): PropOption[] => values.map((value) => ({ value }));
