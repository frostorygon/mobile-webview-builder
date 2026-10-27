import { BLOCK_TYPE, resolveInstance } from './blocks.js';
import type { BlockDef, Node, Project, Props, Screen } from './model.js';
import { containerSlots, registry, type ComponentDef } from './registry.js';
import { pascal, screenSlug } from './screen-names.js';
export { kebab, pascal } from './screen-names.js';
import { positionStyle, textOf } from './render.js';
import { themeCss } from './theme.js';
import { LAYOUT_CSS } from '../libraries/layout.js';

/**
 * Generates code from screens. The output mirrors the canvas renderer: same elements,
 * same attributes, same layout classes, so a screen looks the same in the app.
 */

export interface GeneratedFile {
  path: string;
  content: string;
  language: 'typescript' | 'html' | 'css' | 'json';
}

type Flavor = 'lit' | 'html';

export const screenTag = (screen: Screen, screens: Screen[] = [screen]) => `screen-${screenSlug(screen, screens)}`;

const escText = (s: string, flavor: Flavor) => {
  const out = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return flavor === 'lit' ? out.replace(/`/g, '\\`').replace(/\$\{/g, '\\${') : out;
};
const escAttr = (s: string, flavor: Flavor) => escText(s, flavor).replace(/"/g, '&quot;');

function styleString(style: Record<string, string>): string {
  return Object.entries(style)
    .filter(([k, v]) => !(v === 'var(--mk-space-none)' || (k === 'align-items' && v === 'stretch') || (k === 'justify-content' && v === 'flex-start')))
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ');
}

function attrsFor(def: ComponentDef, props: Props, flavor: Flavor, omitDefaults: boolean): string[] {
  const out: string[] = [];
  for (const p of def.props) {
    if (p.binding === 'text') continue;
    const v = props[p.name] ?? p.default;
    if (v === null || v === undefined) continue;
    const attr = p.attribute ?? p.name;
    if (p.binding === 'property') {
      out.push(flavor === 'lit' ? `.${p.name}=\${${JSON.stringify(v)}}` : `${attr}="${escAttr(String(v), flavor)}"`);
      continue;
    }
    if (p.type === 'boolean') {
      if (v) out.push(attr);
      else if (p.default === true && flavor === 'lit') out.push(`.${p.name.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase())}=\${false}`);
      continue;
    }
    if (omitDefaults && v === p.default) continue;
    out.push(`${attr}="${escAttr(String(v), flavor)}"`);
  }
  return out;
}

interface GenCtx {
  flavor: Flavor;
  blocks: BlockDef[];
  screens: Screen[];
  imports: Set<string>;
  libraryCss: Set<string>;
  slot?: string;
  blockPath?: string[];
}

function linkAttr(node: Node, ctx: GenCtx): string | undefined {
  if (!node.link) return undefined;
  const target = ctx.screens.find((s) => s.id === node.link);
  if (!target) return undefined;
  return ctx.flavor === 'lit'
    ? `@click=\${() => this.navigate('${screenSlug(target, ctx.screens)}')}`
    : `data-navigate="${screenSlug(target, ctx.screens)}"`;
}

function genNode(node: Node, depth: number, ctx: GenCtx): string {
  const pad = '  '.repeat(depth);
  if (node.type === BLOCK_TYPE) {
    const blockId = String(node.props.blockId);
    if (ctx.blockPath?.includes(blockId)) return `${pad}<!-- circular block reference -->`;
    const block = ctx.blocks.find((b) => b.id === node.props.blockId);
    const resolved = resolveInstance(node, ctx.blocks);
    if (!resolved || !block) return `${pad}<!-- missing block -->`;
    resolved.props = { ...resolved.props, $grow: node.props.$grow ?? resolved.props.$grow, $align: node.props.$align ?? resolved.props.$align };
    resolved.link = node.link ?? resolved.link;
    return `${pad}<!-- Block: ${escText(block.name, ctx.flavor)} -->\n${genNode(resolved, depth, { ...ctx, blockPath: [...(ctx.blockPath ?? []), blockId] })}`;
  }

  const def = registry.get(node.type);
  if (!def) return `${pad}<!-- unknown component: ${node.type} -->`;
  const lib = registry.library(def.library);
  if (def.importPath) ctx.imports.add(def.importPath);
  if (lib?.css) ctx.libraryCss.add(lib.css);

  const attrs: string[] = [];
  let tag = def.tag;
  if (def.native) {
    tag = def.native.tag;
    attrs.push(`class="${def.native.className(node.props)}"`);
    const style = styleString({ ...def.native.style?.(node.props), ...positionStyle(node.props) });
    if (style) attrs.push(`style="${style}"`);
  } else {
    attrs.push(...attrsFor(def, node.props, ctx.flavor, Boolean(lib?.omitDefaults)));
    const style = styleString(positionStyle(node.props));
    if (style) attrs.push(`style="${style}"`);
  }
  if (ctx.slot) attrs.push(`slot="${escAttr(ctx.slot, ctx.flavor)}"`);
  const link = linkAttr(node, ctx);
  if (link) attrs.push(link);

  const open = `<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}>`;
  const close = `</${tag}>`;

  const parts: string[] = [];
  const title = def.native?.title?.(node.props);
  if (title) parts.push(`${pad}  <h3 class="l-section__title">${escText(title, ctx.flavor)}</h3>`);
  const text = def.native ? undefined : textOf(def, node.props);
  for (const slot of containerSlots(def)) {
    for (const child of node.slots?.[slot] ?? []) parts.push(genNode(child, depth + 1, { ...ctx, slot: slot === 'default' ? undefined : slot }));
  }

  if (!parts.length) return `${pad}${open}${text ? escText(text, ctx.flavor) : ''}${close}`;
  if (text) parts.unshift(`${pad}  ${escText(text, ctx.flavor)}`);
  return `${pad}${open}\n${parts.join('\n')}\n${pad}${close}`;
}

function genScreenMarkup(screen: Screen, depth: number, ctx: GenCtx): string {
  const pad = '  '.repeat(depth);
  const s = screen.settings;
  const lines: string[] = [];
  lines.push(`${pad}<div class="mk-screen${s.background === 'subtle' ? ' mk-screen--subtle' : ''}">`);
  if (s.navBar === 'web') {
    const btn = (kind: string) =>
      kind === 'none' ? '<span></span>' : `<button class="mk-screen__nav-btn" aria-label="${kind}"${ctx.flavor === 'lit' ? ` @click=\${() => this.nav('${kind}')}` : ''}>${NAV_ICON[kind] ?? ''}</button>`;
    lines.push(`${pad}  <header class="mk-screen__header">`);
    lines.push(`${pad}    ${btn(s.leading)}`);
    lines.push(`${pad}    <div class="mk-screen__title">${escText(s.title, ctx.flavor)}</div>`);
    lines.push(`${pad}    ${btn(s.trailing)}`);
    lines.push(`${pad}  </header>`);
  }
  lines.push(`${pad}  <main class="mk-screen__body${s.bodyAlign === 'center' ? ' mk-screen__body--center' : ''}">`);
  for (const n of screen.body) lines.push(genNode(n, depth + 2, ctx));
  lines.push(`${pad}  </main>`);
  if (screen.footer.length) {
    lines.push(`${pad}  <footer class="mk-screen__footer">`);
    for (const n of screen.footer) lines.push(genNode(n, depth + 2, ctx));
    lines.push(`${pad}  </footer>`);
  }
  lines.push(`${pad}</div>`);
  return lines.join('\n');
}

const NAV_ICON: Record<string, string> = {
  back: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>',
  close: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  help: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/></svg>',
  more: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 12h.01M19 12h.01M5 12h.01"/></svg>',
};

function indentCss(css: string, pad: string): string {
  return css
    .trim()
    .split('\n')
    .map((l) => (l.trim() ? pad + l.trim() : ''))
    .join('\n');
}

export function generateLit(screen: Screen, project: Project): GeneratedFile {
  const ctx: GenCtx = { flavor: 'lit', blocks: project.blocks, screens: project.screens, imports: new Set(), libraryCss: new Set() };
  const markup = genScreenMarkup(screen, 3, ctx);
  const cls = `Screen${pascal(screenSlug(screen, project.screens))}`;
  const tag = screenTag(screen, project.screens);
  const s = screen.settings;
  const css = [LAYOUT_CSS, ...ctx.libraryCss].map((c) => indentCss(c.replace(/`/g, '\\`'), '    ')).join('\n');
  const navNote =
    s.navBar === 'native'
      ? ` * Navigation bar: native. Pass \`screenTitle\` to the app bridge (${s.leading} / ${s.trailing}).`
      : s.navBar === 'web'
        ? ' * Navigation bar: rendered by this webview.'
        : ' * Navigation bar: none (full-screen).';

  const content = `import { LitElement, css, html } from 'lit';
${[...ctx.imports].sort().map((i) => `import '${i}';`).join('\n')}

/**
 * ${screen.name}
 * Generated by Screen Builder. Design tokens (--mk-*) come from theme.css.
${navNote}
 */
export class ${cls} extends LitElement {
  static screenTitle = ${JSON.stringify(s.title)};

  static styles = css\`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100%;
    }
    .mk-screen { flex: 1; }
${css}
  \`;

  render() {
    return html\`
${markup}
    \`;
  }

  /** Asks the host (router or app bridge) to open another screen. */
  protected navigate(screen: string) {
    this.dispatchEvent(new CustomEvent('navigate', { detail: { screen }, bubbles: true, composed: true }));
  }

  /** Navigation bar buttons of a web header. */
  protected nav(action: string) {
    this.dispatchEvent(new CustomEvent('nav-action', { detail: { action }, bubbles: true, composed: true }));
  }
}

customElements.define('${tag}', ${cls});
`;
  return { path: `screens/${tag}.ts`, content: content.replace(/\n{3,}/g, '\n\n'), language: 'typescript' };
}

export function generateHtml(screen: Screen, project: Project, compiled = false): GeneratedFile {
  const ctx: GenCtx = { flavor: 'html', blocks: project.blocks, screens: project.screens, imports: new Set(), libraryCss: new Set() };
  const markup = genScreenMarkup(screen, 2, ctx);
  const content = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${escText(screen.settings.title, 'html')}</title>
  <link rel="stylesheet" href="../theme.css" />
  <style>
    html, body { margin: 0; height: 100%; }
${[LAYOUT_CSS, ...ctx.libraryCss].map((c) => indentCss(c, '    ')).join('\n')}
  </style>
${compiled ? `  <script type="module" src="../screens/${screenTag(screen, project.screens)}.js"></script>` : [...ctx.imports].sort().map((i) => `  <script type="module" src="${i}"></script>`).join('\n')}
</head>
<body>
${compiled ? `  <${screenTag(screen, project.screens)}></${screenTag(screen, project.screens)}>` : markup}
${compiled ? `  <script>
    const routes = ${JSON.stringify(Object.fromEntries(project.screens.map((s) => [screenSlug(s, project.screens), `${screenSlug(s, project.screens)}.html`]))).replace(/</g, '\\u003c')};
    document.addEventListener('navigate', (event) => {
      const path = routes[event.detail?.screen];
      if (path) location.href = path;
    });
  </script>` : ''}
</body>
</html>
`;
  return { path: `html/${screenSlug(screen, project.screens)}.html`, content, language: 'html' };
}

export function generateTheme(project: Project): GeneratedFile {
  const stylesheets = [...new Set(registry.libraries().flatMap((lib) => lib.stylesheets ?? []))];
  return {
    path: 'theme.css',
    content: `${stylesheets.map((href) => `@import url(${JSON.stringify(href)});`).join('\n')}\n/* Design tokens generated by Screen Builder (theme: ${project.theme.preset}). */\n${themeCss(project.theme)}`,
    language: 'css',
  };
}

export function generateAll(project: Project): GeneratedFile[] {
  return [generateTheme(project), ...project.screens.flatMap((s) => [generateLit(s, project), generateHtml(s, project, true)])];
}
