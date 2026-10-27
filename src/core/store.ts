import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { blockDoc, screenDoc, type Doc } from './tree.js';
import type { BlockDef, EditTarget, Project, Screen } from './model.js';

/**
 * Application state: the project (undoable, persisted) and UI state (not undoable).
 * Mutations go through `update()`, which snapshots for undo, clones, applies the change
 * and schedules a save.
 */

export type DeviceId = 'iphone' | 'iphone-se' | 'android';
export const DEVICES: Record<DeviceId, { label: string; width: number; height: number; platform: 'ios' | 'android' }> = {
  iphone: { label: 'iPhone 15', width: 393, height: 852, platform: 'ios' },
  'iphone-se': { label: 'iPhone SE', width: 375, height: 667, platform: 'ios' },
  android: { label: 'Pixel 8', width: 412, height: 915, platform: 'android' },
};

export type Dialog = null | 'export' | 'libraries' | 'new-screen' | 'save-block' | 'shortcuts';

export interface UIState {
  target: EditTarget;
  /** Screen to return to after editing a block. */
  returnTo: string | null;
  selectedId: string | null;
  insertionSlot: { nodeId: string; slot: string } | null;
  hoveredId: string | null;
  mode: 'edit' | 'preview';
  device: DeviceId;
  zoom: number;
  leftTab: 'components' | 'layers';
  rightTab: 'properties' | 'theme';
  dialog: Dialog;
  dragging: boolean;
  toast: string | null;
  storage: 'repo' | 'browser';
}

type Listener = () => void;

const LS_KEY = 'screen-builder.project.v1';
const API = '/__builder/project';

class Store {
  project!: Project;
  ui: UIState = {
    target: { kind: 'screen', id: '' },
    returnTo: null,
    selectedId: null,
    insertionSlot: null,
    hoveredId: null,
    mode: 'edit',
    device: 'iphone',
    zoom: 0,
    leftTab: 'components',
    rightTab: 'properties',
    dialog: null,
    dragging: false,
    toast: null,
    storage: 'browser',
  };
  private past: string[] = [];
  private future: string[] = [];
  private lastKey: string | null = null;
  private lastTime = 0;
  private listeners = new Set<Listener>();
  private saveTimer = 0;
  private toastTimer = 0;
  private serverAvailable = false;

  // ---------- derived ----------

  get screen(): Screen | undefined {
    const t = this.ui.target;
    const id = t.kind === 'screen' ? t.id : this.ui.returnTo;
    return this.project.screens.find((s) => s.id === id) ?? this.project.screens[0];
  }

  get block(): BlockDef | undefined {
    const t = this.ui.target;
    return t.kind === 'block' ? this.project.blocks.find((b) => b.id === t.id) : undefined;
  }

  /** The tree being edited (current screen or block). */
  get doc(): Doc {
    return docFor(this.project, this.ui.target) ?? {};
  }

  // ---------- mutation ----------

  /**
   * Applies an undoable change. `fn` receives a fresh clone of the project plus the doc for
   * the current target. Pass `coalesce` to merge rapid edits (typing) into one undo step.
   */
  update(fn: (project: Project, doc: Doc) => void, coalesce?: string): void {
    const now = Date.now();
    const merge = coalesce && coalesce === this.lastKey && now - this.lastTime < 1200;
    if (!merge) {
      this.past.push(JSON.stringify(this.project));
      if (this.past.length > 200) this.past.shift();
    }
    this.future = [];
    this.lastKey = coalesce ?? null;
    this.lastTime = now;
    const next = structuredClone(this.project);
    fn(next, docFor(next, this.ui.target) ?? {});
    this.project = next;
    this.emit();
    this.scheduleSave();
  }

  get canUndo() {
    return this.past.length > 0;
  }
  get canRedo() {
    return this.future.length > 0;
  }

  undo() {
    const prev = this.past.pop();
    if (!prev) return;
    this.future.push(JSON.stringify(this.project));
    this.project = JSON.parse(prev);
    this.lastKey = null;
    this.repairUI();
    this.emit();
    this.scheduleSave();
  }

  redo() {
    const next = this.future.pop();
    if (!next) return;
    this.past.push(JSON.stringify(this.project));
    this.project = JSON.parse(next);
    this.lastKey = null;
    this.repairUI();
    this.emit();
    this.scheduleSave();
  }

  setUI(patch: Partial<UIState>) {
    this.ui = { ...this.ui, ...patch };
    this.emit();
  }

  select(id: string | null) {
    if (this.ui.selectedId === id) return;
    this.setUI({ selectedId: id });
  }

  hover(id: string | null) {
    if (this.ui.hoveredId === id) return;
    this.ui = { ...this.ui, hoveredId: id };
    this.emit();
  }

  openScreen(id: string) {
    this.setUI({ target: { kind: 'screen', id }, returnTo: null, selectedId: null });
  }

  openBlock(id: string) {
    const returnTo = this.ui.target.kind === 'screen' ? this.ui.target.id : this.ui.returnTo;
    const block = this.project.blocks.find((b) => b.id === id);
    this.setUI({ target: { kind: 'block', id }, returnTo, selectedId: block?.root.id ?? null, mode: 'edit' });
  }

  closeBlock() {
    const id = this.ui.returnTo ?? this.project.screens[0]?.id;
    this.setUI({ target: { kind: 'screen', id }, returnTo: null, selectedId: null });
  }

  toast(message: string) {
    clearTimeout(this.toastTimer);
    this.setUI({ toast: message });
    this.toastTimer = window.setTimeout(() => this.setUI({ toast: null }), 2600);
  }

  /** Keeps the target and selection valid after undo/redo or deletes. */
  repairUI() {
    const t = this.ui.target;
    const exists = t.kind === 'screen' ? this.project.screens.some((s) => s.id === t.id) : this.project.blocks.some((b) => b.id === t.id);
    if (!exists) this.ui = { ...this.ui, target: { kind: 'screen', id: this.project.screens[0]?.id ?? '' }, returnTo: null };
    const doc = this.doc;
    const has = (id: string) => JSON.stringify(doc).includes(`"id":"${id}"`);
    if (this.ui.selectedId && !has(this.ui.selectedId)) this.ui = { ...this.ui, selectedId: null };
  }

  // ---------- persistence ----------

  async load(seed: () => Project): Promise<void> {
    let project: Project | null = null;
    this.serverAvailable = false;
    if (import.meta.env.DEV) {
      try {
        const res = await fetch(API, { cache: 'no-store' });
        if (res.ok && res.headers.get('content-type')?.split(';')[0].trim() === 'application/json') {
          const text = await res.text();
          if (text.trim()) project = JSON.parse(text);
          this.serverAvailable = true;
        }
      } catch {
        /* no local repo storage */
      }
    }
    if (!project) {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) project = JSON.parse(raw);
      } catch {
        /* ignore */
      }
    }
    this.project = migrate(project ?? seed());
    this.ui = {
      ...this.ui,
      storage: this.serverAvailable ? 'repo' : 'browser',
      target: { kind: 'screen', id: this.project.screens[0]?.id ?? '' },
    };
    if (!project) this.scheduleSave();
    this.emit();
  }

  replaceProject(project: Project) {
    this.past.push(JSON.stringify(this.project));
    this.project = migrate(project);
    this.ui = { ...this.ui, target: { kind: 'screen', id: this.project.screens[0]?.id ?? '' }, selectedId: null, returnTo: null };
    this.emit();
    this.scheduleSave();
  }

  private scheduleSave() {
    clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => this.save(), 400);
  }

  async save() {
    const json = JSON.stringify(this.project, null, 1);
    try {
      localStorage.setItem(LS_KEY, json);
    } catch {
      /* quota or privacy mode */
    }
    if (this.serverAvailable) {
      try {
        await fetch(API, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: json });
      } catch {
        /* dev server gone */
      }
    }
  }

  get hasRepoStorage() {
    return this.serverAvailable;
  }

  // ---------- subscription ----------

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }
}

export function docFor(project: Project, target: EditTarget): Doc | null {
  if (target.kind === 'screen') {
    const s = project.screens.find((x) => x.id === target.id);
    return s ? screenDoc(s) : null;
  }
  const b = project.blocks.find((x) => x.id === target.id);
  return b ? blockDoc(b) : null;
}

function migrate(p: Project): Project {
  p.blocks ??= [];
  p.remoteLibraries ??= [];
  p.disabledLibraries ??= [];
  return p;
}

export const store = new Store();

/** Re-renders a Lit host whenever the store changes. */
export class StoreController implements ReactiveController {
  private unsub?: () => void;
  constructor(private host: ReactiveControllerHost) {
    host.addController(this);
  }
  hostConnected() {
    this.unsub = store.subscribe(() => this.host.requestUpdate());
  }
  hostDisconnected() {
    this.unsub?.();
  }
}
