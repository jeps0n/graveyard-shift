import type {
  ReelGrid,
  SymbolId,
  WinPosition,
  WinResult,
} from '../game/types';
import { PAYLINES } from './Paylines';
import { PAYTABLE } from './Paytable';
import { rng } from './RNG';
// Each reel has its own weighted symbol distribution.
// Higher weights make a symbol more common on that reel.
// These weights are converted into discrete reel strips below.
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
// Convert weighted symbol counts into a discrete reel strip.
// Selecting a random position from the strip gives each symbol
// a probability proportional to its weight.
function buildReel(reelIndex: number): SymbolId[] {
  const strip: SymbolId[] = [];
  for (const symbol of Object.keys(
    REEL_WEIGHTS,
  ) as SymbolId[]) {
    const count =
      REEL_WEIGHTS[symbol][reelIndex];
    for (let i = 0; i < count; i++) {
      strip.push(symbol);
    }
  }
  return strip;
}
const REEL_STRIPS = [0, 1, 2, 3, 4].map(
  buildReel,
);
export interface RngDrawTrace {
  reel: number;
  row: number;
  randomValue: number;
  stripLength: number;
  index: number;
  symbol: SymbolId;
}
export interface PaylineEvaluationTrace {
  payline: number;
  path: WinPosition[];
  symbols: SymbolId[];
  targetSymbol: SymbolId | null;
  matchedCount: number;
  result: 'WIN' | 'NO WIN';
  payoutMultiplier: number;
  blockingSymbol: SymbolId | null;
  reason: string;
}
export interface GridGenerationTrace {
  draws: RngDrawTrace[];
  grid: ReelGrid;
}
export interface CascadeResolutionTrace {
  index: number;
  grid: ReelGrid;
  wins: WinResult[];
  evaluations: PaylineEvaluationTrace[];
  removed: WinPosition[];
  removedSymbols: Array<{
    position: WinPosition;
    symbol: SymbolId;
  }>;
  collapsed: Array<Array<SymbolId | null>>;
  refillDraws: RngDrawTrace[];
}
export interface SpinMathTrace {
  primary: GridGenerationTrace;
  primaryEvaluations: PaylineEvaluationTrace[];
  cascades: CascadeResolutionTrace[];
}
function cloneGrid(
  grid: ReelGrid,
): ReelGrid {
  return grid.map((reel) => [...reel]);
}
// Draw one symbol from the selected reel's weighted strip.
// The trace records the draw so a spin can be reproduced and inspected.
function randomSymbol(
  reelIndex: number,
  row: number,
  draws: RngDrawTrace[],
): SymbolId {
  const strip =
    REEL_STRIPS[reelIndex];
  const randomValue = rng.next();
  const index = Math.floor(
    randomValue * strip.length,
  );
  const symbol = strip[index];
  draws.push({
    reel: reelIndex,
    row,
    randomValue,
    stripLength: strip.length,
    index,
    symbol,
  });
  return symbol;
}
export function generatePrimaryGrid(): GridGenerationTrace {
  const grid: ReelGrid = [];
  const draws: RngDrawTrace[] = [];
  for (let reel = 0; reel < 5; reel++) {
    const column: SymbolId[] = [];
    for (let row = 0; row < 3; row++) {
      column.push(
        randomSymbol(
          reel,
          row,
          draws,
        ),
      );
    }
    grid.push(column);
  }
  return {
    draws,
    grid,
  };
}
function getWinningPositions(
  payline: number[],
  count: number,
): WinPosition[] {
  return payline
    .slice(0, count)
    .map((row, reel) => ({
      reel,
      row,
    }));
}
// Evaluate a single payline from left to right.
// Marge is a best-pay wild: evaluate every eligible regular symbol
// plus Marge herself, then award the single highest-paying valid result.
// Scatter is never a substitution target and blocks a line sequence.
// Ties prefer the longer matching sequence so the cascade removes the
// most specific winning combination.
function evaluatePayline(
  grid: ReelGrid,
  payline: number[],
  paylineIndex: number,
): {
  win: WinResult | null;
  trace: PaylineEvaluationTrace;
} {
  const path = getWinningPositions(payline, 5);
  const symbols = path.map(
    ({ reel, row }) => grid[reel][row],
  );
  const eligibleTargets: SymbolId[] = ['marge'];

  const firstNonWild = symbols.find(
    (symbol) => symbol !== 'marge',
  );

  if (
    firstNonWild &&
    firstNonWild !== 'scatter'
  ) {
    eligibleTargets.push(firstNonWild);
  }

  let bestWin: WinResult | null = null;

  for (const targetSymbol of eligibleTargets) {
    let count = 0;
    for (let reel = 0; reel < 5; reel++) {
      const symbol = grid[reel][payline[reel]];
      const matches =
        targetSymbol === 'marge'
          ? symbol === 'marge'
          : symbol === targetSymbol || symbol === 'marge';
      if (!matches) {
        break;
      }
      count++;
    }

    if (count < 3) {
      continue;
    }

    const payoutCount = Math.min(count, 5) as 3 | 4 | 5;
    const payoutMultiplier =
      PAYTABLE[targetSymbol].payoutMultipliers[payoutCount];
    const candidate: WinResult = {
      symbol: targetSymbol,
      count: payoutCount,
      payoutMultiplier,
      payline: paylineIndex + 1,
      positions: getWinningPositions(payline, payoutCount),
    };

    if (
      !bestWin ||
      candidate.payoutMultiplier > bestWin.payoutMultiplier ||
      (candidate.payoutMultiplier === bestWin.payoutMultiplier &&
        candidate.count > bestWin.count)
    ) {
      bestWin = candidate;
    }
  }

  if (!bestWin) {
    const firstBlockingIndex = symbols.findIndex(
      (symbol, index) =>
        index === 0 ||
        (symbol !== 'marge' && symbol !== symbols[0]),
    );
    const blockingSymbol = symbols.find(
      (symbol) => symbol === 'scatter',
    ) ?? (firstBlockingIndex >= 0 ? symbols[firstBlockingIndex] : null);
    return {
      win: null,
      trace: {
        payline: paylineIndex + 1,
        path,
        symbols,
        targetSymbol: null,
        matchedCount: 0,
        result: 'NO WIN',
        payoutMultiplier: 0,
        blockingSymbol,
        reason: 'No eligible best-pay combination reached three consecutive positions.',
      },
    };
  }

  return {
    win: bestWin,
    trace: {
      payline: paylineIndex + 1,
      path,
      symbols,
      targetSymbol: bestWin.symbol,
      matchedCount: bestWin.count,
      result: 'WIN',
      payoutMultiplier: bestWin.payoutMultiplier,
      blockingSymbol:
        bestWin.count < 5
          ? grid[bestWin.count][payline[bestWin.count]]
          : null,
      reason:
        `Best-pay Wild evaluation selected ${bestWin.count} ${bestWin.symbol.toUpperCase()} for ×${bestWin.payoutMultiplier}.`,
    },
  };
}
export function evaluateWins(
  grid: ReelGrid,
): {
  wins: WinResult[];
  evaluations: PaylineEvaluationTrace[];
} {
  const wins: WinResult[] = [];
  const evaluations: PaylineEvaluationTrace[] = [];
  PAYLINES.forEach(
    (payline, index) => {
      const evaluation =
        evaluatePayline(
          grid,
          payline,
          index,
        );
      evaluations.push(
        evaluation.trace,
      );
      if (evaluation.win) {
        wins.push(
          evaluation.win,
        );
      }
    },
  );
  return {
    wins,
    evaluations,
  };
}
// null represents an empty position during cascade processing.
// Scatter remains a real game symbol and is never used as an empty marker.
function removeWinningSymbols(
  grid: ReelGrid,
  wins: WinResult[],
): {
  grid: Array<
    Array<SymbolId | null>
  >;
  removed: WinPosition[];
} {
  const result:
    Array<
      Array<SymbolId | null>
    > = cloneGrid(grid);
  const winningPositions =
    new Set(
      wins.flatMap((win) =>
        win.positions.map(
          ({ reel, row }) =>
            `${reel}:${row}`,
        ),
      ),
    );
  const removed: WinPosition[] = [];
  for (
    const positionKey of winningPositions
  ) {
    const [reel, row] =
      positionKey
        .split(':')
        .map(Number);
    result[reel][row] = null;
    removed.push({
      reel,
      row,
    });
  }
  return {
    grid: result,
    removed,
  };
}
// Collapse each reel downward after winning symbols are removed.
// Empty positions remain at the top until the refill step.
function collapseReels(
  grid: Array<
    Array<SymbolId | null>
  >,
): Array<
  Array<SymbolId | null>
> {
  return grid.map((reel) => {
    const remaining =
      reel.filter(
        (
          symbol,
        ): symbol is SymbolId =>
          symbol !== null,
      );
    return [
      ...Array.from(
        {
          length:
            3 - remaining.length,
        },
        () => null,
      ),
      ...remaining,
    ];
  });
}
// Refill the empty positions created by the cascade.
// The number of replacements is based on how many symbols
// were removed from each reel.
function refillReels(
  grid: Array<
    Array<SymbolId | null>
  >,
  removed: WinPosition[],
): {
  grid: ReelGrid;
  draws: RngDrawTrace[];
} {
  /*
   * This is the strict type boundary:
   *
   * nullable cascade state goes in,
   * fully populated ReelGrid comes out.
   */
  const result: ReelGrid = [];
  const draws: RngDrawTrace[] = [];
  for (let reel = 0; reel < 5; reel++) {
    const replacementCount =
      removed.filter(
        (position) =>
          position.reel === reel,
      ).length;
    const replacements: SymbolId[] = [];
    for (
      let row = 0;
      row < replacementCount;
      row++
    ) {
      replacements.push(
        randomSymbol(
          reel,
          row,
          draws,
        ),
      );
    }
    const remaining =
      grid[reel].filter(
        (
          symbol,
        ): symbol is SymbolId =>
          symbol !== null,
      );
    result.push([
      ...replacements,
      ...remaining,
    ]);
  }
  return {
    grid: result,
    draws,
  };
}
function calculateTotalPayoutMultiplier(
  wins: WinResult[],
): number {
  return wins.reduce(
    (total, win) =>
      total + win.payoutMultiplier,
    0,
  );
}
export interface GridEvaluationResult {
  grid: ReelGrid;
  wins: WinResult[];
  totalPayoutMultiplier: number;
}
export function evaluatePrimaryGrid(
  primary: GridGenerationTrace,
): GridEvaluationResult & {
  trace: SpinMathTrace;
} {
  const evaluation =
    evaluateWins(primary.grid);
  return {
    grid: primary.grid,
    wins: evaluation.wins,
    totalPayoutMultiplier:
      calculateTotalPayoutMultiplier(
        evaluation.wins,
      ),
    trace: {
      primary,
      primaryEvaluations:
        evaluation.evaluations,
      cascades: [],
    },
  };
}
export interface CascadeStep {
  grid: ReelGrid;
  wins: WinResult[];
  totalPayoutMultiplier: number;
}
export interface CascadeResult {
  steps: CascadeStep[];
  finalGrid: ReelGrid;
  totalPayoutMultiplier: number;
  trace: CascadeResolutionTrace[];
}
export interface CascadeStepResult {
  grid: ReelGrid;
  removed: WinPosition[];
  removedSymbols: Array<{
    position: WinPosition;
    symbol: SymbolId;
  }>;
  collapsed: Array<Array<SymbolId | null>>;
  refillDraws: RngDrawTrace[];
}
export function resolveCascadeStep(
  grid: ReelGrid,
  wins: WinResult[],
): CascadeStepResult {
  const removedSymbols = wins
    .flatMap((win) =>
      win.positions.map((position) => ({
        position,
        symbol: grid[position.reel][position.row] as SymbolId,
      })),
    )
    .filter(
      (entry, index, entries) =>
        entries.findIndex(
          (other) =>
            other.position.reel === entry.position.reel &&
            other.position.row === entry.position.row,
        ) === index,
    );
  const removal = removeWinningSymbols(grid, wins);
  const collapsed = collapseReels(removal.grid);
  const refill = refillReels(collapsed, removal.removed);
  return {
    grid: refill.grid,
    removed: removal.removed,
    removedSymbols,
    collapsed,
    refillDraws: refill.draws,
  };
}
// Resolve cascades until the current grid produces no wins.
// Each step records the winning grid, payout, and resulting grid
// so the presentation layer can animate the complete sequence.
export function resolveCascades(
  initialGrid: ReelGrid,
): CascadeResult {
  let grid =
    cloneGrid(initialGrid);
  const steps: CascadeStep[] = [];
  const trace: CascadeResolutionTrace[] = [];
  while (true) {
    const evaluation =
      evaluateWins(grid);
    if (
      evaluation.wins.length === 0
    ) {
      break;
    }
    const totalPayoutMultiplier =
      calculateTotalPayoutMultiplier(
        evaluation.wins,
      );
    steps.push({
      grid: cloneGrid(grid),
      wins: evaluation.wins,
      totalPayoutMultiplier,
    });
    const removedSymbols =
      evaluation.wins
        .flatMap((win) =>
          win.positions.map(
            (position) => ({
              position,
              symbol:
                grid[
                position.reel
                ][position.row],
            }),
          ),
        )
        .filter(
          (entry, index, all) =>
            all.findIndex(
              (candidate) =>
                candidate.position.reel ===
                entry.position.reel &&
                candidate.position.row ===
                entry.position.row,
            ) === index,
        );
    const removal =
      removeWinningSymbols(
        grid,
        evaluation.wins,
      );
    const collapsed =
      collapseReels(
        removal.grid,
      );
    const refill =
      refillReels(
        collapsed,
        removal.removed,
      );
    grid = refill.grid;
    const nextEvaluation =
      evaluateWins(grid);
    trace.push({
      index:
        trace.length + 1,
      grid: cloneGrid(grid),
      wins:
        nextEvaluation.wins,
      evaluations:
        nextEvaluation.evaluations,
      removed:
        removal.removed,
      removedSymbols,
      collapsed,
      refillDraws:
        refill.draws,
    });
  }
  return {
    steps,
    finalGrid: grid,
    totalPayoutMultiplier:
      steps.reduce(
        (total, step) =>
          total + step.totalPayoutMultiplier,
        0,
      ),
    trace,
  };
}