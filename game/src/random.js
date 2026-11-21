(function (S) {
  'use strict';
  // Mulberry32: each subsystem can fork a stable stream without coupling layouts.
  S.Random = function (seed) {
    let state = seed >>> 0;
    const initial = state;
    return {
      next: function () {
        state = (state + 0x6D2B79F5) >>> 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      },
      range: function (min, max) { return min + this.next() * (max - min); },
      int: function (min, max) { return Math.floor(this.range(min, max + 1)); },
      pick: function (items) { return items[this.int(0, items.length - 1)]; },
      chance: function (probability) { return this.next() < probability; },
      fork: function (label) {
        let hash = initial;
        for (let i = 0; i < label.length; i++) hash = Math.imul(hash ^ label.charCodeAt(i), 16777619);
        return S.Random(hash >>> 0);
      }
    };
  };
})(window.Sunfall = window.Sunfall || {});
