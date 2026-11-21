(function () {
  'use strict';
  var SF = window.SF = window.SF || {};
  function create(seed) {
    var state = seed >>> 0;
    var api = {
      next: function () {
        state = (state + 0x6D2B79F5) >>> 0;
        var t = Math.imul(state ^ (state >>> 15), state | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      },
      range: function (min, max) { return min + (max - min) * api.next(); },
      int: function (min, max) { return Math.floor(api.range(min, max + 1)); },
      pick: function (items) { return items.length ? items[api.int(0, items.length - 1)] : undefined; },
      chance: function (probability) { return api.next() < probability; },
      create: create
    };
    return api;
  }
  SF.random = create(SF.CONFIG.seed);
}());
