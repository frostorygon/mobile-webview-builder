import { BODY, FOOTER, type BlockDef, type DropTarget, type Node, type Screen, uid } from './model.js';
import { containerSlots, registry } from './registry.js';

/**
 * A document is a set of named top-level regions holding node lists.
 * Screens have `@body` and `@footer`; a block being edited has a single `@root`.
 * All operations mutate in place: the store clones before calling them.
 */
export type Doc = Record<string, Node[]>;

export const ROOT = '@root';

export function screenDoc(screen: Screen): Doc {
  return { [BODY]: screen.body, [FOOTER]: screen.footer };
}

export function blockDoc(block: BlockDef): Doc {
  return { [ROOT]: [block.root] };
}

export interface Located {
  node: Node;
  parentId: string;
  slot: string;
  index: number;
  list: Node[];
}

export function childList(doc: Doc, parentId: string, slot: string): Node[] | undefined {
  if (parentId in doc) return doc[parentId];
  const found = findNode(doc, parentId);
  if (!found) return undefined;
  const n = found.node;
  if (!n.slots) {
    const slots = containerSlots(registry.get(n.type));
    if (!slots.includes(slot)) return undefined;
    n.slots = Object.fromEntries(slots.map((name) => [name, []]));
  }
  if (!n.slots[slot]) n.slots[slot] = [];
  return n.slots[slot];
}

export function findNode(doc: Doc, id: string): Located | null {
  for (const [regionId, list] of Object.entries(doc)) {
    const hit = findIn(list, id, regionId, 'default');
    if (hit) return hit;
  }
  return null;
}

function findIn(list: Node[], id: string, parentId: string, slot: string): Located | null {
  for (let i = 0; i < list.length; i++) {
    const node = list[i];
    if (node.id === id) return { node, parentId, slot, index: i, list };
    if (node.slots) {
      for (const [slotName, children] of Object.entries(node.slots)) {
        const hit = findIn(children, id, node.id, slotName);
        if (hit) return hit;
      }
    }
  }
  return null;
}

export function walk(list: Node[], fn: (node: Node, depth: number) => void, depth = 0): void {
  for (const node of list) {
    fn(node, depth);
    if (node.slots) for (const children of Object.values(node.slots)) walk(children, fn, depth + 1);
  }
}

export function allNodes(doc: Doc): Node[] {
  const out: Node[] = [];
  for (const list of Object.values(doc)) walk(list, (n) => out.push(n));
  return out;
}

/** Ancestor chain from the region down to (and including) the node. */
export function ancestry(doc: Doc, id: string): Node[] {
  const chain: Node[] = [];
  let cur = findNode(doc, id);
  while (cur) {
    chain.unshift(cur.node);
    if (cur.parentId in doc) break;
    cur = findNode(doc, cur.parentId);
  }
  return chain;
}

/** True if `id` is `ancestorId` or lies inside it. */
export function isWithin(doc: Doc, ancestorId: string, id: string): boolean {
  if (ancestorId === id) return true;
  const anc = findNode(doc, ancestorId);
  if (!anc) return false;
  let hit = false;
  if (anc.node.slots) for (const c of Object.values(anc.node.slots)) walk(c, (n) => (hit ||= n.id === id));
  return hit;
}

export function insertNode(doc: Doc, target: DropTarget, node: Node): boolean {
  const list = childList(doc, target.parentId, target.slot);
  if (!list) return false;
  const index = Math.max(0, Math.min(target.index, list.length));
  list.splice(index, 0, node);
  return true;
}

export function removeNode(doc: Doc, id: string): Node | null {
  const found = findNode(doc, id);
  if (!found) return null;
  found.list.splice(found.index, 1);
  return found.node;
}

/** Moves a node, correcting the index when moving later within the same list. */
export function moveNode(doc: Doc, id: string, target: DropTarget): boolean {
  const found = findNode(doc, id);
  if (!found) return false;
  // Never into itself or its own subtree (isWithin is true for the node itself).
  if (!(target.parentId in doc) && isWithin(doc, id, target.parentId)) return false;
  if (!childList(doc, target.parentId, target.slot)) return false;
  const sameList = found.parentId === target.parentId && found.slot === target.slot;
  let index = target.index;
  if (sameList && found.index < index) index -= 1;
  if (sameList && found.index === index) return false;
  found.list.splice(found.index, 1);
  return insertNode(doc, { ...target, index }, found.node);
}

export function cloneWithNewIds(node: Node): Node {
  const copy: Node = structuredClone(node);
  const reassign = (n: Node) => {
    n.id = uid();
    if (n.slots) for (const c of Object.values(n.slots)) c.forEach(reassign);
  };
  reassign(copy);
  return copy;
}

export function duplicateNode(doc: Doc, id: string): Node | null {
  const found = findNode(doc, id);
  if (!found) return null;
  const copy = cloneWithNewIds(found.node);
  found.list.splice(found.index + 1, 0, copy);
  return copy;
}

/** Moves a node one step up or down among its siblings. */
export function nudgeNode(doc: Doc, id: string, delta: -1 | 1): boolean {
  const found = findNode(doc, id);
  if (!found) return false;
  const to = found.index + delta;
  if (to < 0 || to >= found.list.length) return false;
  found.list.splice(found.index, 1);
  found.list.splice(to, 0, found.node);
  return true;
}
