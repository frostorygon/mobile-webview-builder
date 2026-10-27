import type { BlockDef, Node, Props } from './model.js';
import { uid } from './model.js';
import { walk } from './tree.js';

/**
 * Blocks are reusable compositions saved from the canvas. Placing one creates a linked
 * instance (`type: '@block'`): it renders the block's master tree, so editing the block
 * updates every screen that uses it. Instances can override props of inner nodes
 * (e.g. a different title) without unlinking.
 */

export const BLOCK_TYPE = '@block';

export function isInstance(node: Node): boolean {
  return node.type === BLOCK_TYPE;
}

export function createInstance(block: BlockDef): Node {
  return { id: uid(), type: BLOCK_TYPE, props: { blockId: block.id }, overrides: {} };
}

/** The master tree with this instance's overrides applied. Callers resolve nested instances. */
export function resolveInstance(node: Node, blocks: BlockDef[]): Node | null {
  const block = blocks.find((b) => b.id === node.props.blockId);
  if (!block) return null;
  const overrides = node.overrides ?? {};
  const apply = (n: Node): Node => {
    const props: Props = { ...n.props, ...overrides[n.id] };
    const out: Node = { ...n, props };
    if (n.slots) out.slots = Object.fromEntries(Object.entries(n.slots).map(([k, v]) => [k, v.map(apply)]));
    return out;
  };
  return apply(block.root);
}

/** Detaches an instance into a plain, editable copy with fresh ids. */
export function detachInstance(node: Node, blocks: BlockDef[]): Node | null {
  const resolved = resolveInstance(node, blocks);
  if (!resolved) return null;
  const copy = structuredClone(resolved);
  const fresh = (n: Node) => {
    n.id = uid();
    if (n.slots) Object.values(n.slots).forEach((list) => list.forEach(fresh));
  };
  fresh(copy);
  copy.link = node.link ?? copy.link;
  return copy;
}

/** How many instances of a block exist across the project's screens and other blocks. */
export function countInstances(blockId: string, lists: Node[][]): number {
  let count = 0;
  for (const list of lists) walk(list, (n) => (count += n.type === BLOCK_TYPE && n.props.blockId === blockId ? 1 : 0));
  return count;
}

/** True if putting `blockId` inside `intoBlockId` would create a cycle. */
export function wouldCycle(blockId: string, intoBlockId: string, blocks: BlockDef[], visited = new Set<string>()): boolean {
  if (blockId === intoBlockId) return true;
  if (visited.has(blockId)) return false;
  visited.add(blockId);
  const block = blocks.find((b) => b.id === blockId);
  if (!block) return false;
  let hit = false;
  walk([block.root], (n) => {
    if (n.type === BLOCK_TYPE && !hit) hit = wouldCycle(String(n.props.blockId), intoBlockId, blocks, visited);
  });
  return hit;
}

/** Checks every block reference in a pasted composition, including nested containers. */
export function wouldCreateCycle(node: Node, intoBlockId: string, blocks: BlockDef[]): boolean {
  let cycle = false;
  walk([node], (n) => {
    if (!cycle && n.type === BLOCK_TYPE) cycle = wouldCycle(String(n.props.blockId), intoBlockId, blocks);
  });
  return cycle;
}
