// Real Chromium/WebGL verification over CDP pipes; no listening socket is needed.
// Run: node checks/session5-browser.mjs [--headless] [--images]
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const browser = spawn('/usr/bin/chromium', [
  '--remote-debugging-pipe', '--no-sandbox', '--disable-dev-shm-usage',
  '--disable-breakpad', '--disable-crash-reporter', '--disable-crashpad-for-testing', '--no-zygote', '--single-process', '--in-process-gpu',
  '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-component-update',
  '--disable-features=MediaRouter', '--allow-file-access-from-files', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--window-size=1200,800', `--user-data-dir=${fileURLToPath(new URL('./.browser-profile', import.meta.url))}`,
  ...(process.argv.includes('--headless') ? ['--headless=new'] : []), 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'], env: { ...process.env, DISPLAY: process.env.DISPLAY || ':1' } });
let buffer = '';
let stderr = '';
let id = 0;
const pending = new Map();
const errors = [];
let documentLoads = 0;
function fail(message) {
  for (const request of pending.values()) { clearTimeout(request.timeout); request.reject(new Error(message)); }
  pending.clear();
}
browser.stderr.on('data', (data) => { stderr = (stderr + data.toString()).slice(-2500); });
browser.on('error', (error) => fail(error.message));
browser.on('exit', (code) => fail(`Chromium exited ${code}: ${stderr}`));
browser.stdio[3].on('error', (error) => fail(`${error.message}: ${stderr}`));
browser.stdio[4].on('error', (error) => fail(`${error.message}: ${stderr}`));
browser.stdio[4].on('data', (data) => {
  buffer += data.toString();
  let end;
  while ((end = buffer.indexOf('\0')) !== -1) {
    const message = JSON.parse(buffer.slice(0, end));
    buffer = buffer.slice(end + 1);
    if (message.method === 'Page.domContentEventFired') documentLoads += 1;
    if (pending.has(message.id)) {
      const request = pending.get(message.id);
      pending.delete(message.id);
      clearTimeout(request.timeout);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args.map((arg) => arg.value ?? arg.description).join(' '));
  }
});
function call(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const key = ++id;
    const timeout = setTimeout(() => { pending.delete(key); reject(new Error(`${method} timed out: ${stderr}`)); }, 20000);
    pending.set(key, { resolve, reject, timeout });
    browser.stdio[3].write(JSON.stringify({ id: key, method, params, ...(sessionId ? { sessionId } : {}) }) + '\0');
  });
}

try {
  const { targetId } = await call('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await call('Target.attachToTarget', { targetId, flatten: true });
  await call('Page.enable', {}, sessionId);
  await call('Runtime.enable', {}, sessionId);
  await call('Emulation.setDeviceMetricsOverride', { width: 1100, height: 720, deviceScaleFactor: 1, mobile: false }, sessionId);
  async function evaluate(expression) {
    const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  }
  const base = new URL('../game/index.html', import.meta.url);
  async function navigate(query = '') {
    const before = documentLoads;
    await call('Page.navigate', { url: base.href + query }, sessionId);
    for (let i = 0; i < 200; i += 1) {
      if (documentLoads > before && await evaluate(query ? 'Boolean(window.__shotReady)' : 'Boolean(window.__sunfall)')) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error('Game did not initialize: ' + errors.join('\n'));
  }
  await navigate();
  await evaluate(`localStorage.removeItem('sunfall.save.v1'); document.getElementById('start-button').click();`);
  await evaluate(`(() => {
    const g = window.__sunfall;
    g.weapons.select(3);
    g.player.position.set(-7, 0, 58);
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 500));
  assert(await evaluate('window.__sunfall.weapons.owned.has("carbine")'));
  const beforeReload = documentLoads;
  await call('Page.reload', {}, sessionId);
  for (let i = 0; i < 100; i += 1) {
    if (documentLoads > beforeReload && await evaluate('Boolean(window.__sunfall && !document.getElementById("continue-button").hidden)')) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const continued = await evaluate(`(() => {
    document.getElementById('continue-button').click();
    const g = window.__sunfall;
    return { owned: [...g.weapons.owned], cash: g.cash, mode: g.mode };
  })()`);
  assert(continued.owned.includes('carbine'));
  assert.equal(continued.cash, 50);
  assert.equal(continued.mode, 'play');

  const shots = {};
  for (const mode of ['bridge', 'face', 'drive', 'start']) {
    await navigate('?shot=' + mode + '&seed=1');
    const state = await evaluate(`(() => {
      const g = window.__sunfall;
      const map = document.getElementById('minimap');
      const bounds = map.getBoundingClientRect();
      return { mode: g.mode, seed: g.seed, time: g.elapsed, stars: g.police.stars,
        speed: document.getElementById('speed-value').textContent,
        speedVisible: !document.getElementById('speedometer').hidden,
        mission: g.missions.active?.index, objective: document.getElementById('objective-line').textContent,
        banner: document.getElementById('centre-banner').textContent,
        units: g.police.units.length, panelUnits: document.querySelectorAll('#unit-list [data-unit]').length,
        spotlight: Boolean(g.police.helicopter?.disc.visible),
        hotbar: document.querySelectorAll('.weapon-slot').length,
        crew: document.getElementById('crew-panel').innerText,
        map: [map.width, map.height, bounds.width, bounds.height],
        draws: g.renderer.info.render.calls };
    })()`);
    assert(state.draws > 0);
    assert.equal(state.hotbar, 3);
    assert(!/NaN/.test(state.speed));
    if (mode !== 'start') assert.deepEqual(state.map, [180, 180, 180, 180]);
    if (mode === 'bridge') {
      assert.equal(state.stars, 4);
      assert.equal(state.speed, '101');
      assert(state.speedVisible && state.spotlight && state.mission === 8);
      assert.equal(state.units, state.panelUnits);
      assert.match(state.banner, /LAST WAVE/);
      assert.match(state.crew, /WAITING AT BOAT/);
    }
    if (mode === 'drive') assert.equal(state.speed, '90');
    if (mode === 'start') assert.equal(state.mode, 'title');
    const capture = await call('Page.captureScreenshot', { format: 'jpeg', quality: 65 }, sessionId);
    const hash = createHash('sha256').update(capture.data).digest('hex');
    // A different seed parameter and frame count must produce the identical staged pixels.
    await navigate('?shot=' + mode + '&seed=98765');
    const repeated = await call('Page.captureScreenshot', { format: 'jpeg', quality: 65 }, sessionId);
    assert.equal(createHash('sha256').update(repeated.data).digest('hex'), hash, mode + ' screenshot is reproducible');
    shots[mode] = { state, hash, ...(process.argv.includes('--images') ? { image: capture.data } : {}) };
  }
  // Left-click reaches combat through the actual input event pipeline.
  await navigate();
  await evaluate(`document.getElementById('continue-button').click(); window.__sunfall.weapons.select(1);`);
  await new Promise((resolve) => setTimeout(resolve, 150));
  const clickState = await evaluate(`(() => {
    const g = window.__sunfall;
    g.player.position.set(-1170, 0, 430);
    g.player.rotation.y = 0;
    return g.peds.crimeEvents.length;
  })()`);
  await call('Input.dispatchMouseEvent', { type: 'mousePressed', x: 550, y: 350, button: 'left', clickCount: 1 }, sessionId);
  await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 550, y: 350, button: 'left', clickCount: 1 }, sessionId);
  await new Promise((resolve) => setTimeout(resolve, 250));
  assert.equal(await evaluate('window.__sunfall.peds.crimeEvents.length'), clickState);
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log(JSON.stringify({ ok: true, continued, shots, errors }));
} catch (error) {
  console.log(JSON.stringify({ ok: false, error: error.stack, browserErrors: errors }));
  process.exitCode = 1;
} finally {
  try { await call('Browser.close'); } catch { browser.kill('SIGTERM'); }
}
