import { describe, expect, it } from 'vitest';
import { fromManifest, propFromType, type CemManifest } from '../src/core/cem.js';
import lionManifest from '../src/libraries/lion/lion.manifest.json';

describe('custom elements manifest import', () => {
  it('maps CEM types to editor controls', () => {
    expect(propFromType('boolean')).toEqual({ type: 'boolean' });
    expect(propFromType('string | undefined')).toEqual({ type: 'text' });
    expect(propFromType('number')).toEqual({ type: 'number' });
    expect(propFromType("'primary' | 'secondary'")).toEqual({ type: 'select', options: [{ value: 'primary' }, { value: 'secondary' }] });
    expect(propFromType('Validator[]')).toBeNull();
  });

  it('builds curated defs from a manifest', () => {
    const manifest: CemManifest = {
      modules: [
        {
          path: 'src/x-card.js',
          declarations: [
            {
              tagName: 'x-card',
              customElement: true,
              description: 'A card.',
              attributes: [
                { name: 'heading', type: { text: 'string' }, default: "'Hello'" },
                { name: 'variant', type: { text: "'flat' | 'raised'" }, default: "'flat'" },
                { name: 'focused', type: { text: 'boolean' } },
                { name: 'items', type: { text: 'Item[]' } },
              ],
              slots: [{ name: '' }],
            },
          ],
          exports: [{ kind: 'custom-element-definition', name: 'x-card' }],
        },
      ],
    };
    const [def] = fromManifest(manifest, { library: 'x', importPath: (t) => `x/${t}.js`, load: () => async () => {} });
    expect(def.type).toBe('x/x-card');
    expect(def.importPath).toBe('x/x-card.js');
    // Slots remain editable containers; internal state and complex types are dropped.
    expect(def.props.map((p) => p.name)).toEqual(['text', 'heading', 'variant']);
    expect(def.props.find((p) => p.name === 'heading')!.default).toBe('Hello');
    expect(def.props.find((p) => p.name === 'variant')!.type).toBe('select');
    expect(def.container?.slot).toBe('default');
  });

  it('reads the bundled Lion manifest', () => {
    const defs = fromManifest(lionManifest as unknown as CemManifest, {
      library: 'lion',
      include: ['lion-input'],
      importPath: (t) => `@lion/ui/define/${t}.js`,
      load: () => async () => {},
    });
    const names = defs[0].props.map((p) => p.name);
    expect(names).toContain('label');
    expect(names).toContain('help-text');
    expect(names).not.toContain('focused');
  });
});
