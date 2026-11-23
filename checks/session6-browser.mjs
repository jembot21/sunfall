// Real HTTP/WebGL acceptance checks, without taking or rereading any screenshots.
// SUNFALL_CHROME=/path/to/chrome-headless-shell node checks/session6-browser.mjs
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const profile = fileURLToPath(new URL('./.browser-profile/session6/', import.meta.url));
const browser = spawn(process.env.SUNFALL_CHROME || '/usr/bin/chromium', [
  '--headless', '--remote-debugging-pipe', '--no-sandbox', '--disable-dev-shm-usage',
  '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
  '--disable-component-update', '--disable-features=MediaRouter',
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars',
  '--window-size=1280,720', '--force-device-scale-factor=1',
  `--user-data-dir=${profile}`, `--disk-cache-dir=${profile}cache`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] });
let buffer = '';
let stderr = '';
let id = 0;
const pending = new Map();
const errors = [];
function fail(message) {
  for (const request of pending.values()) { clearTimeout(request.timeout); request.reject(new Error(message)); }
  pending.clear();
}
browser.stderr.on('data', data => { stderr = (stderr + data).slice(-3000); });
browser.on('error', error => fail(error.message));
browser.on('exit', code => fail(`Chrome exited ${code}: ${stderr}`));
for (const pipe of [browser.stdio[3], browser.stdio[4]]) pipe.on('error', error => fail(error.message));
browser.stdio[4].on('data', data => {
  buffer += data.toString();
  let end;
  while ((end = buffer.indexOf('\0')) !== -1) {
    const message = JSON.parse(buffer.slice(0, end));
    buffer = buffer.slice(end + 1);
    if (pending.has(message.id)) {
      const request = pending.get(message.id);
      pending.delete(message.id);
      clearTimeout(request.timeout);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') {
      errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    } else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      errors.push(message.params.args.map(arg => arg.value || arg.description).join(' '));
    }
  }
});
function call(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const key = ++id;
    const timeout = setTimeout(() => { pending.delete(key); reject(new Error(`${method} timed out: ${stderr}`)); }, 30000);
    pending.set(key, { resolve, reject, timeout });
    browser.stdio[3].write(JSON.stringify({ id: key, method, params, ...(sessionId ? { sessionId } : {}) }) + '\0');
  });
}
try {
  const { targetId } = await call('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await call('Target.attachToTarget', { targetId, flatten: true });
  await call('Page.enable', {}, sessionId);
  await call('Runtime.enable', {}, sessionId);
  await call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false }, sessionId);
  async function evaluate(expression) {
    const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }
  async function navigate(query = '') {
    await call('Page.navigate', { url: 'http://localhost:8080/' + query }, sessionId);
    for (let i = 0; i < 300; i += 1) {
      if (await evaluate(query ? 'Boolean(window.__shotReady)' : 'Boolean(window.__sunfall && window.__sunfall.renderer.info.render.calls)')) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Sunfall did not render: ' + errors.join('\n'));
  }
  const shots = {};
  for (const mode of ['bridge', 'face', 'drive', 'start']) {
    await navigate(`?shot=${mode}&seed=1`);
    const state = await evaluate(`(() => {
      const g = window.__sunfall;
      const T = window.THREE;
      g.scene.updateMatrixWorld(true);
      g.camera.updateMatrixWorld(true);
      function bounds(object) {
        const box = new T.Box3().setFromObject(object);
        const points = [];
        for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
          const p = new T.Vector3(x, y, z).project(g.camera);
          points.push([(p.x + 1) * 640, (1 - p.y) * 360]);
        }
        return [Math.min(...points.map(p => p[0])), Math.min(...points.map(p => p[1])),
          Math.max(...points.map(p => p[0])), Math.max(...points.map(p => p[1]))].map(Math.round);
      }
      const map = document.getElementById('minimap');
      const mapBounds = map.getBoundingClientRect();
      const invalid = [];
      g.scene.traverse(o => {
        if (![...o.position.toArray(), ...o.scale.toArray(), o.rotation.x, o.rotation.y, o.rotation.z].every(Number.isFinite)) invalid.push(o.name);
      });
      return { mode: g.mode, viewport: [innerWidth, innerHeight], canvas: [g.renderer.domElement.width, g.renderer.domElement.height],
        draws: g.renderer.info.render.calls, invalid, nan: /NaN|Infinity/.test(document.body.innerText),
        speed: document.getElementById('speed-value').textContent, speedVisible: !document.getElementById('speedometer').hidden,
        stars: g.police.stars, hotbar: document.querySelectorAll('.weapon-slot').length,
        banner: document.getElementById('centre-banner').textContent, crew: document.getElementById('crew-panel').innerText,
        units: g.police.units.length, listedUnits: document.querySelectorAll('#unit-list [data-unit]').length,
        map: [map.width, map.height, mapBounds.width, mapBounds.height],
        hero: bounds(g.vehicles.hero.mesh), roadblock: g.missions.blockers.map(u => bounds(u.mesh)),
        helicopter: g.police.helicopter ? bounds(g.police.helicopter.model) : null,
        pool: g.police.helicopter ? g.police.helicopter.disc.position.distanceTo(g.player.position) : null,
        spotlight: Boolean(g.police.helicopter?.spotlight.visible),
        faces: ${JSON.stringify(mode)} === 'face' ? [g.player, ...g.peds.all.slice(5, 8).map(p => p.figure)].map(f => bounds(f.getObjectByName('head'))) : [],
        traffic: ${JSON.stringify(mode)} === 'drive' ? g.vehicles.traffic.slice(0, 5).map(c => bounds(c.mesh)) : [],
        dressing: ['toll-spike-strip', 'toll-escape-gap', 'roadblock-escape-gap', 'marina-moored-boat'].every(name => Boolean(g.world.getObjectByName(name))) };
    })()`);
    assert.deepEqual(state.viewport, [1280, 720]);
    assert.deepEqual(state.canvas, [1280, 720]);
    assert(state.draws > 0 && !state.nan && !state.invalid.length && state.dressing);
    assert.equal(state.hotbar, 3);
    if (mode !== 'start') assert.deepEqual(state.map, [180, 180, 180, 180]);
    if (mode === 'bridge') {
      assert.equal(state.stars, 4);
      assert.equal(state.speed, '101');
      assert(state.speedVisible && state.spotlight && state.pool < 0.3);
      assert.match(state.banner, /LAST WAVE/);
      assert.match(state.crew, /WAITING AT BOAT/);
      assert.equal(state.units, state.listedUnits);
      assert.equal(state.roadblock.length, 2);
      for (const rect of state.roadblock) assert(rect[2] - rect[0] >= 25 && rect[0] > 235 && rect[2] < 995 && rect[1] > 90 && rect[3] < 540);
      assert(state.hero[2] - state.hero[0] > 110);
      assert(state.helicopter[0] > 235 && state.helicopter[2] < 995 && state.helicopter[1] >= 0 && state.helicopter[3] < 190);
    }
    if (mode === 'face') for (const rect of state.faces) assert(rect[2] - rect[0] >= 45 && rect[0] > 235 && rect[2] < 995 && rect[1] > 100 && rect[3] < 540);
    if (mode === 'drive') {
      assert.equal(state.speed, '90');
      assert(state.traffic.filter(rect => rect[0] > 235 && rect[2] < 995 && rect[1] > 0 && rect[3] < 540).length >= 3);
    }
    if (mode === 'start') assert.equal(state.mode, 'title');
    shots[mode] = state;
  }
  await navigate();
  await evaluate('document.getElementById("start-button").click()');
  await new Promise(resolve => setTimeout(resolve, 500));
  assert.equal(await evaluate('window.__sunfall.mode'), 'play');
  const obstacles = await evaluate(`(() => {
    const g = window.__sunfall;
    const fixed = ['toll-spike-strip', 'toll-escape-gap', 'roadblock-escape-gap', 'marina-moored-boat'].every(name => g.world.getObjectByName(name).visible);
    g.missions.start(8);
    const positions = g.missions.blockers.map(u => u.position.toArray());
    g.police.update(0.5, null);
    return { fixed, positions, after: g.missions.blockers.map(u => u.position.toArray()), boatOwner: g.world.getObjectByName('marina-moored-boat').userData.owner };
  })()`);
  assert(obstacles.fixed);
  assert.equal(obstacles.boatOwner, 'Dre');
  assert.deepEqual(obstacles.after, obstacles.positions);
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log(JSON.stringify({ ok: true, shots, obstacles, errors }, null, 2));
} catch (error) {
  console.error(error.stack);
  console.error(JSON.stringify({ browserErrors: errors, stderr }));
  process.exitCode = 1;
} finally {
  try { await call('Browser.close'); } catch { browser.kill('SIGTERM'); }
}
