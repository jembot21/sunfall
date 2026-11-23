// Socket-free real WebGL check: node checks/browser.mjs [--headless]
// Chromium talks CDP over inherited pipes. Screenshot bytes go to stdout, never to source files.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const browser = spawn('/usr/bin/chromium', [
  '--remote-debugging-pipe', '--no-sandbox', '--disable-dev-shm-usage',
  '--disable-breakpad', '--disable-crash-reporter', '--disable-crashpad', '--no-zygote', '--single-process', '--in-process-gpu',
  '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
  '--disable-component-update', '--disable-features=MediaRouter', '--allow-file-access-from-files',
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1100,760',
  `--user-data-dir=${fileURLToPath(new URL('./.browser-profile', import.meta.url))}`,
  ...(process.argv.includes('--headless') ? ['--headless=new'] : []), 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'], env: { ...process.env, DISPLAY: process.env.DISPLAY || ':1' } });
let buffer = '';
let stderr = '';
let nextId = 0;
const pending = new Map();
const errors = [];
function fail(message) {
  for (const request of pending.values()) { clearTimeout(request.timeout); request.reject(new Error(message)); }
  pending.clear();
}
browser.stderr.on('data', (data) => { stderr = (stderr + data.toString()).slice(-3500); });
browser.on('error', (error) => fail(error.message));
browser.on('exit', (code) => fail(`Chromium exited (${code}): ${stderr}`));
browser.stdio[3].on('error', (error) => fail(`${error.message}: ${stderr}`));
browser.stdio[4].on('data', (data) => {
  buffer += data.toString();
  let end;
  while ((end = buffer.indexOf('\0')) !== -1) {
    const message = JSON.parse(buffer.slice(0, end));
    buffer = buffer.slice(end + 1);
    if (message.id && pending.has(message.id)) {
      const request = pending.get(message.id);
      pending.delete(message.id);
      clearTimeout(request.timeout);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') {
      errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    } else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      errors.push(message.params.args.map((arg) => arg.value ?? arg.description).join(' '));
    }
  }
});
function call(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timed out: ${stderr}`)); }, 20000);
    pending.set(id, { resolve, reject, timeout });
    browser.stdio[3].write(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }) + '\0');
  });
}

try {
  const version = await call('Browser.getVersion');
  const { targetId } = await call('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await call('Target.attachToTarget', { targetId, flatten: true });
  await call('Page.enable', {}, sessionId);
  await call('Runtime.enable', {}, sessionId);
  await call('Emulation.setDeviceMetricsOverride', { width: 984, height: 628, deviceScaleFactor: 1, mobile: false }, sessionId);
  const url = new URL('../game/index.html?shot=air-one&seed=1337', import.meta.url).href;
  await call('Page.navigate', { url }, sessionId);
  let ready = false;
  for (let i = 0; i < 120; i += 1) {
    const result = await call('Runtime.evaluate', { expression: 'Boolean(window.__shotReady)', returnByValue: true }, sessionId);
    if (result.result.value) { ready = true; break; }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error(`Game did not render: ${errors.join('\n')}`);
  const state = await call('Runtime.evaluate', { expression: `(() => {
    const g = window.__sunfall;
    return { stars: g.police.stars, helicopter: Boolean(g.police.helicopter),
      spotlight: g.police.helicopter?.cone.visible, liveUnits: g.police.units.length,
      panelUnits: document.querySelectorAll('#unit-list [data-unit]').length,
      renderer: g.renderer.info.render, canvas: [g.renderer.domElement.width, g.renderer.domElement.height] };
  })()`, returnByValue: true }, sessionId);
  if (errors.length) throw new Error(errors.join('\n'));
  if (state.result.value.stars !== 3 || !state.result.value.helicopter || !state.result.value.spotlight
    || state.result.value.liveUnits !== state.result.value.panelUnits) throw new Error('Rendered police response failed: ' + JSON.stringify(state.result.value));
  const screenshot = await call('Page.captureScreenshot', { format: 'jpeg', quality: 40 }, sessionId);
  console.log(JSON.stringify({ ok: true, browser: version.product, state: state.result.value, image: screenshot.data }));
} catch (error) {
  console.log(JSON.stringify({ ok: false, error: error.message }));
  process.exitCode = 1;
} finally {
  try { await call('Browser.close'); } catch { browser.kill('SIGTERM'); }
}
