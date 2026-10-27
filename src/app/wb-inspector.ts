import { LitElement, css, html, nothing, type TemplateResult } from 'lit';
import * as actions from '../core/actions.js';
import { BLOCK_TYPE, countInstances } from '../core/blocks.js';
import { icon } from '../core/icons.js';
import type { BlockDef, Node, Screen } from '../core/model.js';
import { containerSlots, registry, type PropDef } from '../core/registry.js';
import { store, StoreController } from '../core/store.js';
import { THEME_PRESETS } from '../core/theme.js';
import { ROOT, allNodes, ancestry, findNode, walk } from '../core/tree.js';
import { field } from './controls/fields.js';
import { ui } from './styles.js';
import { nodeLabel } from './wb-canvas.js';

const GROUPS: { id: PropDef['group']; label: string }[] = [
  { id: 'content', label: 'Content' },
  { id: 'style', label: 'Appearance' },
  { id: 'behavior', label: 'Behavior' },
];

const POSITION: PropDef[] = [
  { name: '$grow', label: 'Fill space', type: 'boolean', default: false, description: 'Take up remaining space in the parent row or stack.' },
  {
    name: '$align',
    label: 'Align self',
    type: 'select',
    default: 'auto',
    options: [{ value: 'auto' }, { value: 'start' }, { value: 'center' }, { value: 'end' }, { value: 'stretch' }],
  },
];

/** Right panel: properties of the selection, screen settings, block info, or theme. */
export class WbInspector extends LitElement {
  readonly storeController = new StoreController(this);

  static styles = [
    ui,
    css`
      :host {
        display: flex;
        flex-direction: column;
        min-height: 0;
      }
      .tabs {
        display: flex;
        gap: 2px;
        padding: 8px 10px;
        border-bottom: 1px solid var(--c-line);
      }
      .tabs button {
        flex: 1;
        height: 28px;
        border: 0;
        border-radius: 6px;
        background: transparent;
        cursor: pointer;
        font-weight: 600;
        color: var(--c-muted);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }
      .tabs button.on {
        background: var(--c-hover);
        color: var(--c-text);
      }
      .body {
        flex: 1;
        overflow-y: auto;
        padding-bottom: 32px;
      }
      .head {
        padding: 14px 14px 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        border-bottom: 1px solid var(--c-line);
      }
      .title-row {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .title-row .ico {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: grid;
        place-items: center;
        background: var(--c-hover);
        flex: none;
      }
      .title-row .ico.instance {
        background: #f1ebff;
        color: var(--c-block);
      }
      .title-row h2 {
        margin: 0;
        font-size: 14px;
        font-weight: 650;
        line-height: 1.2;
      }
      .title-row .sub {
        font-size: 11.5px;
        color: var(--c-faint);
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      .crumbs {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 2px;
        font-size: 11.5px;
        color: var(--c-faint);
      }
      .crumbs button {
        border: 0;
        background: none;
        padding: 2px 4px;
        border-radius: 4px;
        cursor: pointer;
        color: var(--c-muted);
        font-size: 11.5px;
      }
      .crumbs button:hover {
        background: var(--c-hover);
        color: var(--c-text);
      }
      .acts {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      section {
        padding: 12px 14px 14px;
        border-bottom: 1px solid var(--c-line);
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      section > .label {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .f {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .f-inline {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .f-inline > :last-child {
        flex: 0 1 170px;
        min-width: 0;
      }
      .f-label {
        font-size: 12px;
        color: var(--c-muted);
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
      }
      .ov {
        border: 0;
        background: none;
        padding: 0 2px;
        color: var(--c-block);
        cursor: pointer;
        font-size: 10px;
        line-height: 1;
      }
      .num {
        text-align: right;
      }
      .switch {
        position: relative;
        flex: 0 0 34px !important;
        width: 34px;
        height: 20px;
        border-radius: 10px;
        background: #d5d8de;
        transition: background 0.15s;
        cursor: pointer;
      }
      .switch::after {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 1px 2px rgb(0 0 0 / 0.2);
        transition: transform 0.15s;
      }
      .switch.on {
        background: var(--c-accent);
      }
      .switch.on::after {
        transform: translateX(14px);
      }
      .switch input {
        position: absolute;
        inset: 0;
        opacity: 0;
        margin: 0;
        cursor: pointer;
      }
      .color {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .color input {
        width: 30px;
        height: 26px;
        padding: 0;
        border: 1px solid var(--c-line-strong);
        border-radius: 6px;
        background: none;
        cursor: pointer;
      }
      .color code {
        font-size: 11.5px;
        color: var(--c-muted);
      }
      .note {
        font-size: 12px;
        line-height: 1.5;
        color: var(--c-muted);
        background: var(--c-hover);
        border-radius: 8px;
        padding: 10px 12px;
      }
      .note.block {
        background: #f7f4ff;
        color: #5b21b6;
      }
      .inner {
        border: 1px solid var(--c-line);
        border-radius: 8px;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .inner-head {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 600;
        font-size: 12px;
      }
      .presets {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
      }
      .preset {
        border: 1.5px solid var(--c-line);
        border-radius: 8px;
        padding: 8px;
        cursor: pointer;
        background: #fff;
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 11.5px;
        font-weight: 500;
        text-align: left;
      }
      .preset.on {
        border-color: var(--c-accent);
      }
      .swatches {
        display: flex;
        gap: 3px;
      }
      .swatches span {
        width: 14px;
        height: 14px;
        border-radius: 4px;
        border: 1px solid rgb(0 0 0 / 0.08);
      }
      input[type='range'] {
        width: 100%;
        accent-color: var(--c-accent);
      }
      .stat {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: var(--c-muted);
      }
    `,
  ];

  render() {
    const tab = store.ui.rightTab;
    return html`<div class="tabs">
        <button class=${tab === 'properties' ? 'on' : ''} @click=${() => store.setUI({ rightTab: 'properties' })}>${icon('sliders-horizontal', 14)} Properties</button>
        <button class=${tab === 'theme' ? 'on' : ''} @click=${() => store.setUI({ rightTab: 'theme' })}>${icon('palette', 14)} Theme</button>
      </div>
      <div class="body">${tab === 'theme' ? this.renderTheme() : this.renderProperties()}</div>`;
  }

  private renderProperties() {
    const id = store.ui.selectedId;
    const found = id ? findNode(store.doc, id) : null;
    if (found) return found.node.type === BLOCK_TYPE ? this.renderInstance(found.node) : this.renderNode(found.node, found.parentId);
    if (store.block) return this.renderBlockInfo(store.block);
    if (store.screen) return this.renderScreen(store.screen);
    return nothing;
  }

  private crumbs(node: Node) {
    const chain = ancestry(store.doc, node.id);
    const regionLabel = store.ui.target.kind === 'block' ? 'Block' : findNode(store.doc, chain[0]?.id ?? '')?.parentId === '@footer' ? 'Footer' : 'Body';
    return html`<div class="crumbs">
      <button @click=${() => store.select(null)}>${regionLabel}</button>
      ${chain.map(
        (n, i) => html`${icon('chevron-right', 11)}
          ${i === chain.length - 1 ? html`<span style="padding:2px 4px;color:var(--c-text)">${nodeLabel(n)}</span>` : html`<button @click=${() => store.select(n.id)}>${nodeLabel(n)}</button>`}`,
      )}
    </div>`;
  }

  private actionsRow(node: Node, parentId: string) {
    const isRoot = parentId === ROOT;
    return html`<div class="acts">
      ${!isRoot && node.type !== BLOCK_TYPE
        ? html`<button class="btn sm" @click=${() => this.dispatchEvent(new CustomEvent('save-block', { bubbles: true, composed: true }))}>
            ${icon('component', 13)} Save as block
          </button>`
        : nothing}
      ${!isRoot
        ? html`<button class="btn sm" title="Duplicate (Ctrl+D)" @click=${() => actions.duplicateSelected()}>${icon('copy', 13)}</button>
            <button class="btn sm danger" title="Delete (Del)" @click=${() => actions.removeSelected()}>${icon('trash-2', 13)}</button>`
        : nothing}
    </div>`;
  }

  private groups(defProps: PropDef[], props: Node['props'], onChange: (p: PropDef, v: unknown) => void, overrides?: (p: PropDef) => { overridden: boolean; onReset: () => void }) {
    return GROUPS.map((g) => {
      const list = defProps.filter((p) => (p.group ?? 'content') === g.id && (!p.when || p.when(props)));
      if (!list.length) return nothing;
      return html`<section>
        <div class="label">${g.label}</div>
        ${list.map((p) => field(p, props, (v) => onChange(p, v), overrides?.(p)))}
      </section>`;
    });
  }

  private positionAndLink(node: Node, parentId: string) {
    const parent = parentId.startsWith('@') ? null : findNode(store.doc, parentId)?.node;
    const parentDef = parent && registry.get(parent.type);
    const inFlex = parentId === '@body' || parentId === '@footer' || Boolean(parentDef?.container);
    const screens = store.project.screens.filter((s) => s.id !== store.screen?.id || store.ui.target.kind === 'block');
    return html`
      ${inFlex && parentId !== ROOT
        ? html`<section>
            <div class="label">Position in ${parentDef?.container?.direction === 'horizontal' ? 'row' : 'stack'}</div>
            ${POSITION.map((p) => field(p, node.props, (v) => actions.setProp(node.id, p.name, v)))}
          </section>`
        : nothing}
      <section>
        <div class="label">Interaction</div>
        <div class="f f-inline">
          <span class="f-label">${icon('link-2', 13)} On tap, go to</span>
          <select @change=${(e: Event) => actions.setLink(node.id, (e.target as HTMLSelectElement).value || null)}>
            <option value="" ?selected=${!node.link}>Nothing</option>
            ${screens.map((s) => html`<option value=${s.id} ?selected=${node.link === s.id}>${s.name}</option>`)}
          </select>
        </div>
        ${node.link ? html`<div class="note">Try it in <b>Preview</b>. In code, this becomes a <code>navigate</code> event.</div>` : nothing}
      </section>
    `;
  }

  private renderNode(node: Node, parentId: string) {
    const def = registry.get(node.type);
    if (!def) {
      return html`<div class="head"><div class="note">Unknown component <code>${node.type}</code>. Its library may be disabled or failed to load.</div>${this.actionsRow(node, parentId)}</div>`;
    }
      const lib = registry.library(def.library);
    return html`
      <div class="head">
        <div class="title-row">
          <span class="ico">${icon(def.icon, 17)}</span>
          <div style="flex:1;min-width:0">
            <h2>${def.label}</h2>
            <div class="sub">${def.native ? 'layout' : `<${def.tag}>`}</div>
          </div>
          ${lib ? html`<span class="chip" style="background:${lib.color}1a;color:${lib.color}">${lib.badge}</span>` : nothing}
        </div>
        ${this.crumbs(node)} ${this.actionsRow(node, parentId)}
      </div>
      ${this.groups(def.props, node.props, (p, v) => actions.setProp(node.id, p.name, v as never))}
      ${containerSlots(def).length > 1 ? html`<section>
        <div class="label">Children</div>
        <label class="f f-inline"><span class="f-label">Insert into slot</span>
          <select aria-label="Insert into slot" .value=${actions.insertionSlot(node.id, def)}
            @change=${(e: Event) => store.setUI({ insertionSlot: { nodeId: node.id, slot: (e.target as HTMLSelectElement).value } })}>
            ${containerSlots(def).map((slot) => html`<option value=${slot}>${slot === 'default' ? 'Content (default)' : slot}</option>`)}
          </select>
        </label>
      </section>` : nothing}
      ${this.positionAndLink(node, parentId)}
      ${def.description ? html`<section><div class="note">${def.description}</div></section>` : nothing}
    `;
  }

  private renderInstance(node: Node) {
    const block = store.project.blocks.find((b) => b.id === node.props.blockId);
    const found = findNode(store.doc, node.id)!;
    if (!block) return html`<div class="head"><div class="note">This block was deleted.</div>${this.actionsRow(node, found.parentId)}</div>`;
    const lists = [...store.project.screens.flatMap((s) => [s.body, s.footer]), ...store.project.blocks.map((b) => [b.root])];
    const uses = countInstances(block.id, lists);
    const inner: Node[] = [];
    walk([block.root], (n) => {
      const d = registry.get(n.type);
      if (d && !d.native && d.props.length) inner.push(n);
    });
    const overrides = node.overrides ?? {};
    return html`
      <div class="head">
        <div class="title-row">
          <span class="ico instance">${icon(block.icon ?? 'component', 17)}</span>
          <div style="flex:1;min-width:0">
            <h2>${block.name}</h2>
            <div class="sub">block instance · ${uses} use${uses === 1 ? '' : 's'}</div>
          </div>
          <span class="chip" style="background:#f1ebff;color:var(--c-block)">Block</span>
        </div>
        ${this.crumbs(node)}
        <div class="acts">
          <button class="btn sm" @click=${() => store.openBlock(block.id)}>${icon('pencil', 13)} Edit block</button>
          <button class="btn sm" title="Turn into a regular, editable copy" @click=${() => actions.detachSelected()}>${icon('unlink', 13)} Detach</button>
          <button class="btn sm" title="Duplicate (Ctrl+D)" @click=${() => actions.duplicateSelected()}>${icon('copy', 13)}</button>
          <button class="btn sm danger" title="Delete (Del)" @click=${() => actions.removeSelected()}>${icon('trash-2', 13)}</button>
        </div>
      </div>
      <section>
        <div class="note block">Linked to <b>${block.name}</b>. Changes to the block update all ${uses} uses. Values below override it only here.</div>
        ${inner.map((n) => {
          const def = registry.get(n.type)!;
          const props = { ...n.props, ...overrides[n.id] };
          const fields = def.props.filter((p) => !p.when || p.when(props));
          return html`<div class="inner">
            <div class="inner-head">${icon(def.icon, 13)} ${def.label}</div>
            ${fields.map((p) =>
              field(p, props, (v) => actions.setOverride(node.id, n.id, p.name, v), {
                overridden: overrides[n.id]?.[p.name] !== undefined,
                onReset: () => actions.setOverride(node.id, n.id, p.name, undefined),
              }),
            )}
          </div>`;
        })}
      </section>
      ${this.positionAndLink(node, found.parentId)}
    `;
  }

  private renderBlockInfo(block: BlockDef) {
    const lists = [...store.project.screens.flatMap((s) => [s.body, s.footer]), ...store.project.blocks.map((b) => [b.root])];
    const uses = countInstances(block.id, lists);
    return html`
      <div class="head">
        <div class="title-row">
          <span class="ico instance">${icon(block.icon ?? 'component', 17)}</span>
          <div style="flex:1"><h2>Block</h2><div class="sub">${uses} use${uses === 1 ? '' : 's'} across screens</div></div>
        </div>
      </div>
      <section>
        <div class="f"><span class="f-label">Name</span><input type="text" .value=${block.name} @input=${(e: Event) => actions.renameBlock(block.id, (e.target as HTMLInputElement).value)} /></div>
        <div class="note block">You're editing the master. Every change applies to all ${uses} uses, except values an instance overrides.</div>
        <div class="acts">
          <button class="btn primary sm" @click=${() => store.closeBlock()}>${icon('check', 13)} Done</button>
          <button
            class="btn sm danger"
            @click=${() => {
              if (confirm(`Delete block "${block.name}"? Its ${uses} uses become regular, editable copies.`)) actions.deleteBlock(block.id);
            }}
          >
            ${icon('trash-2', 13)} Delete block
          </button>
        </div>
      </section>
    `;
  }

  private renderScreen(screen: Screen) {
    const s = screen.settings;
    const set = <K extends keyof Screen['settings']>(k: K) => (v: unknown) => actions.setScreenSetting(screen.id, k, v as Screen['settings'][K]);
    const sel = (name: string, label: string, options: string[]): PropDef => ({ name, label, type: 'select', options: options.map((value) => ({ value })) });
    const count = allNodes({ a: screen.body, b: screen.footer }).length;
    const blocksUsed = new Set(allNodes({ a: screen.body, b: screen.footer }).filter((n) => n.type === BLOCK_TYPE).map((n) => n.props.blockId)).size;
    return html`
      <div class="head">
        <div class="title-row">
          <span class="ico">${icon('smartphone', 17)}</span>
          <div style="flex:1;min-width:0"><h2>${screen.name}</h2><div class="sub">screen · nothing selected</div></div>
        </div>
      </div>
      <section>
        <div class="label">Screen</div>
        ${field({ name: 'name', label: 'Name', type: 'text' }, { name: screen.name }, (v) => actions.renameScreen(screen.id, String(v)))}
        ${field({ name: 'title', label: 'Title', type: 'text', description: 'Shown in the navigation bar.' }, s as never, set('title'))}
      </section>
      <section>
        <div class="label">Navigation bar</div>
        ${field({ ...sel('navBar', 'Rendered by', ['native', 'web', 'none']), options: [{ value: 'native', label: 'Native app' }, { value: 'web', label: 'Webview' }, { value: 'none', label: 'None' }] }, s as never, set('navBar'))}
        ${s.navBar !== 'none'
          ? html`${field(sel('leading', 'Leading', ['back', 'close', 'none']), s as never, set('leading'))}
            ${field(sel('trailing', 'Trailing', ['none', 'close', 'help', 'more']), s as never, set('trailing'))}`
          : nothing}
        <div class="note">
          ${s.navBar === 'native'
            ? 'The app draws the bar. The webview passes title and buttons through the bridge, which keeps it identical to native screens.'
            : s.navBar === 'web'
              ? 'The webview renders its own header.'
              : 'Full-screen content with no bar, for loaders and takeovers.'}
        </div>
      </section>
      <section>
        <div class="label">Layout</div>
        ${field({ ...sel('bodyAlign', 'Content', []), options: [{ value: 'start', label: 'Top' }, { value: 'center', label: 'Centered' }] }, s as never, set('bodyAlign'))}
        ${field({ ...sel('background', 'Background', []), options: [{ value: 'default', label: 'Surface' }, { value: 'subtle', label: 'Subtle' }] }, s as never, set('background'))}
      </section>
      <section>
        <div class="stat"><span>Components</span><b>${count}</b></div>
        <div class="stat"><span>Blocks used</span><b>${blocksUsed}</b></div>
        <div class="acts">
          <button class="btn sm" @click=${() => actions.duplicateScreen(screen.id)}>${icon('copy', 13)} Duplicate screen</button>
          <button class="btn sm danger" @click=${() => actions.deleteScreen(screen.id)}>${icon('trash-2', 13)} Delete</button>
        </div>
      </section>
    `;
  }

  private renderTheme(): TemplateResult {
    const t = store.project.theme;
    const colors: [keyof typeof t, string][] = [
      ['colorPrimary', 'Primary'],
      ['colorOnPrimary', 'On primary'],
      ['colorAccent', 'Accent / links'],
      ['colorText', 'Text'],
      ['colorTextMuted', 'Muted text'],
      ['colorSurface', 'Surface'],
      ['colorSurfaceSubtle', 'Subtle surface'],
      ['colorBorder', 'Border'],
      ['colorSuccess', 'Success'],
      ['colorWarning', 'Warning'],
      ['colorError', 'Error'],
    ];
    return html`
      <section>
        <div class="note">One theme for every screen keeps the app consistent. Components read these as <code>--mk-*</code> tokens, and export writes them to <code>theme.css</code>.</div>
        <div class="label">Presets</div>
        <div class="presets">
          ${Object.entries(THEME_PRESETS).map(
            ([id, p]) => html`<button class="preset ${t.preset === id ? 'on' : ''}" @click=${() => actions.setTheme({ ...p.theme }, `preset:${Date.now()}`)}>
              <span class="swatches">
                <span style="background:${p.theme.colorPrimary}"></span><span style="background:${p.theme.colorAccent}"></span><span style="background:${p.theme.colorSurface}"></span>
              </span>
              ${p.label}
            </button>`,
          )}
        </div>
      </section>
      <section>
        <div class="label">Colors</div>
        ${colors.map(([k, label]) => field({ name: k, label, type: 'color' }, t as never, (v) => actions.setTheme({ [k]: v, preset: 'custom' } as never, `theme:${k}`)))}
      </section>
      <section>
        <div class="label">Shape & type</div>
        <div class="f">
          <span class="f-label">Corner radius · ${t.radius}px</span>
          <input type="range" min="0" max="24" .value=${String(t.radius)} @input=${(e: Event) => actions.setTheme({ radius: Number((e.target as HTMLInputElement).value), preset: 'custom' }, 'theme:radius')} />
        </div>
        <div class="f">
          <span class="f-label">Text size · ${Math.round(t.fontScale * 100)}%</span>
          <input type="range" min="0.85" max="1.3" step="0.05" .value=${String(t.fontScale)} @input=${(e: Event) => actions.setTheme({ fontScale: Number((e.target as HTMLInputElement).value) }, 'theme:scale')} />
        </div>
        ${field({ name: 'fontFamily', label: 'Font family', type: 'text', description: 'CSS font-family stack, e.g. your brand font.' }, t as never, (v) => actions.setTheme({ fontFamily: String(v) }, 'theme:font'))}
      </section>
    `;
  }
}
customElements.define('wb-inspector', WbInspector);
