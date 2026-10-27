import { BLOCK_TYPE, createInstance, detachInstance, wouldCreateCycle, wouldCycle } from './blocks.js';
import type { DragPayload } from './dnd.js';
import type { BlockDef, DropTarget, Node, PropValue, Screen, ScreenSettings, Theme } from './model.js';
import { BODY, uid } from './model.js';
import { containerSlots, createNode, registry, type ComponentDef } from './registry.js';
import { store } from './store.js';
import { screenFromTemplate } from './templates.js';
import { ROOT, childList, cloneWithNewIds, duplicateNode, findNode, insertNode, moveNode, nudgeNode, removeNode, type Doc } from './tree.js';

/** High-level editing operations shared by the canvas, panels and keyboard shortcuts. */

function nodeFor(payload: DragPayload): Node | null {
  if (payload.kind === 'new') {
    const def = registry.get(payload.type);
    return def ? createNode(def) : null;
  }
  if (payload.kind === 'block') {
    const block = store.project.blocks.find((b) => b.id === payload.blockId);
    if (!block) return null;
    const editing = store.block;
    if (editing && wouldCycle(block.id, editing.id, store.project.blocks)) {
      store.toast('A block cannot contain itself.');
      return null;
    }
    return createInstance(block);
  }
  return null;
}

export function canDropInto(target: DropTarget): boolean {
  return target.parentId !== ROOT;
}

export function insertionSlot(nodeId: string, def: ComponentDef): string {
  const selected = store.ui.insertionSlot;
  return selected?.nodeId === nodeId && containerSlots(def).includes(selected.slot) ? selected.slot : def.container!.slot;
}

function canInsert(node: Node): boolean {
  if (store.block && wouldCreateCycle(node, store.block.id, store.project.blocks)) {
    store.toast('A block cannot contain itself.');
    return false;
  }
  return true;
}

/** Where a click-to-insert should land, based on the current selection. */
export function insertionPoint(doc: Doc): DropTarget {
  const sel = store.ui.selectedId ? findNode(doc, store.ui.selectedId) : null;
  if (sel) {
    const def = registry.get(sel.node.type);
    if (def?.container && sel.node.type !== BLOCK_TYPE) return { parentId: sel.node.id, slot: insertionSlot(sel.node.id, def), index: Infinity };
    if (sel.parentId !== ROOT) return { parentId: sel.parentId, slot: sel.slot, index: sel.index + 1 };
  }
  if (store.ui.target.kind === 'block') {
    const root = doc[ROOT]?.[0];
    const def = root && registry.get(root.type);
    if (root && def?.container) return { parentId: root.id, slot: insertionSlot(root.id, def), index: Infinity };
  }
  return { parentId: BODY, slot: 'default', index: Infinity };
}

export function drop(payload: DragPayload, target: DropTarget) {
  if (!canDropInto(target)) return;
  if (payload.kind === 'move') {
    if (findNode(store.doc, payload.nodeId)?.parentId === ROOT) return; // a block's root stays put
    let moved = false;
    store.update((_p, doc) => {
      moved = moveNode(doc, payload.nodeId, target);
    });
    if (moved) store.select(payload.nodeId);
    return;
  }
  const node = nodeFor(payload);
  if (!node || !canInsert(node)) return;
  store.update((_p, doc) => {
    insertNode(doc, target, node);
  });
  store.select(node.id);
}

export function insert(payload: DragPayload) {
  if (store.ui.mode !== 'edit') store.setUI({ mode: 'edit' });
  const target = insertionPoint(store.doc);
  if (!childList(store.doc, target.parentId, target.slot)) {
    store.toast('Select a container to insert into.');
    return;
  }
  drop(payload, target);
}

export function removeSelected() {
  const id = store.ui.selectedId;
  if (!id) return;
  const found = findNode(store.doc, id);
  if (!found || found.parentId === ROOT) return;
  const next = found.list[found.index + 1] ?? found.list[found.index - 1];
  store.update((_p, doc) => {
    removeNode(doc, id);
  });
  store.select(next?.id ?? (found.parentId.startsWith('@') ? null : found.parentId));
}

export function duplicateSelected() {
  const id = store.ui.selectedId;
  if (!id) return;
  const found = findNode(store.doc, id);
  if (!found || found.parentId === ROOT) return;
  let copy: Node | null = null;
  store.update((_p, doc) => {
    copy = duplicateNode(doc, id);
  });
  if (copy) store.select((copy as Node).id);
}

export function nudgeSelected(delta: -1 | 1) {
  const id = store.ui.selectedId;
  if (!id) return;
  const found = findNode(store.doc, id);
  if (!found) return;
  const to = found.index + delta;
  if (to < 0 || to >= found.list.length) return;
  store.update((_p, doc) => {
    nudgeNode(doc, id, delta);
  });
}

export function selectParent() {
  const id = store.ui.selectedId;
  if (!id) return;
  const found = findNode(store.doc, id);
  store.select(found && !found.parentId.startsWith('@') ? found.parentId : null);
}

let clipboard: Node | null = null;

export function copySelected() {
  const found = store.ui.selectedId ? findNode(store.doc, store.ui.selectedId) : null;
  if (!found) return false;
  clipboard = structuredClone(found.node);
  store.toast('Copied. Paste on any screen with Ctrl+V.');
  return true;
}

export function paste() {
  if (!clipboard) return;
  const node = cloneWithNewIds(clipboard);
  if (!canInsert(node)) return;
  const target = insertionPoint(store.doc);
  if (!canDropInto(target)) return;
  store.update((_p, doc) => {
    insertNode(doc, target, node);
  });
  store.select(node.id);
}

export function setProp(nodeId: string, name: string, value: PropValue) {
  store.update((_p, doc) => {
    const found = findNode(doc, nodeId);
    if (found) found.node.props[name] = value;
  }, `prop:${nodeId}:${name}`);
}

export function setOverride(instanceId: string, innerId: string, name: string, value: PropValue | undefined) {
  store.update((_p, doc) => {
    const found = findNode(doc, instanceId);
    if (!found) return;
    const o = (found.node.overrides ??= {});
    const props = (o[innerId] ??= {});
    if (value === undefined) delete props[name];
    else props[name] = value;
    if (!Object.keys(props).length) delete o[innerId];
  }, `override:${instanceId}:${innerId}:${name}`);
}

export function setLink(nodeId: string, screenId: string | null) {
  store.update((_p, doc) => {
    const found = findNode(doc, nodeId);
    if (found) found.node.link = screenId;
  });
}

// ---------- blocks ----------

export function saveAsBlock(name: string, replaceWithInstance: boolean): BlockDef | null {
  const id = store.ui.selectedId;
  const found = id ? findNode(store.doc, id) : null;
  if (!found) return null;
  const block: BlockDef = { id: uid('b'), name: name.trim() || 'Untitled block', root: cloneWithNewIds(found.node), icon: registry.get(found.node.type)?.icon };
  block.root.link = null;
  const instance = createInstance(block);
  instance.props.$grow = found.node.props.$grow ?? null;
  instance.props.$align = found.node.props.$align ?? null;
  instance.link = found.node.link ?? null;
  store.update((p, doc) => {
    p.blocks.push(block);
    if (replaceWithInstance) {
      const f = findNode(doc, found.node.id);
      if (f) f.list.splice(f.index, 1, instance);
    }
  });
  if (replaceWithInstance) store.select(instance.id);
  store.toast(`Saved "${block.name}". Find it under Blocks in the palette.`);
  return block;
}

export function detachSelected() {
  const id = store.ui.selectedId;
  const found = id ? findNode(store.doc, id) : null;
  if (!found || found.node.type !== BLOCK_TYPE) return;
  const copy = detachInstance(found.node, store.project.blocks);
  if (!copy) return;
  store.update((_p, doc) => {
    const f = findNode(doc, found.node.id);
    if (f) f.list.splice(f.index, 1, copy);
  });
  store.select(copy.id);
}

export function renameBlock(blockId: string, name: string) {
  store.update((p) => {
    const b = p.blocks.find((x) => x.id === blockId);
    if (b) b.name = name;
  }, `block-name:${blockId}`);
}

export function deleteBlock(blockId: string) {
  // Instances are detached first so screens keep their content.
  store.update((p) => {
    const detachAll = (list: Node[]) => {
      for (let i = 0; i < list.length; i++) {
        const node = list[i];
        if (node.type === BLOCK_TYPE && node.props.blockId === blockId) {
          const copy = detachInstance(node, p.blocks);
          if (copy) list[i] = copy;
        } else if (node.slots) Object.values(node.slots).forEach(detachAll);
      }
    };
    p.screens.forEach((s) => {
      detachAll(s.body);
      detachAll(s.footer);
    });
    p.blocks.forEach((b) => b.id !== blockId && detachAll([b.root]));
    p.blocks = p.blocks.filter((b) => b.id !== blockId);
  });
  if (store.ui.target.kind === 'block' && store.ui.target.id === blockId) store.closeBlock();
  store.repairUI();
}

// ---------- screens ----------

export function addScreen(templateId: string) {
  const screen = screenFromTemplate(templateId);
  const names = new Set(store.project.screens.map((s) => s.name));
  let name = screen.name;
  for (let i = 2; names.has(name); i++) name = `${screen.name} ${i}`;
  screen.name = name;
  const at = store.project.screens.findIndex((s) => s.id === store.screen?.id) + 1;
  store.update((p) => {
    p.screens.splice(at || p.screens.length, 0, screen);
  });
  store.openScreen(screen.id);
}

export function duplicateScreen(id: string) {
  const src = store.project.screens.find((s) => s.id === id);
  if (!src) return;
  const copy: Screen = structuredClone(src);
  copy.id = uid('s');
  const base = `${src.name} copy`;
  const names = new Set(store.project.screens.map((s) => s.name));
  copy.name = base;
  for (let i = 2; names.has(copy.name); i++) copy.name = `${base} ${i}`;
  copy.body = copy.body.map(cloneWithNewIds);
  copy.footer = copy.footer.map(cloneWithNewIds);
  store.update((p) => {
    p.screens.splice(p.screens.findIndex((s) => s.id === id) + 1, 0, copy);
  });
  store.openScreen(copy.id);
}

export function deleteScreen(id: string) {
  if (store.project.screens.length <= 1) {
    store.toast('A project needs at least one screen.');
    return;
  }
  const idx = store.project.screens.findIndex((s) => s.id === id);
  store.update((p) => {
    p.screens = p.screens.filter((s) => s.id !== id);
  });
  store.openScreen(store.project.screens[Math.max(0, idx - 1)].id);
  store.toast('Screen deleted. Ctrl+Z to undo.');
}

export function moveScreen(id: string, delta: -1 | 1) {
  store.update((p) => {
    const i = p.screens.findIndex((s) => s.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= p.screens.length) return;
    const [s] = p.screens.splice(i, 1);
    p.screens.splice(j, 0, s);
  });
}

export function renameScreen(id: string, name: string) {
  store.update((p) => {
    const s = p.screens.find((x) => x.id === id);
    if (s) s.name = name;
  }, `screen-name:${id}`);
}

export function setScreenSetting<K extends keyof ScreenSettings>(id: string, key: K, value: ScreenSettings[K]) {
  store.update((p) => {
    const s = p.screens.find((x) => x.id === id);
    if (s) s.settings[key] = value;
  }, `screen:${id}:${key}`);
}

export function setTheme(patch: Partial<Theme>, coalesce = 'theme') {
  store.update((p) => {
    p.theme = { ...p.theme, ...patch };
  }, coalesce);
}
