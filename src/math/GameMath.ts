import type {
  GameResult,
  ReelGrid,
  SymbolId,
  WinPosition,
  WinResult,
} from '../game/types';
import { PAYLINES } from './Paylines';
import { PAYTABLE } from './Paytable';
import { rng } from './RNG';

const REEL_WEIGHTS: Record<SymbolId, number[]> = {
  coffee: [12, 12, 13, 13, 13],
  burger: [11, 11, 11, 12, 12],
  gas: [10, 10, 10, 10, 11],
  chip: [7, 7, 7, 7, 7],
  dice: [6, 6, 6, 6, 6],
  gary: [4, 4, 4, 4, 4],
  zed: [4, 4, 4, 4, 4],
  barkley: [4, 4, 3, 3, 3],
  victor: [2, 2, 2, 2, 2],
  marge: [2, 2, 2, 1, 1],
  scatter: [2, 2, 2, 2, 1],
};

function buildReel(reelIndex: number): SymbolId[] {
  const strip: SymbolId[] = [];

  for (const symbol of Object.keys(REEL_WEIGHTS) as SymbolId[]) {
    const count = REEL_WEIGHTS[symbol][reelIndex];

    for (let i = 0; i < count; i++) {
      strip.push(symbol);
    }
  }

  return strip;
}

const REEL_STRIPS = [0, 1, 2, 3, 4].map(buildReel);

function randomSymbol(reelIndex: number): SymbolId {
  const strip = REEL_STRIPS[reelIndex];
  const index = Math.floor(rng.next() * strip.length);

  return strip[index];
}

function getWinningPositions(
  payline: number[],
  count: number,
): WinPosition[] {
  return payline.slice(0, count).map((row, reel) => ({
    reel,
    row,
  }));
}

function evaluatePayline(
  grid: ReelGrid,
  payline: number[],
  paylineIndex: number,
): WinResult | null {
  let targetSymbol: SymbolId | null = null;

  for (let reel = 0; reel < 5; reel++) {
    const symbol = grid[reel][payline[reel]];

    if (symbol !== 'marge') {
      if (symbol === 'scatter') {
        return null;
      }

      targetSymbol = symbol;
      break;
    }
  }

  if (!targetSymbol) {
    targetSymbol = 'marge';
  }

  let count = 0;

  for (let reel = 0; reel < 5; reel++) {
    const symbol = grid[reel][payline[reel]];

    if (symbol === targetSymbol || symbol === 'marge') {
      count++;
    } else {
      break;
    }
  }

  if (count < 3) {
    return null;
  }

  const payoutCount = Math.min(count, 5) as 3 | 4 | 5;
  const amount = PAYTABLE[targetSymbol].payouts[payoutCount];

  return {
    symbol: targetSymbol,
    count: payoutCount,
    amount,
    payline: paylineIndex + 1,
    positions: getWinningPositions(payline, payoutCount),
  };
}

function evaluateWins(grid: ReelGrid): WinResult[] {
  const wins: WinResult[] = [];

  PAYLINES.forEach((payline, index) => {
    const win = evaluatePayline(grid, payline, index);

    if (win) {
      wins.push(win);
    }
  });

  return wins;
}

function removeWinningSymbols(
  grid: ReelGrid,
  wins: WinResult[],
): ReelGrid {
  const result = grid.map((reel) => [...reel]);

  const winningPositions = new Set(
    wins.flatMap((win) =>
      win.positions.map(
        ({ reel, row }) => `${reel}:${row}`,
      ),
    ),
  );

  for (const position of winningPositions) {
    const [reel, row] = position.split(':').map(Number);

    result[reel][row] = 'scatter';
  }

  return result;
}

function collapseReels(grid: ReelGrid): ReelGrid {
  return grid.map((reel, reelIndex) => {
    const remaining = reel.filter(
      (_, row) => grid[reelIndex][row] !== 'scatter',
    );

    const replacements = Array.from(
      { length: 3 - remaining.length },
      () => randomSymbol(reelIndex),
    );

    return [...replacements, ...remaining];
  });
}

function calculateTotalWin(wins: WinResult[]): number {
  return wins.reduce(
    (total, win) => total + win.amount,
    0,
  );
}

export function spinReels(): GameResult {
  const grid: ReelGrid = [];

  for (let reel = 0; reel < 5; reel++) {
    const column: SymbolId[] = [];

    for (let row = 0; row < 3; row++) {
      column.push(randomSymbol(reel));
    }

    grid.push(column);
  }

  const wins = evaluateWins(grid);

  return {
    grid,
    wins,
    totalWin: calculateTotalWin(wins),
  };
}

export interface CascadeStep {
  grid: ReelGrid;
  wins: WinResult[];
  totalWin: number;
}

export interface CascadeResult {
  steps: CascadeStep[];
  finalGrid: ReelGrid;
  totalWin: number;
}

export function resolveCascades(
  initialGrid: ReelGrid,
): CascadeResult {
  let grid = initialGrid.map((reel) => [...reel]);
  const steps: CascadeStep[] = [];

  while (true) {
    const wins = evaluateWins(grid);

    if (wins.length === 0) {
      break;
    }

    const totalWin = calculateTotalWin(wins);

    steps.push({
      grid: grid.map((reel) => [...reel]),
      wins,
      totalWin,
    });

    grid = collapseReels(removeWinningSymbols(grid, wins));
  }

  return {
    steps,
    finalGrid: grid,
    totalWin: steps.reduce(
      (total, step) => total + step.totalWin,
      0,
    ),
  };
}