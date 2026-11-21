(function () {
  'use strict';
  const SF = window.SF = window.SF || {};
  function seeded(seed) {
    let state = seed >>> 0;
    const api = {
      next() { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; },
      range(min, max) { return min + api.next() * (max - min); },
      int(min, max) { return Math.floor(api.range(min, max + 1)); },
      pick(items) { return items[api.int(0, items.length - 1)]; },
      chance(probability) { return api.next() < probability; }
    };
    return api;
  }
  SF.random = Object.assign(seeded(SF.CONFIG.seed), { seeded });
}());
