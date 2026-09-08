import { afterEach, describe, expect, it, vi } from 'vitest';
import { AfterMidnight } from '../src/features/AfterMidnight';
import { rng } from '../src/math/RNG';
afterEach(() => vi.restoreAllMocks());
function chooseWithRoll(roll: number): number {
  vi.spyOn(rng, 'next').mockReturnValueOnce(roll).mockReturnValueOnce(0.75);
  return new AfterMidnight().choose('gasCan');
}
describe('After Midnight contract', () => {
  it('selects 2x for the lower 50% of the distribution', () => {
    expect(chooseWithRoll(0)).toBe(2);
    vi.restoreAllMocks();
    expect(chooseWithRoll(0.499999)).toBe(2);
  });
  it('selects 5x from 50% through 85%', () => {
    expect(chooseWithRoll(0.5)).toBe(5);
    vi.restoreAllMocks();
    expect(chooseWithRoll(0.849999)).toBe(5);
  });
  it('selects 10x from 85% through 100%', () => {
    expect(chooseWithRoll(0.85)).toBe(10);
    vi.restoreAllMocks();
    expect(chooseWithRoll(0.999999)).toBe(10);
  });
  it('returns the same outcome when the same choice is selected again', () => {
    const next = vi.spyOn(rng, 'next').mockReturnValueOnce(0.2).mockReturnValueOnce(0.75);
    const feature = new AfterMidnight();
    expect(feature.choose('gasCan')).toBe(2);
    expect(feature.choose('gasCan')).toBe(2);
    expect(next).toHaveBeenCalledTimes(2);
  });
  it('assigns all three distinct multiplier values after the first selection', () => {
    vi.spyOn(rng, 'next').mockReturnValueOnce(0.6).mockReturnValueOnce(0.75);
    const feature = new AfterMidnight();
    const values = [feature.choose('gasCan'), feature.choose('candyBar'), feature.choose('plushDoll')];
    expect([...values].sort((a, b) => a - b)).toEqual([2, 5, 10]);
  });
  it('does not redraw RNG when revealing already-assigned remaining choices', () => {
    const next = vi.spyOn(rng, 'next').mockReturnValueOnce(0.9).mockReturnValueOnce(0.25);
    const feature = new AfterMidnight();
    feature.choose('gasCan');
    feature.choose('candyBar');
    feature.choose('plushDoll');
    expect(next).toHaveBeenCalledTimes(2);
  });
});
