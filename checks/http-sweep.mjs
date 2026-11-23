// Run: node --experimental-vm-modules checks/http-sweep.mjs
// Invoke the real HTTP server's request handler in-process when sandbox policy forbids listen().
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { Writable } from 'node:stream';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

let handler;
const context = createContext({ console, process, URL });
const entry = new SourceTextModule(await readFile(new URL('../serve.ts', import.meta.url), 'utf8'), {
  context, identifier: new URL('../serve.ts', import.meta.url).href,
  initializeImportMeta(meta) { meta.url = new URL('../serve.ts', import.meta.url).href; },
});
await entry.link(async (name) => {
  const exports = name === 'node:http' ? { createServer(callback) {
    handler = callback;
    return { on() {}, listen() {} };
  } } : await import(name);
  return new SyntheticModule(Object.keys(exports), function () {
    for (const key of Object.keys(exports)) this.setExport(key, exports[key]);
  }, { context });
});
await entry.evaluate();
const files = [];
async function walk(directory, prefix = '') {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (item.isDirectory()) await walk(resolve(directory, item.name), prefix + item.name + '/');
    else files.push('/' + prefix + item.name);
  }
}
await walk(fileURLToPath(new URL('../game/', import.meta.url)));
for (const url of ['/', ...files, ...['bridge', 'face', 'drive', 'start'].map((shot) => '/?shot=' + shot)]) {
  const response = new Writable({ write(chunk, encoding, done) { done(); } });
  response.writeHead = (status, headers) => { response.status = status; response.headers = headers; return response; };
  const finished = once(response, 'finish');
  await handler({ method: 'GET', url }, response);
  await finished;
  assert.equal(response.status, 200, url);
  assert(Number(response.headers['Content-Length']) > 0, url + ' has content');
}
console.log(`HTTP 200 PASS: ${files.length + 5} routes through the real serve.ts handler (in-process; sandbox forbids port binding).`);
