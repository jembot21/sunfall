// Numeric seeds and named seeds both work in ?seed=. No ambient randomness.
export function normalizeSeed(seed = 1337) {
  if (typeof seed === 'number' && Number.isFinite(seed)) return seed >>> 0;
  const value = String(seed);
  if (/^[+-]?\d+$/.test(value) && Number.isSafeInteger(Number(value))) return Number(value) >>> 0;
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  }
  return hash >>> 0;
}

// Mulberry32: a stable sequence of values in [0, 1) for every 32-bit seed.
export function createRandom(seed = 1337) {
  let state = normalizeSeed(seed);
  return function random() {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
