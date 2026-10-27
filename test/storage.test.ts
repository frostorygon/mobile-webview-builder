import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { defaultScreenSettings, type Project } from '../src/core/model.js';
import { defaultTheme } from '../src/core/theme.js';

const storageKey = 'screen-builder.project.v1';
const project = (name = 'Sample project'): Project => ({
  version: 1, name, theme: defaultTheme(),
  screens: [{ id: 'sample', name: 'Sample', settings: defaultScreenSettings(), body: [], footer: [] }],
  blocks: [], remoteLibraries: [], disabledLibraries: [],
});

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  localStorage.clear();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  localStorage.clear();
});

it('restores and saves hosted projects in the browser without probing or writing to the local API', async () => {
  vi.stubEnv('DEV', false);
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  localStorage.setItem(storageKey, JSON.stringify(project('Browser project')));
  const { store } = await import('../src/core/store.js');
  await store.load(project);
  expect(store.project.name).toBe('Browser project');
  expect(store.ui.storage).toBe('browser');
  expect(store.hasRepoStorage).toBe(false);
  store.project.name = 'Saved browser project';
  await store.save();
  await store.load(project);
  expect(store.project.name).toBe('Saved browser project');
  expect(fetchMock).not.toHaveBeenCalled();
});

it.each([
  ['HTML fallback', '<!doctype html><title>Builder</title>', 'text/html'],
  ['malformed JSON', '{broken', 'application/json'],
])('does not enable repo writes after a successful %s response', async (_label, body, contentType) => {
  vi.stubEnv('DEV', true);
  const fetchMock = vi.fn().mockResolvedValue(new Response(body, { headers: { 'content-type': contentType } }));
  vi.stubGlobal('fetch', fetchMock);
  const { store } = await import('../src/core/store.js');
  await store.load(project);
  await store.save();
  expect(store.hasRepoStorage).toBe(false);
  expect(store.ui.storage).toBe('browser');
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(JSON.parse(localStorage.getItem(storageKey)!).name).toBe('Sample project');
});

it('keeps local repo storage available when the JSON endpoint has no saved project yet', async () => {
  vi.stubEnv('DEV', true);
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(new Response('', { headers: { 'content-type': 'application/json; charset=utf-8' } }))
    .mockResolvedValue(new Response('ok'));
  vi.stubGlobal('fetch', fetchMock);
  const { store } = await import('../src/core/store.js');
  await store.load(project);
  expect(store.hasRepoStorage).toBe(true);
  expect(store.ui.storage).toBe('repo');
  await store.save();
  expect(fetchMock).toHaveBeenLastCalledWith('/__builder/project', expect.objectContaining({ method: 'PUT' }));
});
