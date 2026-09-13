import { afterEach, describe, expect, it, vi } from 'vitest';
import { MathRandomSource, rng } from '../src/math/RNG';

afterEach(() => vi.restoreAllMocks());

describe('RNG contract', () => {
  it('delegates random draws to Math.random', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.314159);
    expect(new MathRandomSource().next()).toBe(0.314159);
    expect(rng.next()).toBe(0.314159);
    expect(random).toHaveBeenCalledTimes(2);
  });
});
