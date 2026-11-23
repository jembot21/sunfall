// Capture with Chrome's CLI compositor and virtual time. The game server must be running.
// SUNFALL_CHROME=/path/to/chrome-headless-shell node checks/capture.mjs [bridge|face|drive|start]
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const shots = JSON.parse(readFileSync(resolve(root, 'shots.json'), 'utf8'));
const modes = ['bridge', 'face', 'drive', 'start'];
assert.deepEqual(shots, modes.map((mode, i) => ({ name: `${i + 1}-${mode}.jpg`, query: `?shot=${mode}&seed=1` })));
const requested = process.argv.slice(2);
assert(requested.every(mode => modes.includes(mode)), 'Use bridge, face, drive or start');
const localShell = resolve(root, 'checks/.capture-tooling/chrome-headless-shell-linux64/chrome-headless-shell');
const chrome = process.env.SUNFALL_CHROME || (existsSync(localShell) ? localShell : '/usr/bin/chromium');
mkdirSync(resolve(root, 'screenshots'), { recursive: true });
for (let i = 0; i < shots.length; i += 1) {
  if (requested.length && !requested.includes(modes[i])) continue;
  const shot = shots[i];
  const output = resolve(root, 'screenshots', shot.name);
  const profile = resolve(root, 'checks/.browser-profile', `capture-${modes[i]}`);
  const args = [
    '--headless', '--no-sandbox', '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--disable-component-update', '--disable-features=MediaRouter',
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars',
    '--window-size=1280,720', '--force-device-scale-factor=1',
    '--virtual-time-budget=7000', '--run-all-compositor-stages-before-draw',
    `--user-data-dir=${profile}`, `--disk-cache-dir=${profile}/cache`,
    `--screenshot=${output}`, `http://localhost:8080/${shot.query}`,
  ];
  await new Promise((resolveCapture, reject) => {
    const browser = spawn(chrome, args, { cwd: root, stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    const timeout = setTimeout(() => { browser.kill('SIGTERM'); reject(new Error(`${shot.name}: capture timed out`)); }, 60000);
    browser.stderr.on('data', data => { stderr = (stderr + data).slice(-4000); });
    browser.on('error', error => { clearTimeout(timeout); reject(error); });
    browser.on('exit', code => {
      clearTimeout(timeout);
      if (code === 0) resolveCapture();
      else reject(new Error(`${shot.name}: Chrome exited ${code}: ${stderr}`));
    });
  });
  // Inspect the format header and size only; visual readback is a separate, single inspection.
  const descriptor = openSync(output, 'r');
  const magic = Buffer.alloc(2);
  try { readSync(descriptor, magic, 0, 2, 0); } finally { closeSync(descriptor); }
  assert.equal(magic.toString('hex'), 'ffd8', `${shot.name} must be JPEG`);
  const bytes = statSync(output).size;
  console.log(JSON.stringify({ file: `screenshots/${shot.name}`, bytes, viewport: [1280, 720], virtualTime: 7000 }));
  assert(bytes <= 256 * 1024, `${shot.name} needs lower JPEG quality`);
}
if (!requested.length) assert.deepEqual(readdirSync(resolve(root, 'screenshots')).sort(), shots.map(shot => shot.name).sort());
