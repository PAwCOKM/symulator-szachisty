/**
 * Deterministic, serializable PRNG (xoshiro128**), seeded from a string via cyrb128.
 *
 * The whole simulation draws randomness exclusively from this generator, and its state is
 * stored inside CareerState. Replaying the same seed + action log therefore reproduces the
 * exact same career — which is what the API uses to verify submitted results.
 */
export type RngState = [number, number, number, number];

export function hashSeed(seed: string): RngState {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < seed.length; i++) {
    const k = seed.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  const state: RngState = [
    (h1 ^ h2 ^ h3 ^ h4) >>> 0,
    (h2 ^ h1) >>> 0,
    (h3 ^ h1) >>> 0,
    (h4 ^ h1) >>> 0,
  ];
  // xoshiro must never be seeded with all zeros.
  if (state.every((v) => v === 0)) state[0] = 0x9e3779b9;
  return state;
}

export class Rng {
  private s: RngState;

  constructor(state: RngState) {
    this.s = [state[0], state[1], state[2], state[3]];
  }

  static fromSeed(seed: string): Rng {
    return new Rng(hashSeed(seed));
  }

  /** Snapshot of the internal state (copy) — store it back into CareerState. */
  get state(): RngState {
    return [this.s[0], this.s[1], this.s[2], this.s[3]];
  }

  /** Next unsigned 32-bit integer. */
  nextU32(): number {
    const s = this.s;
    const result = Math.imul(rotl(Math.imul(s[1], 5), 7), 9) >>> 0;
    const t = s[1] << 9;
    s[2] ^= s[0];
    s[3] ^= s[1];
    s[1] ^= s[2];
    s[0] ^= s[3];
    s[2] ^= t;
    s[3] = rotl(s[3], 11);
    s[0] >>>= 0;
    s[1] >>>= 0;
    s[2] >>>= 0;
    s[3] >>>= 0;
    return result;
  }

  /** Uniform float in [0, 1). */
  float(): number {
    return this.nextU32() / 4294967296;
  }

  /** Uniform float in [min, max). */
  range(min: number, max: number): number {
    return min + (max - min) * this.float();
  }

  /** Uniform integer in [min, max] (inclusive). */
  int(min: number, max: number): number {
    return min + Math.floor(this.float() * (max - min + 1));
  }

  chance(p: number): boolean {
    return this.float() < p;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick on empty array');
    return items[Math.floor(this.float() * items.length)] as T;
  }

  /** Weighted pick; items with weight <= 0 are never chosen. */
  weighted<T>(items: readonly T[], weight: (item: T) => number): T {
    let total = 0;
    for (const item of items) total += Math.max(0, weight(item));
    if (total <= 0) return this.pick(items);
    let roll = this.float() * total;
    for (const item of items) {
      roll -= Math.max(0, weight(item));
      if (roll < 0) return item;
    }
    return items[items.length - 1] as T;
  }

  /** Normally distributed value (Box–Muller). */
  normal(mean = 0, sd = 1): number {
    const u = 1 - this.float();
    const v = this.float();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /** In-place Fisher–Yates shuffle, returns the same array. */
  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(this.float() * (i + 1));
      const tmp = items[i] as T;
      items[i] = items[j] as T;
      items[j] = tmp;
    }
    return items;
  }
}

function rotl(x: number, k: number): number {
  return (x << k) | (x >>> (32 - k));
}
