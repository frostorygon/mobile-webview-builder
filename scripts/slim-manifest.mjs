#!/usr/bin/env node
/**
 * Slims a Custom Elements Manifest (custom-elements.json) down to what the builder needs:
 * tag names, descriptions, public attributes, slots and the module that defines each tag.
 *
 *   node scripts/slim-manifest.mjs <input.json> <output.json> [--prefix=lion-] [--package=@lion/ui]
 *
 * Library manifests are often several MB (Lion's is ~6 MB). The slim version is a few KB
 * and is what the builder imports at runtime.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [input, output, ...flags] = process.argv.slice(2);
if (!input || !output) {
  console.error('usage: slim-manifest.mjs <input.json> <output.json> [--prefix=x-] [--package=name]');
  process.exit(1);
}
const opt = Object.fromEntries(flags.map((f) => f.replace(/^--/, '').split('=')));
const manifest = JSON.parse(readFileSync(input, 'utf8'));

// Which module path (re)exports the custom-element definition for each tag.
const definedIn = new Map();
for (const mod of manifest.modules ?? []) {
  for (const exp of mod.exports ?? []) {
    if (exp.kind === 'custom-element-definition') definedIn.set(exp.name, mod.path);
  }
}

const declarations = [];
for (const mod of manifest.modules ?? []) {
  for (const decl of mod.declarations ?? []) {
    const tag = decl.tagName?.replace(/`/g, '');
    if (!tag || !(decl.customElement || decl.tagName)) continue;
    if (opt.prefix && !tag.startsWith(opt.prefix)) continue;
    if (/test-suites|helpers\//.test(mod.path)) continue;
    const fields = new Map((decl.members ?? []).map((m) => [m.name, m]));
    declarations.push({
      kind: 'class',
      customElement: true,
      tagName: tag,
      name: decl.name,
      description: decl.description || decl.summary || undefined,
      attributes: (decl.attributes ?? []).map((a) => ({
        name: a.name,
        fieldName: a.fieldName,
        type: a.type ?? fields.get(a.fieldName)?.type,
        default: a.default ?? fields.get(a.fieldName)?.default,
        description: a.description || undefined,
      })),
      slots: decl.slots,
      definedIn: definedIn.get(tag),
    });
  }
}

const slim = {
  schemaVersion: manifest.schemaVersion,
  package: opt.package,
  modules: [{ kind: 'javascript-module', path: 'slim', declarations }],
};
writeFileSync(output, JSON.stringify(slim, null, 1));
console.log(`Wrote ${declarations.length} custom elements to ${output}`);
