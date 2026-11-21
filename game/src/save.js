(function (root) {
  'use strict';
  var SF = root.SF = root.SF || {};
  var KEY = 'sunfall-v2-save';
  var defaults = function () { return { cash: 250, storyDone: 0, unlocks: [], safehouse: { x: 0, y: 0, z: 0 }, savedAt: 0 }; };
  var data = defaults(), saved = false;
  function storage() { try { return root.localStorage || null; } catch (_) { return null; } }
  function valid(value) {
    if (!value || typeof value !== 'object') return defaults();
    var d = defaults();
    d.cash = Math.max(0, Number(value.cash) || 0);
    d.storyDone = Math.max(0, Math.min(8, Math.floor(Number(value.storyDone) || 0)));
    d.unlocks = Array.isArray(value.unlocks) ? value.unlocks.filter(function (x) { return typeof x === 'string'; }) : [];
    if (value.safehouse && typeof value.safehouse === 'object') {
      d.safehouse = { x: Number(value.safehouse.x) || 0, y: Number(value.safehouse.y) || 0, z: Number(value.safehouse.z) || 0 };
    }
    d.savedAt = Number(value.savedAt) || 0;
    return d;
  }
  function load() {
    var s = storage();
    if (!s) { data = defaults(); saved = false; return data; }
    try { var raw = s.getItem(KEY); if (!raw) { data = defaults(); saved = false; return data; } data = valid(JSON.parse(raw)); saved = true; }
    catch (_) { data = defaults(); saved = false; }
    return data;
  }
  function store(next) {
    data = valid(Object.assign({}, data, next || {})); data.savedAt = Date.now();
    var s = storage();
    try { if (s) { s.setItem(KEY, JSON.stringify(data)); saved = true; } else saved = false; }
    catch (_) { saved = false; }
    return data;
  }
  function clear() {
    var s = storage(); try { if (s) s.removeItem(KEY); } catch (_) {}
    data = defaults(); saved = false; return data;
  }
  SF.save = {
    get saved() { return saved; },
    get data() { return data; },
    load: load,
    store: store,
    clear: clear,
    hasSave: function () { return saved; },
    key: KEY
  };
  load();
})(globalThis);
