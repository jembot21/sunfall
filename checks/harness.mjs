// Real vendored Three.js and ES modules, deterministic frames, only WebGL/DOM drawing stubbed.
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const THREE = createRequire(import.meta.url)('../game/vendor/three.min.js');

class Element extends EventTarget {
  style = {};
  textContent = '';
  innerHTML = '';
  hidden = false;
  focus() {}
  hasPointerCapture() { return false; }
  setPointerCapture() {}
  releasePointerCapture() {}
  closest() { return null; }
  getContext() { return new Proxy({}, { get: (target, key) => target[key] ?? (() => {}) }); }
}

export async function harness(search = '?seed=1337', { storage = new Map() } = {}) {
  let nextFrame;
  const elements = new Map();
  const document = Object.assign(new EventTarget(), {
    hidden: false,
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, new Element());
      return elements.get(id);
    },
    createElement() { return new Element(); },
  });
  const window = Object.assign(new EventTarget(), { location: { search },
    localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    THREE: { ...THREE, Clock: class { getDelta() { return 1 / 60; } } } });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, 1.6, 0.1, 3200);
  const renderer = { domElement: new Element(), render() {} };
  const context = createContext({ window, document, URLSearchParams, AbortController, console,
    requestAnimationFrame(callback) { nextFrame = callback; } });
  const modules = new Map();
  const renderPath = resolve(root, 'game/src/render.js');
  modules.set(renderPath, Promise.resolve(new SyntheticModule(['scene', 'camera', 'renderer', 'updateLighting'], function () {
    this.setExport('scene', scene);
    this.setExport('camera', camera);
    this.setExport('renderer', renderer);
    this.setExport('updateLighting', () => {});
  }, { context, identifier: renderPath })));
  function load(path) {
    if (!modules.has(path)) modules.set(path, readFile(path, 'utf8').then((source) => new SourceTextModule(source, { context, identifier: path })));
    return modules.get(path);
  }
  const main = await load(resolve(root, 'game/src/main.js'));
  await main.link((specifier, parent) => load(resolve(dirname(parent.identifier), specifier)));
  await main.evaluate();
  const h = {
    game: window.__sunfall, elements, window,
    start() { elements.get('start-button').dispatchEvent(new Event('click')); },
    step(frames = 1) { for (let i = 0; i < frames; i += 1) nextFrame(); },
    key(code, down = true) {
      const event = new Event(down ? 'keydown' : 'keyup', { cancelable: true });
      Object.assign(event, { code, repeat: false });
      window.dispatchEvent(event);
    },
    tap(code) { h.key(code); h.step(); h.key(code, false); },
    async module(name) { return (await load(resolve(root, `game/src/${name}.js`))).namespace; },
  };
  return h;
}
