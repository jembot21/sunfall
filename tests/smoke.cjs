const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
let failed = false;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? `: ${detail}` : ''}`);
  if (!ok) failed = true;
}
const htmlPath = path.join(root, 'game/index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
  const hud = fs.readFileSync(path.join(root, 'game/src/hud.js'), 'utf8');
  const mapId = (hud.match(/getElementById\(['"]([^'"]+)['"]\)/) || [])[1];
  const canvasIds = [...html.matchAll(/<canvas\b[^>]*\bid=["']([^"']+)["']/gi)].map(m => m[1]);
  check('HUD minimap canvas exists', mapId === 'minimap' && canvasIds.includes(mapId));
  check('favicon is inline SVG', /rel="icon"[^>]*data:image\/svg\+xml/.test(html));
const scripts = [...html.matchAll(/<script\s+src=["']([^"']+)["']/gi)].map(m => m[1]);
for (const src of scripts) check(`script exists ${src}`, fs.existsSync(path.resolve(path.dirname(htmlPath), src)));
const srcDir = path.join(root, 'game/src');
for (const file of fs.readdirSync(srcDir).filter(f => f.endsWith('.js')).sort()) {
  const source = fs.readFileSync(path.join(srcDir, file), 'utf8');
  try { new Function(source); check(`syntax ${file}`, true); }
  catch (error) { check(`syntax ${file}`, false, error.message); }
}
const gameFiles = [];
function walk(dir) { for (const ent of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, ent.name);  if (ent.isDirectory()) { if (path.relative(path.join(root, 'game'), p) !== 'vendor') walk(p); } else gameFiles.push(p); } }
walk(path.join(root, 'game'));
for (const file of gameFiles) {
  const text = fs.readFileSync(file, 'utf8');
  check(`offline ${path.relative(root, file)}`, !/https?:\/\//i.test(text));
}
try {
  const shots = JSON.parse(fs.readFileSync(path.join(root, 'shots.json'), 'utf8'));
  check('shots.json lists 4 shots', Array.isArray(shots) && shots.length === 4);
} catch (error) { check('shots.json parses', false, error.message); }
process.exitCode = failed ? 1 : 0;
