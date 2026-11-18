// Seeded procedural helpers. Contract: methods are copied onto SF, then SF.random and SF.rng alias this object.
(function (SF) {
  let state = 0x5f3759df;
  function random() {
    state = (state + 0x6D2B79F5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const helpers = {
    next: random,
    random,
    range(min, max) { return min + random() * (max - min); },
    pick(items) { return items[Math.floor(random() * items.length)]; },
    chance(probability) { return random() < probability; },
    reseed(seed) { state = seed | 0; },
    shuffle(items) {
      const result = items.slice();
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    }
  };
  Object.assign(SF, helpers);
  SF.random = helpers;
  SF.rng = helpers;
})(window.SF);
