import { beforeEach, describe, expect, it } from 'vitest';
import { render } from 'lit';
import { copySelected, duplicateScreen, insertionPoint, paste } from '../src/core/actions.js';
import { createInstance, wouldCycle } from '../src/core/blocks.js';
import { fromManifest } from '../src/core/cem.js';
import { generateAll, generateHtml, generateLit } from '../src/core/codegen.js';
import { createNode, n, registry } from '../src/core/registry.js';
import { renderNode } from '../src/core/render.js';
import { store } from '../src/core/store.js';
import { seedProject } from '../src/core/templates.js';
import { layoutLibrary } from '../src/libraries/layout.js';
import { mobileKit } from '../src/libraries/mobile-kit/index.js';
import { customLibrary } from '../src/libraries/custom/index.js';

beforeEach(async () => {
  await Promise.all([layoutLibrary, mobileKit, customLibrary].map((lib) => registry.register(lib)));
  store.project = seedProject();
  store.openScreen(store.project.screens[0].id);
});

describe('block cycle protection', () => {
  it('rejects a copied instance nested in a pasted container without changing the project', () => {
    const block = store.project.blocks[0];
    const wrapper = n('layout/stack', {}, [createInstance(block)]);
    store.project.screens[0].body = [wrapper];
    store.select(wrapper.id);
    copySelected();
    store.openBlock(block.id);
    const before = JSON.stringify(store.project);
    paste();
    expect(JSON.stringify(store.project)).toBe(before);
    expect(store.ui.toast).toBe('A block cannot contain itself.');
  });

  it('handles imported circular blocks in rendering, export, and cycle queries', () => {
    const block = store.project.blocks[0];
    block.root.slots!.default.push(createInstance(block));
    const instance = createInstance(block);
    store.project.screens[0].body = [instance];
    const host = document.createElement('div');
    render(renderNode(instance, { mode: 'static', blocks: store.project.blocks }), host);
    expect(host.textContent).toContain('Circular block reference');
    expect(generateLit(store.project.screens[0], store.project).content).toContain('circular block reference');
    expect(wouldCycle(block.id, 'unrelated', store.project.blocks)).toBe(false);
  });
});

describe('screen identity', () => {
  it('gives repeated duplicates distinct display names', () => {
    const id = store.project.screens[0].id;
    duplicateScreen(id);
    duplicateScreen(id);
    const names = store.project.screens.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('avoids normalized name collisions and routes to the right export', () => {
    const [first, second, reserved] = store.project.screens;
    first.name = 'A!'; second.name = 'A'; reserved.name = 'A 2';
    first.body = [n('kit/button')];
    first.body[0].link = second.id;
    const files = generateAll(store.project);
    expect(new Set(files.map((f) => f.path)).size).toBe(files.length);
    expect(generateLit(first, store.project).content).toContain("this.navigate('a-3')");
    expect(generateLit(second, store.project).path).toBe('screens/screen-a-3.ts');
    expect(generateHtml(first, store.project, true).content).toContain('"a-3":"a-3.html"');
  });
});

describe('manifest child slots', () => {
  it('inserts into named slots and preserves them in live DOM and exports', async () => {
    const [def] = fromManifest({ modules: [{ path: 'card.js', declarations: [{
      tagName: 'test-card', slots: [{ name: '' }, { name: 'header' }, { name: 'footer' }],
    }] }] }, { library: 'test', importPath: () => undefined, load: () => async () => {} });
    await registry.register({ id: 'test', name: 'Test', badge: 'Test', color: '#000', description: '', source: 'code', components: () => [def] });
    const node = createNode(def);
    store.project.screens[0].body = [node];
    store.select(node.id);
    store.setUI({ insertionSlot: { nodeId: node.id, slot: 'header' } });
    expect(insertionPoint(store.doc)).toEqual({ parentId: node.id, slot: 'header', index: Infinity });
    node.slots!.header.push(n('kit/heading', { text: 'Header' }));
    node.slots!.default.push(n('kit/text', { text: 'Content' }));
    node.slots!.footer.push(n('kit/button', { label: 'Footer' }));
    const host = document.createElement('div');
    render(renderNode(node, { mode: 'static', blocks: [] }), host);
    expect(host.querySelector('mk-heading')?.getAttribute('slot')).toBe('header');
    expect(host.querySelector('mk-text')?.hasAttribute('slot')).toBe(false);
    expect(host.querySelector('mk-button')?.getAttribute('slot')).toBe('footer');
    for (const output of [generateLit(store.project.screens[0], store.project), generateHtml(store.project.screens[0], store.project)]) {
      expect(output.content).toContain('slot="header">Header');
      expect(output.content).toContain('slot="footer">Footer');
      expect(output.content).toContain('Content');
    }
  });
});

it('preserves explicitly cleared custom component attributes in both export formats', () => {
  const screen = store.project.screens[0];
  screen.body = [n('custom/promo-card', { heading: '', text: '', cta: '' })];
  for (const file of [generateLit(screen, store.project), generateHtml(screen, store.project)]) {
    expect(file.content).toContain('heading="" text="" cta=""');
  }
});
