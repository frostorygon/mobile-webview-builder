import { LitElement, css, html, nothing, type TemplateResult } from 'lit';
import * as actions from '../core/actions.js';
import { generateAll, generateHtml, generateLit, generateTheme, type GeneratedFile } from '../core/codegen.js';
import { icon } from '../core/icons.js';
import type { Project, RemoteLibrary, Screen } from '../core/model.js';
import { uid } from '../core/model.js';
import { registry } from '../core/registry.js';
import { registerRemote, SHOELACE_EXAMPLE } from '../core/remote.js';
import { DEVICES, store, StoreController } from '../core/store.js';
import { TEMPLATES } from '../core/templates.js';
import { findNode } from '../core/tree.js';
import { ui } from './styles.js';
import { nodeLabel } from './wb-canvas.js';
import './wb-screen-view.js';

type ExportFormat = 'lit' | 'html' | 'theme' | 'json';

/** All modal dialogs, driven by `store.ui.dialog`. */
export class WbDialogs extends LitElement {
  static properties = {
    format: { state: true },
    exportScreen: { state: true },
    blockName: { state: true },
    replace: { state: true },
    remote: { state: true },
    busy: { state: true },
  };
  readonly storeController = new StoreController(this);
  private format: ExportFormat = 'lit';
  private exportScreen = '';
  private blockName = '';
  private replace = true;
  private remote = { name: '', moduleUrl: '', manifestUrl: '', stylesheetUrl: '', tagPrefix: '' };
  private busy = false;
  private templatePreviews: Screen[] | null = null;
  private unsub?: () => void;

  static styles = [
    ui,
    css`
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 100;
        background: rgb(15 23 42 / 0.32);
        display: grid;
        place-items: center;
        padding: 24px;
        animation: fade 0.12s ease-out;
      }
      @keyframes fade {
        from {
          opacity: 0;
        }
      }
      .dialog {
        width: min(560px, 100%);
        max-height: calc(100vh - 48px);
        display: flex;
        flex-direction: column;
        background: #fff;
        border-radius: 14px;
        box-shadow: 0 24px 64px rgb(15 23 42 / 0.28);
        overflow: hidden;
        animation: pop 0.14s ease-out;
      }
      .dialog.wide {
        width: min(980px, 100%);
      }
      @keyframes pop {
        from {
          transform: scale(0.97);
          opacity: 0;
        }
      }
      header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 16px 18px 12px;
      }
      header h2 {
        margin: 0;
        font-size: 16px;
        font-weight: 650;
        flex: 1;
      }
      .content {
        padding: 4px 18px 18px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      footer {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding: 12px 18px;
        border-top: 1px solid var(--c-line);
        background: #fafbfc;
      }
      .desc {
        color: var(--c-muted);
        line-height: 1.5;
        margin: 0;
      }
      .templates {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 14px;
      }
      .tpl {
        border: 1px solid var(--c-line);
        border-radius: 12px;
        padding: 10px;
        cursor: pointer;
        background: #fff;
        text-align: left;
        display: flex;
        flex-direction: column;
        gap: 8px;
        transition: border-color 0.12s, box-shadow 0.12s;
      }
      .tpl:hover {
        border-color: var(--c-accent);
        box-shadow: 0 6px 18px rgb(79 70 229 / 0.14);
      }
      .tpl .mini {
        height: 230px;
        border-radius: 8px;
        overflow: clip;
        position: relative;
        border: 1px solid var(--c-line);
        background: #fff;
      }
      .tpl .mini wb-screen-view {
        position: absolute;
        top: 0;
        left: 0;
        transform-origin: top left;
        pointer-events: none;
      }
      .tpl b {
        font-size: 13px;
      }
      .tpl span {
        font-size: 11.5px;
        color: var(--c-muted);
        line-height: 1.4;
      }
      .row {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      label.check {
        display: flex;
        gap: 8px;
        align-items: center;
        color: var(--c-muted);
        cursor: pointer;
      }
      .export-bar {
        display: flex;
        gap: 10px;
        align-items: center;
        flex-wrap: wrap;
      }
      .export-bar select {
        width: auto;
      }
      pre {
        margin: 0;
        padding: 14px 16px;
        border-radius: 10px;
        background: #0f172a;
        color: #e2e8f0;
        font: 12px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        overflow: auto;
        max-height: 52vh;
        tab-size: 2;
      }
      .path {
        font: 12px ui-monospace, SFMono-Regular, Menlo, monospace;
        color: var(--c-muted);
      }
      .libs {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .lib {
        display: flex;
        gap: 12px;
        align-items: center;
        padding: 10px 12px;
        border: 1px solid var(--c-line);
        border-radius: 10px;
      }
      .lib .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex: none;
      }
      .lib .meta {
        flex: 1;
        min-width: 0;
      }
      .lib .meta b {
        font-size: 13px;
      }
      .lib .meta div {
        font-size: 12px;
        color: var(--c-muted);
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .lib .err {
        color: var(--c-danger);
      }
      .form {
        display: grid;
        grid-template-columns: 130px 1fr;
        gap: 8px 10px;
        align-items: center;
      }
      .form label {
        color: var(--c-muted);
        font-weight: 500;
      }
      details {
        border: 1px solid var(--c-line);
        border-radius: 10px;
        padding: 10px 12px;
      }
      details summary {
        cursor: pointer;
        font-weight: 600;
      }
      details ol {
        margin: 8px 0 0;
        padding-left: 18px;
        color: var(--c-muted);
        line-height: 1.6;
      }
      code {
        font: 12px ui-monospace, SFMono-Regular, Menlo, monospace;
        background: var(--c-hover);
        padding: 1px 4px;
        border-radius: 4px;
      }
      .keys {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px 16px;
        align-items: center;
      }
      .keys span:nth-child(odd) {
        color: var(--c-muted);
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.unsub = registry.subscribe(() => this.requestUpdate());
    window.addEventListener('keydown', this.onKey);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unsub?.();
    window.removeEventListener('keydown', this.onKey);
  }

  private onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && store.ui.dialog) {
      e.preventDefault();
      this.close();
    }
  };

  private close = () => store.setUI({ dialog: null });

  private shell(title: string, ic: string, body: TemplateResult, foot?: TemplateResult, wide = false) {
    return html`<div class="backdrop" @pointerdown=${(e: Event) => e.target === e.currentTarget && this.close()}>
      <div class="dialog ${wide ? 'wide' : ''}" role="dialog" aria-label=${title}>
        <header>
          ${icon(ic, 18)}
          <h2>${title}</h2>
          <button class="icon-btn" title="Close (Esc)" @click=${this.close}>${icon('x', 16)}</button>
        </header>
        <div class="content">${body}</div>
        ${foot ? html`<footer>${foot}</footer>` : nothing}
      </div>
    </div>`;
  }

  protected willUpdate() {
    if (store.ui.dialog === 'new-screen' && !this.templatePreviews) {
      this.templatePreviews = TEMPLATES.map((t) => ({ id: t.id, ...t.build() }));
    }
    if (store.ui.dialog !== 'new-screen') this.templatePreviews = null;
  }

  protected updated(changed: Map<string, unknown>) {
    super.updated(changed);
    const auto = this.renderRoot.querySelector<HTMLInputElement>('[autofocus]');
    if (auto && !this.matches(':focus-within')) auto.focus();
  }

  render() {
    switch (store.ui.dialog) {
      case 'new-screen':
        return this.renderNewScreen();
      case 'save-block':
        return this.renderSaveBlock();
      case 'export':
        return this.renderExport();
      case 'libraries':
        return this.renderLibraries();
      case 'shortcuts':
        return this.renderShortcuts();
      default:
        return nothing;
    }
  }

  // ---------- new screen ----------

  private renderNewScreen() {
    const dev = DEVICES[store.ui.device];
    const w = 150 - 22;
    const scale = w / dev.width;
    return this.shell(
      'New screen',
      'layout-template',
      html`<p class="desc">Start from a pattern your app already uses. Everything stays editable, and the project theme applies automatically.</p>
        <div class="templates">
          ${TEMPLATES.map(
            (t, i) => html`<button
              class="tpl"
              @click=${() => {
                actions.addScreen(t.id);
                this.close();
              }}
            >
              <div class="mini">
                <wb-screen-view
                  style="width:${dev.width}px;height:${dev.height}px;transform:scale(${scale})"
                  .screen=${this.templatePreviews?.[i]}
                  .blocks=${store.project.blocks}
                  .theme=${store.project.theme}
                  mode="static"
                ></wb-screen-view>
              </div>
              <b>${t.name}</b>
              <span>${t.description}</span>
            </button>`,
          )}
        </div>`,
      undefined,
      true,
    );
  }

  // ---------- save as block ----------

  private renderSaveBlock() {
    const found = store.ui.selectedId ? findNode(store.doc, store.ui.selectedId) : null;
    if (!found) return nothing;
    const save = () => {
      actions.saveAsBlock(this.blockName || nodeLabel(found.node), this.replace);
      this.blockName = '';
      this.close();
    };
    return this.shell(
      'Save as block',
      'component',
      html`<p class="desc">
          Blocks are reusable pieces you compose once, like a status header, an account summary or a help footer. They appear in the palette for every screen.
          Editing a block updates all its uses.
        </p>
        <input
          type="text"
          autofocus
          placeholder=${nodeLabel(found.node)}
          .value=${this.blockName}
          @input=${(e: Event) => (this.blockName = (e.target as HTMLInputElement).value)}
          @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && save()}
        />
        <label class="check"><input type="checkbox" .checked=${this.replace} @change=${(e: Event) => (this.replace = (e.target as HTMLInputElement).checked)} /> Replace the selection with a linked use of the block</label>`,
      html`<button class="btn" @click=${this.close}>Cancel</button><button class="btn primary" @click=${save}>${icon('component', 14)} Save block</button>`,
    );
  }

  // ---------- export ----------

  private exportFile(project: Project): GeneratedFile {
    const screen = project.screens.find((s) => s.id === (this.exportScreen || store.screen?.id)) ?? project.screens[0];
    switch (this.format) {
      case 'html':
        return generateHtml(screen, project, true);
      case 'theme':
        return generateTheme(project);
      case 'json':
        return { path: 'screen-builder.project.json', content: JSON.stringify(project, null, 2), language: 'json' };
      default:
        return generateLit(screen, project);
    }
  }

  private async copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      store.toast('Copied to clipboard');
    } catch {
      store.toast('Copy failed. Select the code and copy it manually.');
    }
  }

  private download(file: GeneratedFile) {
    const blob = new Blob([file.content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = file.path.split('/').pop()!;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  private async writeToRepo() {
    const project = store.project;
    const files = generateAll(project);
    this.busy = true;
    try {
      const res = await fetch('/__builder/export', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ files }) });
      if (!res.ok) throw new Error(await res.text());
      const { dir, count } = await res.json();
      store.toast(`Wrote ${count} files to ${dir}/`);
    } catch (err) {
      store.toast(`Export failed: ${(err as Error).message}`);
    } finally {
      this.busy = false;
    }
  }

  private importJson() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const project = JSON.parse(await file.text()) as Project;
        if (!Array.isArray(project.screens)) throw new Error('Not a Screen Builder project');
        store.replaceProject(project);
        this.close();
        store.toast(`Imported "${project.name}"`);
      } catch (err) {
        store.toast(`Import failed: ${(err as Error).message}`);
      }
    };
    input.click();
  }

  private renderExport() {
    const project = store.project;
    const file = this.exportFile(project);
    const tabs: [ExportFormat, string][] = [
      ['lit', 'Lit component'],
      ['html', 'HTML page'],
      ['theme', 'theme.css'],
      ['json', 'Project JSON'],
    ];
    const perScreen = this.format === 'lit' || this.format === 'html';
    return this.shell(
      'Export',
      'code',
      html`<div class="export-bar">
          <div class="seg" style="flex:1">
            ${tabs.map(([f, label]) => html`<button class=${this.format === f ? 'on' : ''} @click=${() => (this.format = f)}>${label}</button>`)}
          </div>
          ${perScreen
            ? html`<select @change=${(e: Event) => (this.exportScreen = (e.target as HTMLSelectElement).value)}>
                ${project.screens.map((s) => html`<option value=${s.id} ?selected=${s.id === (this.exportScreen || store.screen?.id)}>${s.name}</option>`)}
              </select>`
            : nothing}
        </div>
        <div class="row" style="justify-content:space-between">
          <span class="path">${file.path}</span>
          <span class="row">
            <button class="btn sm" @click=${() => this.copy(file.content)}>${icon('copy', 13)} Copy</button>
            <button class="btn sm" @click=${() => this.download(file)}>${icon('download', 13)} Download</button>
          </span>
        </div>
        <pre>${file.content}</pre>
        <p class="desc" style="font-size:12px">
          ${this.format === 'lit'
            ? html`Lit source for this repo. <b>Write all screens to repo</b> also produces compiled screens with their local dependencies included.`
            : this.format === 'json'
              ? 'The whole project: screens, blocks and theme. Commit it, share it or import it elsewhere.'
              : this.format === 'theme'
                ? 'Design tokens used by the components. Load once per webview.'
                : 'Use with the files produced by Write all screens to repo. Open the HTML pages through a local web server.'}
        </p>`,
      html`<button class="btn" @click=${() => this.importJson()}>${icon('upload', 14)} Import project…</button>
        <span style="flex:1"></span>
        ${store.hasRepoStorage
          ? html`<button class="btn primary" ?disabled=${this.busy} @click=${() => this.writeToRepo()} title="Writes Lit source, compiled screens, HTML pages and dependencies to ./generated">
              ${icon('folder-output', 14)} Write all screens to repo
            </button>`
          : nothing}`,
      true,
    );
  }

  // ---------- libraries ----------

  private toggleLib(id: string, on: boolean) {
    store.update((p) => {
      p.disabledLibraries = on ? p.disabledLibraries.filter((x) => x !== id) : [...new Set([...p.disabledLibraries, id])];
    });
  }

  private async addRemote() {
    const r = this.remote;
    if (!r.name || !r.moduleUrl || !r.manifestUrl) {
      store.toast('Name, module URL and manifest URL are required.');
      return;
    }
    const lib: RemoteLibrary = { id: `remote-${uid('')}`, name: r.name, moduleUrl: r.moduleUrl, manifestUrl: r.manifestUrl, stylesheetUrl: r.stylesheetUrl || undefined, tagPrefix: r.tagPrefix || undefined, enabled: true };
    this.busy = true;
    await registerRemote(lib);
    this.busy = false;
    const err = registry.error(lib.id);
    if (err) {
      registry.unregister(lib.id);
      store.toast(`Could not load library: ${err}`);
      return;
    }
    store.update((p) => {
      p.remoteLibraries.push(lib);
    });
    store.toast(`Added ${lib.name}: ${registry.components(lib.id).length} components`);
    this.remote = { name: '', moduleUrl: '', manifestUrl: '', stylesheetUrl: '', tagPrefix: '' };
  }

  private removeRemote(id: string) {
    registry.unregister(id);
    store.update((p) => {
      p.remoteLibraries = p.remoteLibraries.filter((l) => l.id !== id);
    });
  }

  private renderLibraries() {
    const disabled = new Set(store.project.disabledLibraries);
    const input = (key: keyof WbDialogs['remote'], placeholder: string) =>
      html`<input type="text" placeholder=${placeholder} .value=${this.remote[key]} @input=${(e: Event) => (this.remote = { ...this.remote, [key]: (e.target as HTMLInputElement).value })} />`;
    return this.shell(
      'Component libraries',
      'library',
      html`<p class="desc">Libraries supply the components in the palette. Switch them on or off per project, or add one from a URL.</p>
        <div class="libs">
          ${registry.libraries().map((l) => {
            const count = registry.components(l.id).length;
            const err = registry.error(l.id);
            const on = !disabled.has(l.id);
            return html`<div class="lib">
              <span class="dot" style="background:${l.color}"></span>
              <div class="meta">
                <b>${l.name}</b> <span class="chip" style="background:var(--c-hover);color:var(--c-muted)">${l.source}</span>
                <div class=${err ? 'err' : ''}>${err ? `Failed: ${err}` : `${count} components · ${l.description}`}</div>
              </div>
              ${l.source === 'remote' ? html`<button class="icon-btn" title="Remove" @click=${() => this.removeRemote(l.id)}>${icon('trash-2', 15)}</button>` : nothing}
              ${l.id !== 'layout' ? html`<label class="check" title="Show in palette"><input type="checkbox" .checked=${on} @change=${(e: Event) => this.toggleLib(l.id, (e.target as HTMLInputElement).checked)} /></label>` : nothing}
            </div>`;
          })}
        </div>
        <details>
          <summary>Add a library from a URL</summary>
          <p class="desc" style="margin:8px 0">
            Needs an ES module that defines the elements and a <code>custom-elements.json</code> manifest. End the module URL with <code>/</code> to load each component's
            own module.
          </p>
          <div class="form">
            <label>Name</label>${input('name', 'e.g. ing-web (CDN build)')} <label>Module URL</label>${input('moduleUrl', 'https://…/index.js or https://…/dist/')}
            <label>Manifest URL</label>${input('manifestUrl', 'https://…/custom-elements.json')} <label>Stylesheet URL</label>${input('stylesheetUrl', 'optional theme CSS')}
            <label>Tag prefix</label>${input('tagPrefix', 'optional, e.g. ing-')}
          </div>
          <div class="row" style="margin-top:10px;justify-content:flex-end">
            <button class="btn sm ghost" @click=${() => (this.remote = { ...SHOELACE_EXAMPLE })}>Fill example (Shoelace)</button>
            <button class="btn sm primary" ?disabled=${this.busy} @click=${() => this.addRemote()}>${this.busy ? 'Loading…' : 'Add library'}</button>
          </div>
        </details>
        <details>
          <summary>Add ing-web or your own components in code</summary>
          <ol>
            <li><b>ing-web</b>: follow the steps in <code>src/libraries/ing-web/index.ts</code>. Slim its manifest with <code>scripts/slim-manifest.mjs</code> and it maps automatically, just like Lion.</li>
            <li><b>Team components</b>: write a Lit element in <code>src/libraries/custom/</code> and describe its props in <code>custom/index.ts</code>. It hot-reloads into the palette.</li>
            <li><b>No code</b>: compose components on the canvas and use <b>Save as block</b>.</li>
          </ol>
        </details>`,
      html`<button class="btn primary" @click=${this.close}>Done</button>`,
    );
  }

  private renderShortcuts() {
    const rows: [string, TemplateResult][] = [
      ['Insert a component', html`click it in the palette`],
      ['Edit text', html`double-click on canvas`],
      ['Delete', html`<kbd>Del</kbd> / <kbd>Backspace</kbd>`],
      ['Duplicate', html`<kbd>Ctrl</kbd> <kbd>D</kbd>`],
      ['Copy / paste (across screens)', html`<kbd>Ctrl</kbd> <kbd>C</kbd> / <kbd>V</kbd>`],
      ['Move up / down', html`<kbd>Alt</kbd> <kbd>↑</kbd> / <kbd>↓</kbd>`],
      ['Select parent', html`<kbd>Esc</kbd>`],
      ['Undo / redo', html`<kbd>Ctrl</kbd> <kbd>Z</kbd> / <kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>Z</kbd>`],
      ['Toggle preview', html`<kbd>P</kbd>`],
      ['Search components', html`<kbd>/</kbd>`],
      ['Previous / next screen', html`<kbd>[</kbd> / <kbd>]</kbd>`],
    ];
    return this.shell('Keyboard shortcuts', 'keyboard', html`<div class="keys">${rows.map(([a, b]) => html`<span>${a}</span><span>${b}</span>`)}</div>`);
  }
}
customElements.define('wb-dialogs', WbDialogs);
