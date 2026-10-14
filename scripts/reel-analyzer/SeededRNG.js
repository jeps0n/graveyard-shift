/** Deterministic PRNG using modified Mulberry32 mixing. */
export function createSeededRNG(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x41424259) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
