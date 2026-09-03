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
  payout: number;
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
function evaluatePayline(
  grid: ReelGrid,
  payline: number[],
  paylineIndex: number,
): {
  win: WinResult | null;
  trace: PaylineEvaluationTrace;
} {
  const path =
    getWinningPositions(
      payline,
      5,
    );
  const symbols = path.map(
    ({ reel, row }) =>
      grid[reel][row],
  );
  let targetSymbol:
    | SymbolId
    | null = null;
  for (let reel = 0; reel < 5; reel++) {
    const symbol =
      grid[reel][payline[reel]];
    if (symbol !== 'marge') {
      if (symbol === 'scatter') {
        return {
          win: null,
          trace: {
            payline:
              paylineIndex + 1,
            path,
            symbols,
            targetSymbol: null,
            matchedCount: 0,
            result: 'NO WIN',
            payout: 0,
            blockingSymbol:
              'scatter',
            reason:
              'Scatter cannot start a payline win.',
          },
        };
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
    const symbol =
      grid[reel][payline[reel]];
    if (
      symbol === targetSymbol ||
      symbol === 'marge'
    ) {
      count++;
    } else {
      break;
    }
  }
  if (count < 3) {
    const blockingSymbol =
      grid[count][payline[count]];
    return {
      win: null,
      trace: {
        payline:
          paylineIndex + 1,
        path,
        symbols,
        targetSymbol,
        matchedCount: count,
        result: 'NO WIN',
        payout: 0,
        blockingSymbol,
        reason:
          `Only ${count} matching position(s) before the sequence was blocked.`,
      },
    };
  }
  const payoutCount =
    Math.min(count, 5) as
    | 3
    | 4
    | 5;
  const amount =
    PAYTABLE[targetSymbol].payouts[
    payoutCount
    ];
  const win: WinResult = {
    symbol: targetSymbol,
    count: payoutCount,
    amount,
    payline:
      paylineIndex + 1,
    positions:
      getWinningPositions(
        payline,
        payoutCount,
      ),
  };
  return {
    win,
    trace: {
      payline:
        paylineIndex + 1,
      path,
      symbols,
      targetSymbol,
      matchedCount: payoutCount,
      result: 'WIN',
      payout: amount,
      blockingSymbol: null,
      reason:
        `Matched ${payoutCount} consecutive position(s).`,
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
/*
 * IMPORTANT:
 * null means an empty position during
 * cascade processing.
 *
 * 'scatter' is always a real game symbol
 * and must never be used as an internal
 * empty-slot marker.
 */
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
function calculateTotalWin(
  wins: WinResult[],
): number {
  return wins.reduce(
    (total, win) =>
      total + win.amount,
    0,
  );
}
export function evaluatePrimaryGrid(
  primary: GridGenerationTrace,
): GameResult & {
  trace: SpinMathTrace;
} {
  const evaluation =
    evaluateWins(primary.grid);
  return {
    grid: primary.grid,
    wins: evaluation.wins,
    totalWin:
      calculateTotalWin(
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
  totalWin: number;
}
export interface CascadeResult {
  steps: CascadeStep[];
  finalGrid: ReelGrid;
  totalWin: number;
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
    const totalWin =
      calculateTotalWin(
        evaluation.wins,
      );
    steps.push({
      grid: cloneGrid(grid),
      wins: evaluation.wins,
      totalWin,
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
    totalWin:
      steps.reduce(
        (total, step) =>
          total + step.totalWin,
        0,
      ),
    trace,
  };
}