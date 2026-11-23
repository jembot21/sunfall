// Run: node --experimental-vm-modules checks/dossier.mjs
// Validate the actual main.ts plumbing and dossier without creating output copies.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

const root = fileURLToPath(new URL('../', import.meta.url));
const copies = [];
let output;
const context = createContext({ process: { env: { MAKEFUN_OUTPUT_DIR: root } }, Buffer, URL, JSON });
const entry = new SourceTextModule(await readFile(new URL('../main.ts', import.meta.url), 'utf8'), {
  context, initializeImportMeta(meta) { meta.url = new URL('../main.ts', import.meta.url).href; },
});
await entry.link(async (name) => {
  const exports = name === 'node:fs' ? {
    ...fs, cpSync: (from, to) => copies.push([from, to]), mkdirSync() {},
    writeFileSync(path, bytes) { output = JSON.parse(bytes); },
  } : name.startsWith('./vendor/') ? await import('../vendor/makefun-game.ts') : await import(name);
  return new SyntheticModule(Object.keys(exports), function () {
    for (const key of Object.keys(exports)) this.setExport(key, exports[key]);
  }, { context });
});
await entry.evaluate();
assert.equal(copies.length, 2, 'game and screenshots are both copied');
assert.equal(output.schema, 'makefun/dossier/v1');
assert(output.images.length >= 3 && output.images.length <= 4);
assert(output.text.startsWith('# Sunfall'));
for (const text of ['Palma Strand', 'Port Solano', 'Old Market', 'The Flats', 'Marina District', 'Airstrip Heights', 'nine-mission', 'LAST WAVE', 'wanted system', 'Continue', 'Bay Carbine']) assert(output.text.includes(text), text);
assert(Buffer.byteLength(output.text) <= 163840);
assert.equal((await readdir(new URL('../vendor/', import.meta.url))).includes('makefun-game.ts'), true);
console.log('Dossier PASS: working vendored import, game/screenshots copy calls, truthful Sunfall summary and features, schema, images and text cap.');
