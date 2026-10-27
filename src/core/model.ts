/**
 * Document model.
 *
 * A project holds screens and reusable blocks. Both are trees of `Node`s. A node is an
 * instance of a registered component type (see registry.ts) with props and, for
 * containers, named slots holding child nodes.
 */

export type PropValue = string | number | boolean | null;
export type Props = Record<string, PropValue>;

export interface Node {
  id: string;
  /** Component type id from the registry, e.g. `layout/stack`, `kit/button`, or `@block`. */
  type: string;
  props: Props;
  /** Child nodes per slot name. Only present on containers. */
  slots?: Record<string, Node[]>;
  /** For `@block` instances: per inner-node prop overrides, keyed by the master node id. */
  overrides?: Record<string, Props>;
  /** Prototype interaction: tapping this node in preview navigates to another screen. */
  link?: string | null;
}

export type NavBarMode = 'native' | 'web' | 'none';

export interface ScreenSettings {
  title: string;
  navBar: NavBarMode;
  leading: 'back' | 'close' | 'none';
  trailing: 'none' | 'close' | 'help' | 'more';
  background: 'default' | 'subtle';
  /** Vertical placement of body content: the reference screen centers it. */
  bodyAlign: 'start' | 'center';
}

export interface Screen {
  id: string;
  name: string;
  settings: ScreenSettings;
  /** Scrollable content area. */
  body: Node[];
  /** Sticky bottom area for primary actions. */
  footer: Node[];
}

export interface BlockDef {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  root: Node;
}

export interface Theme {
  preset: string;
  colorPrimary: string;
  colorOnPrimary: string;
  colorAccent: string;
  colorText: string;
  colorTextMuted: string;
  colorSurface: string;
  colorSurfaceSubtle: string;
  colorBorder: string;
  colorSuccess: string;
  colorWarning: string;
  colorError: string;
  radius: number;
  fontFamily: string;
  fontScale: number;
}

/** A library registered at runtime from a URL (ES module + Custom Elements Manifest). */
export interface RemoteLibrary {
  id: string;
  name: string;
  moduleUrl: string;
  manifestUrl: string;
  stylesheetUrl?: string;
  tagPrefix?: string;
  enabled: boolean;
}

export interface Project {
  version: 1;
  name: string;
  theme: Theme;
  screens: Screen[];
  blocks: BlockDef[];
  remoteLibraries: RemoteLibrary[];
  /** Ids of code-registered libraries switched off for this project. */
  disabledLibraries: string[];
}

/** What the canvas is currently editing. */
export type EditTarget = { kind: 'screen'; id: string } | { kind: 'block'; id: string };

/** A location in a tree where a node can be inserted. `parentId` is a node id or a screen region. */
export interface DropTarget {
  parentId: string;
  slot: string;
  index: number;
}

/** Pseudo parent ids for the two screen regions. */
export const BODY = '@body';
export const FOOTER = '@footer';

let counter = 0;
export function uid(prefix = 'n'): string {
  counter = (counter + 1) % 1_000_000;
  return `${prefix}${Date.now().toString(36).slice(-5)}${counter.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 5)}`;
}

export const defaultScreenSettings = (title = 'New screen'): ScreenSettings => ({
  title,
  navBar: 'native',
  leading: 'back',
  trailing: 'none',
  background: 'default',
  bodyAlign: 'start',
});
