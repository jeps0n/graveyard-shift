import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReelGrid, SymbolId, WinResult } from '../src/game/types';
import {
  evaluatePrimaryGrid,
  evaluateWins,
  generatePrimaryGrid,
  resolveCascades,
  resolveCascadeStep,
} from '../src/math/GameMath';
import { PAYTABLE } from '../src/math/Paytable';
import { rng } from '../src/math/RNG';

const S = 'scatter' as const;

function gridWithTopRow(top: [SymbolId, SymbolId, SymbolId, SymbolId, SymbolId]): ReelGrid {
  return top.map((symbol) => [symbol, S, S]);
}

function paylineWin(grid: ReelGrid, payline: number): WinResult | undefined {
  return evaluateWins(grid).wins.find((win) => win.payline === payline);
}

afterEach(() => vi.restoreAllMocks());

describe('GameMath contract - paylines and payouts', () => {
  it('pays 3-of-a-kind from reel 1 left-to-right', () => {
    const win = paylineWin(gridWithTopRow(['coffee', 'coffee', 'coffee', 'zed', 'victor']), 1);
    expect(win).toMatchObject({ symbol: 'coffee', count: 3, payoutMultiplier: 1, payline: 1 });
  });

  it('pays 4-of-a-kind from reel 1 left-to-right', () => {
    const win = paylineWin(gridWithTopRow(['gas', 'gas', 'gas', 'gas', 'victor']), 1);
    expect(win).toMatchObject({ symbol: 'gas', count: 4, payoutMultiplier: 4, payline: 1 });
  });

  it('pays 5-of-a-kind from reel 1 left-to-right', () => {
    const win = paylineWin(gridWithTopRow(['dice', 'dice', 'dice', 'dice', 'dice']), 1);
    expect(win).toMatchObject({ symbol: 'dice', count: 5, payoutMultiplier: 15, payline: 1 });
  });

  it('does not pay a sequence that begins after reel 1', () => {
    const win = paylineWin(gridWithTopRow(['burger', 'victor', 'victor', 'victor', 'victor']), 1);
    expect(win).toBeUndefined();
  });

  it('does not pay fewer than 3 consecutive symbols', () => {
    const win = paylineWin(gridWithTopRow(['zed', 'zed', 'victor', 'zed', 'zed']), 1);
    expect(win).toBeUndefined();
  });

  it('pays independently winning paylines', () => {
    const grid: ReelGrid = Array.from({ length: 5 }, () => ['coffee', 'burger', S]);
    const wins = evaluateWins(grid).wins;
    expect(wins).toEqual(expect.arrayContaining([
      expect.objectContaining({ payline: 1, symbol: 'coffee', count: 5, payoutMultiplier: 5 }),
      expect.objectContaining({ payline: 2, symbol: 'burger', count: 5, payoutMultiplier: 8 }),
    ]));
  });

  it('sums payline multipliers on the primary grid', () => {
    const grid: ReelGrid = Array.from({ length: 5 }, () => ['coffee', 'burger', S]);
    const result = evaluatePrimaryGrid({ grid, draws: [] });
    const expected = result.wins.reduce((sum, win) => sum + win.payoutMultiplier, 0);
    expect(result.totalPayoutMultiplier).toBe(expected);
    expect(result.totalPayoutMultiplier).toBeGreaterThan(PAYTABLE.burger.payoutMultipliers[5]);
  });
});

describe('GameMath contract - Marge best-pay Wild', () => {
  it('pays 3 Marge instead of lower-paying 4 Coffee', () => {
    const win = paylineWin(gridWithTopRow(['marge', 'marge', 'marge', 'coffee', 'victor']), 1);
    expect(win).toMatchObject({ symbol: 'marge', count: 3, payoutMultiplier: 5, payline: 1 });
  });

  it('pays higher-paying 4 Zed using leading Marges as Wilds', () => {
    const win = paylineWin(gridWithTopRow(['marge', 'marge', 'marge', 'zed', 'victor']), 1);
    expect(win).toMatchObject({ symbol: 'zed', count: 4, payoutMultiplier: 12, payline: 1 });
  });

  it('still pays 3 Marge when Scatter blocks the line', () => {
    const win = paylineWin(gridWithTopRow(['marge', 'marge', 'marge', 'scatter', 'zed']), 1);
    expect(win).toMatchObject({ symbol: 'marge', count: 3, payoutMultiplier: 5, payline: 1 });
  });

  it('pays 5 Marge for an all-Marge line', () => {
    const win = paylineWin(gridWithTopRow(['marge', 'marge', 'marge', 'marge', 'marge']), 1);
    expect(win).toMatchObject({ symbol: 'marge', count: 5, payoutMultiplier: 30, payline: 1 });
  });

  it('pays 5 Zed when two leading Marges substitute for Zed', () => {
    const win = paylineWin(gridWithTopRow(['marge', 'marge', 'zed', 'zed', 'zed']), 1);
    expect(win).toMatchObject({ symbol: 'zed', count: 5, payoutMultiplier: 30, payline: 1 });
  });

  it('uses the longer combination when payout multipliers tie', () => {
    const win = paylineWin(gridWithTopRow(['marge', 'marge', 'marge', 'chip', 'victor']), 1);
    expect(win).toMatchObject({ symbol: 'chip', count: 4, payoutMultiplier: 5, payline: 1 });
    expect(win?.positions).toHaveLength(4);
  });
});

describe('GameMath contract - Scatter and cascades', () => {
  it('never treats Scatter as a payline win', () => {
    const win = paylineWin(gridWithTopRow(['scatter', 'scatter', 'scatter', 'scatter', 'scatter']), 1);
    expect(win).toBeUndefined();
  });

  it('does not remove Scatter when removing winning positions', () => {
    vi.spyOn(rng, 'next').mockReturnValue(0);
    const grid: ReelGrid = [
      ['coffee', 'burger', 'scatter'],
      ['coffee', 'gas', 'chip'],
      ['coffee', 'dice', 'zed'],
      ['coffee', 'gary', 'barkley'],
      ['coffee', 'victor', 'marge'],
    ];
    const wins = evaluateWins(grid).wins;
    const step = resolveCascadeStep(grid, wins);
    expect(step.removedSymbols.some((entry) => entry.symbol === 'scatter')).toBe(false);
    expect(step.grid.flat().filter((symbol) => symbol === 'scatter')).toHaveLength(1);
  });

  it('removes overlapping winning positions only once', () => {
    vi.spyOn(rng, 'next').mockReturnValue(0.99);
    const grid = gridWithTopRow(['coffee', 'coffee', 'coffee', 'coffee', 'coffee']);
    const shared: WinResult[] = [
      { symbol: 'coffee', count: 3, payoutMultiplier: 1, payline: 1, positions: [{ reel: 0, row: 0 }, { reel: 1, row: 0 }, { reel: 2, row: 0 }] },
      { symbol: 'coffee', count: 3, payoutMultiplier: 1, payline: 4, positions: [{ reel: 0, row: 0 }, { reel: 1, row: 0 }, { reel: 2, row: 0 }] },
    ];
    const step = resolveCascadeStep(grid, shared);
    expect(step.removed).toHaveLength(3);
    expect(step.removedSymbols).toHaveLength(3);
    expect(step.refillDraws).toHaveLength(3);
  });

  it('refills exactly one symbol for every removed position', () => {
    vi.spyOn(rng, 'next').mockReturnValue(0.99);
    const grid = gridWithTopRow(['coffee', 'coffee', 'coffee', 'coffee', 'coffee']);
    const wins = evaluateWins(grid).wins;
    const step = resolveCascadeStep(grid, wins);
    expect(step.refillDraws).toHaveLength(step.removed.length);
    expect(step.grid).toHaveLength(5);
    step.grid.forEach((reel) => expect(reel).toHaveLength(3));
  });

  it('stops cascade resolution immediately on a no-win grid', () => {
    const grid = gridWithTopRow(['coffee', 'burger', 'gas', 'chip', 'dice']);
    const result = resolveCascades(grid);
    expect(result.steps).toHaveLength(0);
    expect(result.totalPayoutMultiplier).toBe(0);
    expect(result.finalGrid).toEqual(grid);
  });

  it('accumulates a winning cascade payout and resolves to a final no-win grid', () => {
    vi.spyOn(rng, 'next').mockReturnValue(0.99);
    const grid = gridWithTopRow(['coffee', 'coffee', 'coffee', 'coffee', 'coffee']);
    const result = resolveCascades(grid);
    expect(result.steps).toHaveLength(1);
    expect(result.totalPayoutMultiplier).toBe(5);
    expect(evaluateWins(result.finalGrid).wins).toHaveLength(0);
  });
});

describe('GameMath contract - grid generation', () => {
  it('generates a complete 5x3 grid using exactly 15 RNG draws', () => {
    const next = vi.spyOn(rng, 'next').mockReturnValue(0.25);
    const result = generatePrimaryGrid();
    expect(next).toHaveBeenCalledTimes(15);
    expect(result.draws).toHaveLength(15);
    expect(result.grid).toHaveLength(5);
    result.grid.forEach((reel) => expect(reel).toHaveLength(3));
  });
});
