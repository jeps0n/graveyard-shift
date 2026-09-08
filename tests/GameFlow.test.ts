import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReelGrid, WinResult } from '../src/game/types';

const mathMocks = vi.hoisted(() => ({
  generatePrimaryGrid: vi.fn(),
  evaluatePrimaryGrid: vi.fn(),
  evaluateWins: vi.fn(),
  resolveCascadeStep: vi.fn(),
}));

vi.mock('../src/math/GameMath', () => mathMocks);

vi.mock('../src/presentation/GameView', () => {
  class MockButton {
    on = vi.fn();
  }

  return {
    GameView: class {
      spinButton = new MockButton();
      betDownButton = new MockButton();
      betUpButton = new MockButton();
      bet1Button = new MockButton();
      bet5Button = new MockButton();
      bet25Button = new MockButton();
      maxBetButton = new MockButton();

      clearWinningPaylines = vi.fn();
      animateSpin = vi.fn(async () => undefined);
      animateReelStops = vi.fn(async () => undefined);
      setSpinEnabled = vi.fn();
      displayResult = vi.fn();
      displayWinningPaylines = vi.fn();
      animateWinningSymbols = vi.fn(async () => undefined);
      animateCascadeStep = vi.fn(async () => undefined);
      animateWagerBeat = vi.fn();
      updateHud = vi.fn();

      showAfterMidnight = vi.fn(
        async (_resolveChoice: (choice: 'gasCan' | 'candyBar' | 'plushDoll') => number) => 5,
      );
    },
  };
});

vi.mock('../src/presentation/DevReceipt', () => {
  return {
    DevReceipt: class {
      blur = vi.fn();
      clear = vi.fn();
      event = vi.fn();
      spinStart = vi.fn();
      primaryGrid = vi.fn();
      evaluation = vi.fn();
      winResult = vi.fn();
      cascadeStart = vi.fn();
      winningPositionsRemoved = vi.fn();
      gridAfterCollapse = vi.fn();
      refill = vi.fn();
      cascadeGrid = vi.fn();
      finalGrid = vi.fn();
      finalResult = vi.fn();
      afterMidnight = vi.fn();
      pick = vi.fn();
      nextSpin = vi.fn();
    },
  };
});

import { Game } from '../src/game/Game';

const NO_WIN_GRID: ReelGrid = [
  ['coffee', 'burger', 'gas'],
  ['burger', 'gas', 'chip'],
  ['gas', 'chip', 'dice'],
  ['chip', 'dice', 'gary'],
  ['dice', 'gary', 'zed'],
];

const THREE_SCATTER_GRID: ReelGrid = [
  ['scatter', 'burger', 'gas'],
  ['coffee', 'scatter', 'chip'],
  ['gas', 'chip', 'scatter'],
  ['chip', 'dice', 'gary'],
  ['dice', 'gary', 'zed'],
];

const FOUR_SCATTER_GRID: ReelGrid = [
  ['scatter', 'burger', 'scatter'],
  ['coffee', 'scatter', 'chip'],
  ['gas', 'chip', 'scatter'],
  ['chip', 'dice', 'gary'],
  ['dice', 'gary', 'zed'],
];

const PRIMARY_WIN_GRID: ReelGrid = [
  ['coffee', 'burger', 'gas'],
  ['coffee', 'gas', 'chip'],
  ['coffee', 'chip', 'dice'],
  ['zed', 'dice', 'gary'],
  ['victor', 'gary', 'zed'],
];

function cloneGrid(grid: ReelGrid): ReelGrid {
  return grid.map((reel) => [...reel]);
}

function makeWin(
  payoutMultiplier: number,
  symbol: WinResult['symbol'] = 'coffee',
): WinResult {
  return {
    symbol,
    count: 3,
    payoutMultiplier,
    payline: 1,
    positions: [
      { reel: 0, row: 0 },
      { reel: 1, row: 0 },
      { reel: 2, row: 0 },
    ],
  };
}

function primaryTrace(grid: ReelGrid) {
  return {
    draws: [],
    grid: cloneGrid(grid),
  };
}

function primaryResult(
  grid: ReelGrid,
  wins: WinResult[],
) {
  return {
    grid: cloneGrid(grid),
    wins,
    totalPayoutMultiplier: wins.reduce(
      (total, win) => total + win.payoutMultiplier,
      0,
    ),
    trace: {
      primary: primaryTrace(grid),
      primaryEvaluations: [],
      cascades: [],
    },
  };
}

function cascadeStepResult(grid: ReelGrid) {
  return {
    grid: cloneGrid(grid),
    removed: [
      { reel: 0, row: 0 },
      { reel: 1, row: 0 },
      { reel: 2, row: 0 },
    ],
    removedSymbols: [
      { position: { reel: 0, row: 0 }, symbol: 'coffee' as const },
      { position: { reel: 1, row: 0 }, symbol: 'coffee' as const },
      { position: { reel: 2, row: 0 }, symbol: 'coffee' as const },
    ],
    collapsed: cloneGrid(grid),
    refillDraws: [],
  };
}

function createGame() {
  const app = {
    stage: {
      addChild: vi.fn(),
    },
  };

  return new Game(app as never);
}

async function runSpin(game: Game): Promise<void> {
  await (game as unknown as { handleSpin: () => Promise<void> }).handleSpin();
}

function setBet(game: Game, bet: number): void {
  (game as unknown as { bet: number }).bet = bet;
}

function setNextSpinMultiplier(game: Game, multiplier: number): void {
  (game as unknown as { nextSpinMultiplier: number }).nextSpinMultiplier =
    multiplier;
}

function getBalance(game: Game): number {
  return (game as unknown as { balance: number }).balance;
}

function getNextSpinMultiplier(game: Game): number {
  return (game as unknown as { nextSpinMultiplier: number })
    .nextSpinMultiplier;
}

function getState(game: Game): string {
  return (
    game as unknown as {
      stateMachine: { current: string };
    }
  ).stateMachine.current;
}

function mockNoWinSpin(grid: ReelGrid = NO_WIN_GRID): void {
  const primary = primaryTrace(grid);

  mathMocks.generatePrimaryGrid.mockReturnValueOnce(primary);
  mathMocks.evaluatePrimaryGrid.mockReturnValueOnce(
    primaryResult(grid, []),
  );
}

function mockWinningSpin(options: {
  primaryWins: WinResult[];
  finalGrid?: ReelGrid;
  cascadeWins?: WinResult[];
}): void {
  const {
    primaryWins,
    finalGrid = NO_WIN_GRID,
    cascadeWins = [],
  } = options;

  const primary = primaryTrace(PRIMARY_WIN_GRID);

  mathMocks.generatePrimaryGrid.mockReturnValueOnce(primary);
  mathMocks.evaluatePrimaryGrid.mockReturnValueOnce(
    primaryResult(PRIMARY_WIN_GRID, primaryWins),
  );
  mathMocks.resolveCascadeStep.mockReturnValueOnce(
    cascadeStepResult(finalGrid),
  );
  mathMocks.evaluateWins.mockReturnValueOnce({
    wins: cascadeWins,
    evaluations: [],
  });

  if (cascadeWins.length > 0) {
    mathMocks.resolveCascadeStep.mockReturnValueOnce(
      cascadeStepResult(finalGrid),
    );
    mathMocks.evaluateWins.mockReturnValueOnce({
      wins: [],
      evaluations: [],
    });
  }
}

describe('Game flow contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubGlobal('window', {
      addEventListener: vi.fn(),
    });

    vi.spyOn(globalThis, 'setTimeout').mockImplementation(
      ((callback: TimerHandler) => {
        if (typeof callback === 'function') {
          callback();
        }
        return 0;
      }) as typeof setTimeout,
    );
  });

  it('deducts the wager exactly once for a completed losing spin', async () => {
    mockNoWinSpin();

    const game = createGame();
    setBet(game, 10);

    await runSpin(game);

    expect(getBalance(game)).toBe(90);
    expect(getState(game)).toBe('IDLE');
  });

  it('pays line wins using the total wager', async () => {
    mockWinningSpin({
      primaryWins: [makeWin(3)],
    });

    const game = createGame();
    setBet(game, 10);

    await runSpin(game);

    expect(getBalance(game)).toBe(120);
  });

  it('adds multiple primary line-win multipliers before applying the wager', async () => {
    mockWinningSpin({
      primaryWins: [
        makeWin(2, 'coffee'),
        { ...makeWin(5, 'marge'), payline: 2 },
      ],
    });

    const game = createGame();
    setBet(game, 10);

    await runSpin(game);

    expect(getBalance(game)).toBe(160);
  });

  it('accumulates primary and cascade wins into one spin payout', async () => {
    mockWinningSpin({
      primaryWins: [makeWin(2)],
      cascadeWins: [makeWin(5, 'marge')],
    });

    const game = createGame();
    setBet(game, 10);

    await runSpin(game);

    expect(getBalance(game)).toBe(160);
    expect(mathMocks.resolveCascadeStep).toHaveBeenCalledTimes(2);
  });

  it('applies an armed multiplier to the entire spin including cascade wins', async () => {
    mockWinningSpin({
      primaryWins: [makeWin(2)],
      cascadeWins: [makeWin(3, 'dice')],
    });

    const game = createGame();
    setBet(game, 10);
    setNextSpinMultiplier(game, 5);

    await runSpin(game);

    expect(getBalance(game)).toBe(340);
  });

  it('consumes the armed multiplier when the spin starts and resets stored multiplier to x1', async () => {
    mockNoWinSpin();

    const game = createGame();
    setBet(game, 10);
    setNextSpinMultiplier(game, 5);

    await runSpin(game);

    expect(getBalance(game)).toBe(90);
    expect(getNextSpinMultiplier(game)).toBe(1);
  });

  it('does not apply a newly won After Midnight multiplier to the triggering spin', async () => {
    mockWinningSpin({
      primaryWins: [makeWin(2)],
      finalGrid: THREE_SCATTER_GRID,
    });

    const game = createGame();
    setBet(game, 10);

    const view = game.view as unknown as {
      showAfterMidnight: ReturnType<typeof vi.fn>;
    };
    view.showAfterMidnight.mockResolvedValueOnce(10);

    await runSpin(game);

    expect(getBalance(game)).toBe(110);
    expect(getNextSpinMultiplier(game)).toBe(10);
    expect(view.showAfterMidnight).toHaveBeenCalledTimes(1);
  });

  it('triggers After Midnight once when the final resolved grid has 3 or more Scatters', async () => {
    mockWinningSpin({
      primaryWins: [makeWin(1)],
      finalGrid: FOUR_SCATTER_GRID,
    });

    const game = createGame();
    setBet(game, 10);

    const view = game.view as unknown as {
      showAfterMidnight: ReturnType<typeof vi.fn>;
    };
    view.showAfterMidnight.mockResolvedValueOnce(5);

    await runSpin(game);

    expect(view.showAfterMidnight).toHaveBeenCalledTimes(1);
    expect(getNextSpinMultiplier(game)).toBe(5);
  });

  it('uses a won multiplier on the following spin and only that spin', async () => {
    mockWinningSpin({
      primaryWins: [makeWin(2)],
      finalGrid: THREE_SCATTER_GRID,
    });
    mockWinningSpin({
      primaryWins: [makeWin(2)],
      finalGrid: NO_WIN_GRID,
    });
    mockWinningSpin({
      primaryWins: [makeWin(2)],
      finalGrid: NO_WIN_GRID,
    });

    const game = createGame();
    setBet(game, 10);

    const view = game.view as unknown as {
      showAfterMidnight: ReturnType<typeof vi.fn>;
    };
    view.showAfterMidnight.mockResolvedValueOnce(5);

    await runSpin(game);
    expect(getBalance(game)).toBe(110);
    expect(getNextSpinMultiplier(game)).toBe(5);

    await runSpin(game);
    expect(getBalance(game)).toBe(200);
    expect(getNextSpinMultiplier(game)).toBe(1);

    await runSpin(game);
    expect(getBalance(game)).toBe(210);
    expect(getNextSpinMultiplier(game)).toBe(1);
  });

  it('allows a multiplied spin to retrigger After Midnight for the next spin', async () => {
    mockWinningSpin({
      primaryWins: [makeWin(2)],
      finalGrid: THREE_SCATTER_GRID,
    });

    const game = createGame();
    setBet(game, 10);
    setNextSpinMultiplier(game, 5);

    const view = game.view as unknown as {
      showAfterMidnight: ReturnType<typeof vi.fn>;
    };
    view.showAfterMidnight.mockResolvedValueOnce(10);

    await runSpin(game);

    expect(getBalance(game)).toBe(190);
    expect(getNextSpinMultiplier(game)).toBe(10);
    expect(view.showAfterMidnight).toHaveBeenCalledTimes(1);
  });
});
