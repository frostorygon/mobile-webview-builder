import { describe, expect, it } from 'vitest';
import type { Node } from '../src/core/model.js';
import { BODY, FOOTER } from '../src/core/model.js';
import { duplicateNode, findNode, insertNode, isWithin, moveNode, nudgeNode, removeNode, type Doc } from '../src/core/tree.js';

const leaf = (id: string): Node => ({ id, type: 'kit/text', props: {} });
const box = (id: string, children: Node[]): Node => ({ id, type: 'layout/stack', props: {}, slots: { default: children } });

function doc(): Doc {
  return { [BODY]: [leaf('a'), box('s', [leaf('b'), leaf('c')]), leaf('d')], [FOOTER]: [leaf('f')] };
}
const ids = (list: Node[]) => list.map((n) => n.id);

describe('tree', () => {
  it('finds nested nodes with their location', () => {
    const d = doc();
    const hit = findNode(d, 'c')!;
    expect(hit.parentId).toBe('s');
    expect(hit.slot).toBe('default');
    expect(hit.index).toBe(1);
  });

  it('inserts into regions and containers, clamping the index', () => {
    const d = doc();
    insertNode(d, { parentId: 's', slot: 'default', index: Infinity }, leaf('x'));
    insertNode(d, { parentId: FOOTER, slot: 'default', index: 0 }, leaf('y'));
    expect(ids(d[BODY][1].slots!.default)).toEqual(['b', 'c', 'x']);
    expect(ids(d[FOOTER])).toEqual(['y', 'f']);
  });

  it('moves later within the same list without an off-by-one', () => {
    const d = doc();
    // Drop "a" between "s" and "d" (index 2 in the original list).
    moveNode(d, 'a', { parentId: BODY, slot: 'default', index: 2 });
    expect(ids(d[BODY])).toEqual(['s', 'a', 'd']);
  });

  it('moves across regions', () => {
    const d = doc();
    moveNode(d, 'b', { parentId: FOOTER, slot: 'default', index: 1 });
    expect(ids(d[FOOTER])).toEqual(['f', 'b']);
    expect(ids(d[BODY][1].slots!.default)).toEqual(['c']);
  });

  it('refuses to move a container into itself', () => {
    const d = doc();
    expect(isWithin(d, 's', 'c')).toBe(true);
    expect(moveNode(d, 's', { parentId: 's', slot: 'default', index: 0 })).toBe(false);
    expect(ids(d[BODY])).toEqual(['a', 's', 'd']);
  });

  it('duplicates with fresh ids, removes and nudges', () => {
    const d = doc();
    const copy = duplicateNode(d, 's')!;
    expect(copy.id).not.toBe('s');
    expect(copy.slots!.default[0].id).not.toBe('b');
    expect(d[BODY]).toHaveLength(4);
    removeNode(d, copy.id);
    nudgeNode(d, 'd', -1);
    expect(ids(d[BODY])).toEqual(['a', 'd', 's']);
  });
});
