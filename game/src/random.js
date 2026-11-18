/**
 * Sunfall — Deterministic Seeded PRNG (Mulberry32)
 *
 * Provides reproducible random number generation across city generation,
 * traffic spawning, and scene capture / automated screenshots.
 */

(function () {
  'use strict';

  var SF = window.SF = window.SF || {};

  var state = 0x6d2b79f5;

  function stringToSeed(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return (hash >>> 0);
  }

  function reseed(seed) {
    if (typeof seed === 'string') {
      state = stringToSeed(seed);
    } else if (typeof seed === 'number' && Number.isFinite(seed)) {
      state = (seed >>> 0);
    } else {
      state = 0x6d2b79f5;
    }
    // Warm up the PRNG generator
    for (var i = 0; i < 4; i++) {
      mulberry32();
    }
  }

  function mulberry32() {
    state = (state + 0x6d2b79f5) | 0;
    var t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  SF.random = {
    reseed: reseed,
    // Fisher-Yates shuffle in place; returns the same array.
    shuffle: function (arr) {
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(mulberry32() * (i + 1));
        var item = arr[i];
        arr[i] = arr[j];
        arr[j] = item;
      }
      return arr;
    },

    // Uniform float in [0, 1)
    value: function () {
      return mulberry32();
    },

    // Uniform float in [min, max)
    range: function (min, max) {
      if (max === undefined) {
        max = min;
        min = 0;
      }
      return min + mulberry32() * (max - min);
    },

    // Integer in [min, max] inclusive
    rangeInt: function (min, max) {
      if (max === undefined) {
        max = min;
        min = 0;
      }
      return Math.floor(min + mulberry32() * (max - min + 1));
    },

    // Pick a random element from an array
    pick: function (arr) {
      if (!arr || arr.length === 0) return null;
      var index = Math.floor(mulberry32() * arr.length);
      return arr[index];
    },

    // Boolean true with given probability (0.0 to 1.0)
    chance: function (prob) {
      if (prob === undefined) prob = 0.5;
      return mulberry32() < prob;
    },

    // Returns -1 or +1 randomly
    sign: function () {
      return mulberry32() < 0.5 ? -1 : 1;
    }
  };

  // Initial seed
  reseed(19861105);
})();
