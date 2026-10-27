import type { DropTarget } from './model.js';
import { iconSvg } from './icons.js';

/**
 * Pointer-based drag and drop. Native HTML5 DnD is unreliable across shadow roots and gives
 * no control over the drag image, so drags are tracked manually:
 *   - `begin()` on pointerdown arms a drag; it starts after the pointer moves a few px.
 *   - Drop zones (canvas, layers) resolve the pointer position to a `DropTarget` and draw
 *     their own indicator. `composedPath()` gives the deep element path through shadow DOM.
 */

export type DragPayload =
  | { kind: 'new'; type: string }
  | { kind: 'block'; blockId: string }
  | { kind: 'move'; nodeId: string };

export interface DropZone {
  /** Element whose subtree receives the drop. */
  host: HTMLElement;
  resolve(e: PointerEvent, payload: DragPayload): DropTarget | null;
  clear(): void;
}

interface Active {
  payload: DragPayload;
  label: string;
  icon: string;
  x: number;
  y: number;
  started: boolean;
  ghost?: HTMLElement;
  target: DropTarget | null;
  zone: DropZone | null;
}

type DropHandler = (payload: DragPayload, target: DropTarget) => void;

class DragManager {
  private zones = new Set<DropZone>();
  private active: Active | null = null;
  private dropHandler: DropHandler = () => {};
  private stateListeners = new Set<(dragging: boolean) => void>();

  addZone(zone: DropZone) {
    this.zones.add(zone);
    return () => this.zones.delete(zone);
  }

  onDrop(fn: DropHandler) {
    this.dropHandler = fn;
  }

  onState(fn: (dragging: boolean) => void) {
    this.stateListeners.add(fn);
    return () => this.stateListeners.delete(fn);
  }

  get payload(): DragPayload | null {
    return this.active?.started ? this.active.payload : null;
  }

  begin(e: PointerEvent, payload: DragPayload, label: string, icon: string) {
    if (e.button !== 0) return;
    // Claim the gesture: otherwise the browser may start a text selection, which turns
    // into a native drag and cancels the pointer stream.
    e.preventDefault();
    document.getSelection()?.removeAllRanges();
    this.active ={ payload, label, icon, x: e.clientX, y: e.clientY, started: false, target: null, zone: null };
    window.addEventListener('pointermove', this.move, true);
    window.addEventListener('pointerup', this.up, true);
    window.addEventListener('pointercancel', this.cancel, true);
    window.addEventListener('keydown', this.key, true);
  }

  private start() {
    const a = this.active!;
    a.started = true;
    const ghost = document.createElement('div');
    ghost.className = 'wb-drag-ghost';
    ghost.innerHTML = `${iconSvg(a.icon, 16)}<span></span>`;
    ghost.querySelector('span')!.textContent = a.label;
    document.body.append(ghost);
    a.ghost = ghost;
    document.documentElement.classList.add('wb-dragging');
    this.stateListeners.forEach((l) => l(true));
  }

  private move = (e: PointerEvent) => {
    const a = this.active;
    if (!a) return;
    if (!a.started) {
      if (Math.hypot(e.clientX - a.x, e.clientY - a.y) < 5) return;
      this.start();
    }
    e.preventDefault();
    a.ghost!.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 10}px)`;
    const path = e.composedPath();
    const zone = [...this.zones].find((z) => path.includes(z.host)) ?? null;
    if (a.zone && a.zone !== zone) a.zone.clear();
    a.zone = zone;
    a.target = zone ? zone.resolve(e, a.payload) : null;
    a.ghost!.classList.toggle('no-drop', !a.target);
  };

  private up = (e: PointerEvent) => {
    const a = this.active;
    this.teardown();
    if (!a?.started) return;
    e.preventDefault();
    // Swallow the click that follows a drag so it doesn't also select / insert.
    window.addEventListener('click', stopper, true);
    setTimeout(() => window.removeEventListener('click', stopper, true), 0);
    if (a.target) this.dropHandler(a.payload, a.target);
  };

  private cancel = () => this.teardown();

  private key = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      this.teardown();
    }
  };

  private teardown() {
    const a = this.active;
    this.active = null;
    window.removeEventListener('pointermove', this.move, true);
    window.removeEventListener('pointerup', this.up, true);
    window.removeEventListener('pointercancel', this.cancel, true);
    window.removeEventListener('keydown', this.key, true);
    if (a?.started) {
      a.ghost?.remove();
      a.zone?.clear();
      document.documentElement.classList.remove('wb-dragging');
      this.stateListeners.forEach((l) => l(false));
    }
  }
}

const stopper = (ev: Event) => ev.stopPropagation();

export const dnd = new DragManager();
