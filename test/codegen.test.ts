import { beforeAll, describe, expect, it } from 'vitest';
import { createInstance, detachInstance, resolveInstance, wouldCycle } from '../src/core/blocks.js';
import { generateHtml, generateLit, kebab, pascal } from '../src/core/codegen.js';
import type { BlockDef, Project } from '../src/core/model.js';
import { n, registry } from '../src/core/registry.js';
import { seedProject } from '../src/core/templates.js';
import { customLibrary } from '../src/libraries/custom/index.js';
import { layoutLibrary } from '../src/libraries/layout.js';
import { mobileKit } from '../src/libraries/mobile-kit/index.js';

let project: Project;

beforeAll(async () => {
  await Promise.all([layoutLibrary, mobileKit, customLibrary].map((l) => registry.register(l)));
  project = seedProject();
});

describe('blocks', () => {
  it('applies instance overrides on top of the master', () => {
    const block = project.blocks[0];
    const title = block.root.slots!.default[1].slots!.default[0];
    const inst = createInstance(block);
    inst.overrides = { [title.id]: { text: 'Overridden' } };
    const resolved = resolveInstance(inst, project.blocks)!;
    expect(resolved.slots!.default[1].slots!.default[0].props.text).toBe('Overridden');
    // The master is untouched.
    expect(title.props.text).toBe('Title');
  });

  it('detaches into an editable copy with new ids', () => {
    const block = project.blocks[0];
    const copy = detachInstance(createInstance(block), project.blocks)!;
    expect(copy.type).toBe('layout/stack');
    expect(copy.id).not.toBe(block.root.id);
  });

  it('detects cycles', () => {
    const a: BlockDef = { id: 'a', name: 'A', root: n('layout/stack', {}, []) };
    const b: BlockDef = { id: 'b', name: 'B', root: n('layout/stack', {}, [createInstance(a)]) };
    // B already contains A: placing A inside B is fine, placing B inside A is a loop.
    expect(wouldCycle('a', 'b', [a, b])).toBe(false);
    expect(wouldCycle('b', 'a', [a, b])).toBe(true);
    expect(wouldCycle('a', 'a', [a, b])).toBe(true);
  });
});

describe('codegen', () => {
  it('names screens consistently', () => {
    expect(kebab('Transfer review')).toBe('transfer-review');
    expect(pascal('Transfer review')).toBe('TransferReview');
  });

  it('generates a Lit component with imports, inlined blocks and navigation', () => {
    const review = project.screens.find((s) => s.name === 'Transfer review')!;
    const file = generateLit(review, project);
    expect(file.path).toBe('screens/screen-transfer-review.ts');
    expect(file.content).toContain("import '../../src/libraries/mobile-kit/mk-button.js';");
    expect(file.content).toContain('export class ScreenTransferReview extends LitElement');
    expect(file.content).toContain("@click=${() => this.navigate('transfer-sent')}");
    expect(file.content).toContain("customElements.define('screen-transfer-review'");

    const sent = project.screens.find((s) => s.name === 'Transfer sent')!;
    const sentCode = generateLit(sent, project).content;
    expect(sentCode).toContain('<!-- Block: Status header -->');
    expect(sentCode).toContain('Money sent');
  });

  it('omits default attributes and escapes template syntax', () => {
    const screen = project.screens[0];
    screen.body = [n('kit/heading', { text: 'Price `${x}` <b>' }), n('kit/button', { label: 'Go', variant: 'secondary' })];
    const code = generateLit(screen, project).content;
    expect(code).toContain('<mk-heading>Price \\`\\${x}\\` &lt;b&gt;</mk-heading>');
    expect(code).toContain('<mk-button variant="secondary" block>Go</mk-button>');
    expect(generateHtml(screen, project).content).toContain('<mk-heading>Price `${x}` &lt;b&gt;</mk-heading>');
  });

  it('writes layout primitives as plain HTML with token spacing', () => {
    const screen = project.screens[0];
    screen.body = [n('layout/row', { gap: 'm', justify: 'between' }, [n('kit/text', { text: 'A' })])];
    const code = generateLit(screen, project).content;
    expect(code).toContain('<div class="l-row" style="gap: var(--mk-space-m); align-items: center; justify-content: space-between">');
  });
});
