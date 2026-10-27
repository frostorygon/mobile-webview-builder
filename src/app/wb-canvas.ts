import { LitElement, css, html, nothing } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import * as actions from '../core/actions.js';
import { BLOCK_TYPE } from '../core/blocks.js';
import { dnd, type DragPayload, type DropZone } from '../core/dnd.js';
import { icon } from '../core/icons.js';
import type { DropTarget, Node } from '../core/model.js';
import { registry } from '../core/registry.js';
import { navGlyph } from '../core/render.js';
import { DEVICES, store, StoreController } from '../core/store.js';
import { themeStyle } from '../core/theme.js';
import { ROOT, childList, findNode } from '../core/tree.js';
import { ui } from './styles.js';
import './wb-screen-view.js';
import type { WbScreenView } from './wb-screen-view.js';

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Indicator {
  line: Box;
  container: Box;
}

const STATUS_H = 47;
const NAV_H = 52;

export function nodeLabel(node: Node): string {
  if (node.type === BLOCK_TYPE) return store.project.blocks.find((b) => b.id === node.props.blockId)?.name ?? 'Block';
  return registry.get(node.type)?.label ?? node.type;
}

/**
 * The editing surface: a device frame showing the current screen with live components,
 * plus an overlay for hover/selection outlines, the selection toolbar, drop indicators
 * and inline text editing.
 */
export class WbCanvas extends LitElement {
  static properties = {
    measured: { state: true },
  };

  readonly storeController = new StoreController(this);
  private measured: { hover?: Box; selected?: Box; clip?: Box; indicator?: Indicator; editing?: Box } = {};
  private editing: { nodeId: string; prop: string; value: string; multiline: boolean } | null = null;
  private removeZone?: () => void;
  private ro = new ResizeObserver(() => this.measureSoon());
  private rafUntil = 0;
  private fitZoom = 1;

  static styles = [
    ui,
    css`
      :host {
        position: relative;
        display: block;
        overflow: hidden;
        container-type: size;
        user-select: none;
        background-color: #eef0f4;
        background-image: radial-gradient(circle at 1px 1px, rgb(0 0 0 / 0.07) 1px, transparent 0);
        background-size: 18px 18px;
      }
      .scroller {
        position: absolute;
        inset: 0;
        overflow: auto;
        display: grid;
        place-items: start center;
        padding: 28px 24px 64px;
      }
      .device-wrap {
        position: relative;
        flex: none;
      }
      .device {
        position: absolute;
        top: 0;
        left: 0;
        transform-origin: top left;
        border-radius: 52px;
        background: var(--mk-color-surface);
        box-shadow:
          0 0 0 10px #12141a,
          0 0 0 11px #2a2d36,
          0 30px 60px -20px rgb(15 23 42 / 0.35),
          0 18px 36px -18px rgb(15 23 42 / 0.3);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        font-family: var(--mk-font-family);
      }
      .device.android {
        border-radius: 34px;
      }
      .device.subtle,
      .device.subtle .status,
      .device.subtle .navbar {
        background: var(--mk-color-surface-subtle);
      }
      .status {
        flex: none;
        height: ${STATUS_H}px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 30px 0 34px;
        font: 600 15px/1 system-ui, -apple-system, sans-serif;
        color: var(--mk-color-text);
        background: var(--mk-color-surface);
        position: relative;
        z-index: 2;
      }
      .android .status {
        height: 36px;
        padding: 0 20px;
        font-size: 13px;
      }
      .island {
        position: absolute;
        left: 50%;
        top: 11px;
        width: 122px;
        height: 34px;
        margin-left: -61px;
        border-radius: 20px;
        background: #0b0c10;
      }
      .android .island {
        width: 12px;
        height: 12px;
        margin-left: -6px;
        top: 12px;
      }
      .status .sys {
        display: flex;
        gap: 6px;
        align-items: center;
      }
      .navbar {
        flex: none;
        height: ${NAV_H}px;
        display: grid;
        grid-template-columns: 56px 1fr 56px;
        align-items: center;
        color: var(--mk-color-text);
        background: var(--mk-color-surface);
        position: relative;
      }
      .navbar .nb {
        display: grid;
        place-items: center;
        color: var(--mk-color-primary);
      }
      .navbar .title {
        text-align: center;
        font-weight: 600;
        font-size: 17px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .navbar .native-tag {
        position: absolute;
        right: 6px;
        bottom: -14px;
        font: 600 9px/1 system-ui;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #9aa1ad;
        background: #fff;
        border: 1px solid #e6e8ec;
        padding: 2px 4px;
        border-radius: 3px;
        z-index: 3;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.15s;
      }
      .navbar:hover .native-tag {
        opacity: 1;
      }
      .block-bar {
        flex: none;
        display: flex;
        align-items: center;
        gap: 8px;
        height: ${NAV_H}px;
        padding: 0 16px;
        background: #f5f3ff;
        color: #5b21b6;
        font: 600 13px system-ui;
        border-bottom: 1px solid #ede9fe;
      }
      .viewport {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        position: relative;
        scrollbar-width: none;
      }
      .viewport::-webkit-scrollbar {
        display: none;
      }
      .home {
        flex: none;
        height: 26px;
        display: grid;
        place-items: center;
        background: inherit;
      }
      .home::after {
        content: '';
        width: 134px;
        height: 5px;
        border-radius: 3px;
        background: var(--mk-color-text);
        opacity: 0.85;
      }
      .edit wb-screen-view {
        cursor: default;
      }

      /* overlay */
      .overlay {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 5;
      }
      .clip {
        position: absolute;
        overflow: hidden;
      }
      .box {
        position: absolute;
        border-radius: 3px;
      }
      .hover {
        outline: 1.5px solid rgb(79 70 229 / 0.55);
      }
      .selected {
        outline: 2px solid #4f46e5;
        outline-offset: 0;
      }
      .selected.instance {
        outline-color: #7c3aed;
      }
      .tag {
        position: absolute;
        transform: translateY(-100%);
        margin-top: -4px;
        height: 22px;
        padding: 0 8px;
        border-radius: 5px;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font: 600 11.5px/1 system-ui, sans-serif;
        color: #fff;
        background: #4f46e5;
        white-space: nowrap;
        box-shadow: 0 2px 6px rgb(79 70 229 / 0.3);
      }
      .tag.instance {
        background: #7c3aed;
      }
      .tag.hover-tag {
        background: rgb(79 70 229 / 0.85);
        box-shadow: none;
      }
      .toolbar {
        position: absolute;
        transform: translateY(-100%);
        margin-top: -4px;
        display: flex;
        gap: 1px;
        padding: 2px;
        border-radius: 7px;
        background: #1d2330;
        pointer-events: auto;
        box-shadow: 0 4px 14px rgb(15 23 42 / 0.25);
      }
      .toolbar button {
        all: unset;
        width: 24px;
        height: 22px;
        display: grid;
        place-items: center;
        color: #cfd3dc;
        border-radius: 5px;
        cursor: pointer;
      }
      .toolbar button:hover {
        background: rgb(255 255 255 / 0.12);
        color: #fff;
      }
      .line {
        position: absolute;
        background: #4f46e5;
        border-radius: 2px;
        box-shadow: 0 0 0 2px rgb(255 255 255 / 0.9);
      }
      .line::before,
      .line::after {
        content: '';
        position: absolute;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #4f46e5;
        box-shadow: 0 0 0 2px #fff;
      }
      .line.h::before {
        left: -4px;
        top: -3px;
      }
      .line.h::after {
        right: -4px;
        top: -3px;
      }
      .line.v::before {
        top: -4px;
        left: -3px;
      }
      .line.v::after {
        bottom: -4px;
        left: -3px;
      }
      .drop-container {
        background: rgb(79 70 229 / 0.06);
        outline: 1.5px dashed rgb(79 70 229 / 0.6);
      }
      .inline-editor {
        position: absolute;
        pointer-events: auto;
        font: 500 15px/1.4 system-ui, sans-serif;
        padding: 6px 8px;
        border: 2px solid #4f46e5;
        border-radius: 6px;
        background: rgb(255 255 255 / 0.97);
        color: #1d2330;
        box-shadow: 0 8px 24px rgb(15 23 42 / 0.18);
        resize: none;
        outline: none;
        min-height: 36px;
        height: auto;
      }
      .hint {
        position: absolute;
        left: 50%;
        bottom: 14px;
        transform: translateX(-50%);
        display: flex;
        gap: 14px;
        align-items: center;
        padding: 6px 12px;
        border-radius: 999px;
        background: rgb(255 255 255 / 0.9);
        border: 1px solid var(--c-line);
        color: var(--c-muted);
        font-size: 12px;
        white-space: nowrap;
        z-index: 4;
        backdrop-filter: blur(6px);
      }
      @container (max-width: 600px) {
        .hint {
          display: none;
        }
      }
      .preview-banner {
        position: absolute;
        bottom: 14px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 6;
        padding: 6px 12px;
        border-radius: 999px;
        background: #1d2330;
        color: #fff;
        font-size: 12px;
        display: flex;
        gap: 8px;
        align-items: center;
      }
    `,
  ];

  private get view(): WbScreenView | null {
    return this.renderRoot.querySelector('wb-screen-view');
  }

  private get viewport(): HTMLElement | null {
    return this.renderRoot.querySelector('.viewport');
  }

  connectedCallback() {
    super.connectedCallback();
    const zone: DropZone = {
      host: this,
      resolve: (e, payload) => this.resolveDrop(e, payload),
      clear: () => this.setIndicator(undefined),
    };
    this.removeZone = dnd.addZone(zone);
    this.ro.observe(this);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeZone?.();
    this.ro.disconnect();
  }

  protected updated() {
    const view = this.view;
    if (view) {
      this.ro.observe(view);
      const sel = this.elementFor(store.ui.selectedId);
      if (sel) this.ro.observe(sel);
    }
    this.measureSoon();
  }

  // ---------- geometry ----------

  private elementFor(id: string | null | undefined): HTMLElement | null {
    if (!id) return null;
    return this.view?.shadowRoot?.querySelector(`[data-wb-id="${CSS.escape(id)}"]`) ?? null;
  }

  private rel(r: DOMRect): Box {
    const h = this.getBoundingClientRect();
    return { x: r.left - h.left, y: r.top - h.top, w: r.width, h: r.height };
  }

  /** Re-measure for a short while: custom elements upgrade and fonts settle asynchronously. */
  measureSoon() {
    const already = this.rafUntil > performance.now();
    this.rafUntil = performance.now() + 450;
    if (already) return;
    const tick = () => {
      this.measure();
      if (performance.now() < this.rafUntil) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    this.updateFit();
  }

  private measure() {
    const vp = this.viewport;
    if (!vp || store.ui.mode !== 'edit') {
      if (this.measured.selected || this.measured.hover) this.measured = {};
      return;
    }
    const clip = this.rel(vp.getBoundingClientRect());
    const sel = this.elementFor(store.ui.selectedId);
    const hov = store.ui.hoveredId !== store.ui.selectedId ? this.elementFor(store.ui.hoveredId) : null;
    const ed = this.editing ? this.elementFor(this.editing.nodeId) : null;
    const next = {
      ...this.measured,
      clip,
      selected: sel ? this.rel(sel.getBoundingClientRect()) : undefined,
      hover: hov && !dnd.payload ? this.rel(hov.getBoundingClientRect()) : undefined,
      editing: ed ? this.rel(ed.getBoundingClientRect()) : undefined,
    };
    if (JSON.stringify(next) !== JSON.stringify(this.measured)) this.measured = next;
  }

  private updateFit() {
    const d = this.deviceSize();
    const avail = this.clientHeight - 28 - 64;
    const availW = this.clientWidth - 64;
    const fit = Math.max(0.35, Math.min(1, avail / d.h, availW / d.w));
    if (Math.abs(fit - this.fitZoom) > 0.005) {
      this.fitZoom = fit;
      this.requestUpdate();
    }
  }

  private deviceSize() {
    const dev = DEVICES[store.ui.device];
    return { w: dev.width, h: dev.height };
  }

  private get zoom() {
    return store.ui.zoom > 0 ? store.ui.zoom : this.fitZoom;
  }

  // ---------- drop targeting ----------

  private setIndicator(ind: Indicator | undefined) {
    if (JSON.stringify(ind) !== JSON.stringify(this.measured.indicator)) this.measured = { ...this.measured, indicator: ind };
  }

  private resolveDrop(e: PointerEvent, payload: DragPayload): DropTarget | null {
    const result = this.computeDrop(e, payload);
    this.setIndicator(result?.indicator);
    return result?.target ?? null;
  }

  private computeDrop(e: PointerEvent, payload: DragPayload): { target: DropTarget; indicator: Indicator } | null {
    const view = this.view;
    if (!view || store.ui.mode !== 'edit') return null;
    const doc = store.doc;
    const path = e.composedPath().filter((x): x is HTMLElement => x instanceof HTMLElement);
    const end = path.indexOf(view);
    if (end < 0) return null;
    let i = 0;
    const movingId = payload.kind === 'move' ? payload.nodeId : null;
    if (movingId) {
      const idx = path.findIndex((el) => el.dataset.wbId === movingId);
      if (idx >= 0) i = idx + 1;
    }
    const isTarget = (el: HTMLElement) => Boolean(el.dataset.wbId || el.dataset.wbRegion);
    const parentOf = (from: number) => {
      for (let j = from + 1; j < end; j++) if (path[j].dataset.wbDir) return j;
      return -1;
    };

    for (; i < end; i++) {
      const el = path[i];
      if (!isTarget(el)) continue;
      const region = el.dataset.wbRegion;
      if (region === ROOT) return null;
      if (region) return this.targetIn(el, region, 'default', el.dataset.wbDir as 'vertical', e, movingId);

      const id = el.dataset.wbId!;
      const pIdx = parentOf(i);
      const parentEl = pIdx >= 0 ? path[pIdx] : null;
      const parentDir = (parentEl?.dataset.wbDir ?? 'vertical') as 'vertical' | 'horizontal';

      if (el.dataset.wbDir) {
        const r = el.getBoundingClientRect();
        const edge = parentDir === 'vertical' ? Math.min(10, r.height / 4) : Math.min(10, r.width / 4);
        const fromStart = parentDir === 'vertical' ? e.clientY - r.top : e.clientX - r.left;
        const fromEnd = parentDir === 'vertical' ? r.bottom - e.clientY : r.right - e.clientX;
        const nearEdge = parentEl && parentEl.dataset.wbRegion !== ROOT && (fromStart < edge || fromEnd < edge);
        if (!nearEdge) {
          const node = findNode(doc, id)?.node;
          const def = node && registry.get(node.type);
          const slot = def?.container ? actions.insertionSlot(id, def) : 'default';
          return this.targetIn(el, id, slot, el.dataset.wbDir as 'vertical' | 'horizontal', e, movingId);
        }
      }

      // Leaf (or container edge): insert before/after it in its parent.
      if (!parentEl || parentEl.dataset.wbRegion === ROOT) return null;
      const located = findNode(doc, id);
      if (!located) return null;
      const r = el.getBoundingClientRect();
      const after = parentDir === 'horizontal' ? e.clientX > r.left + r.width / 2 : e.clientY > r.top + r.height / 2;
      const target = { parentId: located.parentId, slot: located.slot, index: located.index + (after ? 1 : 0) };
      return { target, indicator: this.indicatorFor(parentEl, located.list, target.index, parentDir, movingId) };
    }
    return null;
  }

  private targetIn(el: HTMLElement, parentId: string, slot: string, dir: 'vertical' | 'horizontal', e: PointerEvent, movingId: string | null) {
    const list = childList(store.doc, parentId, slot);
    if (!list) return null;
    let index = list.length;
    for (let k = 0; k < list.length; k++) {
      if (list[k].id === movingId) continue;
      const c = this.elementFor(list[k].id);
      if (!c) continue;
      const r = c.getBoundingClientRect();
      const before = dir === 'horizontal' ? e.clientX < r.left + r.width / 2 : e.clientY < r.top + r.height / 2;
      if (before) {
        index = k;
        break;
      }
    }
    return { target: { parentId, slot, index }, indicator: this.indicatorFor(el, list, index, dir, movingId) };
  }

  private indicatorFor(container: HTMLElement, list: Node[], index: number, dir: 'vertical' | 'horizontal', movingId: string | null): Indicator {
    const cBox = this.rel(container.getBoundingClientRect());
    const els = (from: number, step: number) => {
      for (let k = from; k >= 0 && k < list.length; k += step) {
        if (list[k].id === movingId) continue;
        const el = this.elementFor(list[k].id);
        if (el) return this.rel(el.getBoundingClientRect());
      }
      return undefined;
    };
    const prev = els(index - 1, -1);
    const next = els(index, 1);
    const t = 3;
    let line: Box;
    if (dir === 'vertical') {
      const y = prev && next ? (prev.y + prev.h + next.y) / 2 : next ? next.y - 3 : prev ? prev.y + prev.h + 3 : cBox.y + cBox.h / 2;
      const ref = next ?? prev ?? { x: cBox.x + 8, w: cBox.w - 16 };
      line = { x: ref.x, y: y - t / 2, w: ref.w, h: t };
    } else {
      const x = prev && next ? (prev.x + prev.w + next.x) / 2 : next ? next.x - 3 : prev ? prev.x + prev.w + 3 : cBox.x + cBox.w / 2;
      const ref = next ?? prev ?? { y: cBox.y + 8, h: cBox.h - 16 };
      line = { x: x - t / 2, y: ref.y, w: t, h: ref.h };
    }
    return { line, container: cBox };
  }

  // ---------- pointer handling (edit mode) ----------

  private idFromEvent(e: Event): string | null {
    for (const el of e.composedPath()) {
      if (el === this.view) break;
      if (el instanceof HTMLElement && el.dataset.wbId) return el.dataset.wbId;
    }
    return null;
  }

  private onPointerDown = (e: PointerEvent) => {
    if (store.ui.mode !== 'edit' || e.button !== 0) return;
    e.preventDefault(); // no focus / text selection inside components
    this.commitEdit();
    const id = this.idFromEvent(e);
    store.select(id);
    if (!id) return;
    const located = findNode(store.doc, id);
    if (!located || located.parentId === ROOT) return;
    dnd.begin(e, { kind: 'move', nodeId: id }, nodeLabel(located.node), registry.get(located.node.type)?.icon ?? 'component');
  };

  private onClickCapture = (e: Event) => {
    if (store.ui.mode !== 'edit') return;
    e.preventDefault();
    e.stopPropagation();
  };

  private onPointerMove = (e: PointerEvent) => {
    if (store.ui.mode !== 'edit' || dnd.payload) return;
    store.hover(this.idFromEvent(e));
  };

  private onDblClick = (e: MouseEvent) => {
    if (store.ui.mode !== 'edit') return;
    const id = this.idFromEvent(e);
    const located = id ? findNode(store.doc, id) : null;
    if (!located) return;
    if (located.node.type === BLOCK_TYPE) {
      store.openBlock(String(located.node.props.blockId));
      return;
    }
    this.startEdit(located.node);
  };

  startEdit(node: Node) {
    const def = registry.get(node.type);
    const prop = def?.inlineEdit && def.props.find((p) => p.name === def.inlineEdit);
    if (!def || !prop) return;
    this.editing = { nodeId: node.id, prop: prop.name, value: String(node.props[prop.name] ?? ''), multiline: prop.type === 'textarea' };
    this.measure();
    this.requestUpdate();
    this.updateComplete.then(() => {
      const ta = this.renderRoot.querySelector<HTMLTextAreaElement>('.inline-editor');
      ta?.focus();
      ta?.select();
    });
  }

  private commitEdit() {
    if (!this.editing) return;
    this.editing = null;
    this.measured = { ...this.measured, editing: undefined };
  }

  private onEditInput(e: InputEvent) {
    const ta = e.target as HTMLTextAreaElement;
    if (!this.editing) return;
    this.editing.value = ta.value;
    actions.setProp(this.editing.nodeId, this.editing.prop, ta.value);
  }

  private onEditKey(e: KeyboardEvent) {
    e.stopPropagation();
    if (e.key === 'Escape' || (e.key === 'Enter' && !(e.shiftKey && this.editing?.multiline))) {
      e.preventDefault();
      this.commitEdit();
    }
  }

  // ---------- render ----------

  render() {
    const { ui, project } = store;
    const screen = store.screen;
    const block = store.block;
    const dev = DEVICES[ui.device];
    const zoom = this.zoom;
    const edit = ui.mode === 'edit';
    const s = screen?.settings;
    const subtle = !block && s?.background === 'subtle';
    const theme = themeStyle(project.theme);

    const navbar = block
      ? html`<div class="block-bar">${icon('component', 15)} ${block.name}</div>`
      : s?.navBar === 'native'
        ? html`<div class="navbar">
            <span class="nb">${s.leading !== 'none' ? navGlyph(s.leading) : nothing}</span>
            <span class="title">${s.title}</span>
            <span class="nb">${s.trailing !== 'none' ? navGlyph(s.trailing) : nothing}</span>
            <span class="native-tag">Native nav bar</span>
          </div>`
        : nothing;

    return html`
      <div class="scroller" @scroll=${() => this.measure()}>
        <div class="device-wrap" style=${styleMap({ width: `${dev.width * zoom}px`, height: `${dev.height * zoom}px` })}>
          <div
            class="device ${dev.platform} ${subtle ? 'subtle' : ''} ${edit ? 'edit' : ''}"
            style="${theme};width:${dev.width}px;height:${dev.height}px;transform:scale(${zoom})"
          >
            <div class="status">
              <span>9:41</span><span class="island"></span>
              <span class="sys">${icon('signal', 16, 2.4)}${icon('wifi', 16, 2.4)}${icon('battery-full', 20, 2)}</span>
            </div>
            ${navbar}
            <div
              class="viewport"
              @scroll=${() => this.measure()}
              @pointerdown=${this.onPointerDown}
              @click=${{ handleEvent: this.onClickCapture, capture: true }}
              @pointermove=${this.onPointerMove}
              @pointerleave=${() => store.hover(null)}
              @dblclick=${this.onDblClick}
            >
              <wb-screen-view
                fill
                .screen=${block ? undefined : screen}
                .block=${block}
                .blocks=${project.blocks}
                .theme=${project.theme}
                .mode=${edit ? 'edit' : 'preview'}
                .onLink=${(id: string) => store.openScreen(id)}
              ></wb-screen-view>
            </div>
            ${dev.platform === 'ios' ? html`<div class="home"></div>` : nothing}
          </div>
        </div>
      </div>
      ${edit ? this.renderOverlay() : nothing}
      ${edit
        ? html`<div class="hint">
            <span>Double-click text to edit</span><span><kbd>Del</kbd> remove</span><span><kbd>Ctrl</kbd>+<kbd>D</kbd> duplicate</span><span><kbd>Esc</kbd> parent</span>
          </div>`
        : html`<div class="preview-banner">${icon('play', 13)} Preview. Tap linked elements to navigate.</div>`}
    `;
  }

  private renderOverlay() {
    const m = this.measured;
    const clip = m.clip;
    if (!clip) return nothing;
    const local = (b: Box) => ({ left: `${b.x - clip.x}px`, top: `${b.y - clip.y}px`, width: `${b.w}px`, height: `${b.h}px` });
    const sel = store.ui.selectedId ? findNode(store.doc, store.ui.selectedId) : null;
    const hov = store.ui.hoveredId && store.ui.hoveredId !== store.ui.selectedId ? findNode(store.doc, store.ui.hoveredId) : null;
    const isInstance = sel?.node.type === BLOCK_TYPE;
    const canMove = sel && sel.parentId !== ROOT;
    const tagPos = (b: Box) => {
      const top = Math.max(clip.y + 26, b.y);
      return { left: `${Math.max(clip.x, b.x)}px`, top: `${top}px` };
    };
    const toolbarPos = (b: Box) => {
      const below = b.y + b.h + 30 < clip.y + clip.h;
      const top = below ? b.y + b.h + 4 : Math.max(clip.y + 4, b.y + b.h - 30);
      const right = Math.min(clip.x + clip.w - 4, b.x + b.w);
      return { left: `${right}px`, top: `${top}px`, transform: 'translateX(-100%)', marginTop: '0' };
    };

    return html`<div class="overlay">
      <div class="clip" style=${styleMap({ left: `${clip.x}px`, top: `${clip.y}px`, width: `${clip.w}px`, height: `${clip.h}px` })}>
        ${m.hover ? html`<div class="box hover" style=${styleMap(local(m.hover))}></div>` : nothing}
        ${m.selected ? html`<div class="box selected ${isInstance ? 'instance' : ''}" style=${styleMap(local(m.selected))}></div>` : nothing}
        ${m.indicator
          ? html`<div class="box drop-container" style=${styleMap(local(m.indicator.container))}></div>
              <div class="line ${m.indicator.line.w > m.indicator.line.h ? 'h' : 'v'}" style=${styleMap(local(m.indicator.line))}></div>`
          : nothing}
      </div>
      ${m.hover && hov && !m.indicator ? html`<div class="tag hover-tag" style=${styleMap(tagPos(m.hover))}>${nodeLabel(hov.node)}</div>` : nothing}
      ${m.selected && sel && !m.indicator
        ? html`<div class="tag ${isInstance ? 'instance' : ''}" style=${styleMap(tagPos(m.selected))}>
              ${icon(isInstance ? 'component' : (registry.get(sel.node.type)?.icon ?? 'box'), 12)} ${nodeLabel(sel.node)}
              ${sel.node.link ? icon('link-2', 12) : nothing}
            </div>
            ${canMove
              ? html`<div class="toolbar" style=${styleMap(toolbarPos(m.selected))} @pointerdown=${(e: Event) => e.stopPropagation()}>
                  ${!sel.parentId.startsWith('@') ? html`<button title="Select parent (Esc)" @click=${() => actions.selectParent()}>${icon('corner-left-up', 14)}</button>` : nothing}
                  <button title="Move up (Alt+↑)" @click=${() => actions.nudgeSelected(-1)}>${icon('arrow-up', 14)}</button>
                  <button title="Move down (Alt+↓)" @click=${() => actions.nudgeSelected(1)}>${icon('arrow-down', 14)}</button>
                  <button title="Duplicate (Ctrl+D)" @click=${() => actions.duplicateSelected()}>${icon('copy', 14)}</button>
                  <button title="Delete (Del)" @click=${() => actions.removeSelected()}>${icon('trash-2', 14)}</button>
                </div>`
              : nothing}`
        : nothing}
      ${this.editing && m.editing ? this.renderEditor(m.editing, clip) : nothing}
    </div>`;
  }

  private renderEditor(b: Box, clip: Box) {
    const left = Math.max(clip.x + 6, b.x - 6);
    const width = Math.min(clip.x + clip.w - 6 - left, Math.max(b.w + 12, 180));
    const rows = this.editing!.multiline ? Math.max(2, Math.min(6, Math.ceil(this.editing!.value.length / 32))) : 1;
    return html`<textarea
      class="inline-editor"
      rows=${rows}
      style=${styleMap({ left: `${left}px`, top: `${b.y - 6}px`, width: `${width}px`, fontSize: `${Math.max(12, Math.round(16 * this.zoom))}px` })}
      .value=${this.editing!.value}
      @input=${this.onEditInput}
      @keydown=${this.onEditKey}
      @blur=${() => this.commitEdit()}
    ></textarea>`;
  }
}
customElements.define('wb-canvas', WbCanvas);
