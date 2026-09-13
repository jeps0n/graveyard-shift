import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReelGrid, WinResult } from '../src/game/types';
import type { LastSpinReplay } from '../src/dev/SpinReplayController';

vi.mock('../src/presentation/GameView', () => ({ GameView: class {} }));

import { SpinReplayController } from '../src/dev/SpinReplayController';

const GRID: ReelGrid = [
  ['coffee', 'burger', 'gas'],
  ['burger', 'gas', 'chip'],
  ['gas', 'chip', 'dice'],
  ['chip', 'dice', 'gary'],
  ['dice', 'gary', 'zed'],
];
const CASCADE_GRID: ReelGrid = GRID.map((reel) => [...reel]);
const WIN: WinResult = {
  symbol: 'coffee', count: 3, payoutMultiplier: 2, payline: 1,
  positions: [{ reel: 0, row: 0 }, { reel: 1, row: 0 }, { reel: 2, row: 0 }],
};
const CASCADE_WIN: WinResult = {
  ...WIN, symbol: 'burger', payoutMultiplier: 3, payline: 2,
  positions: [{ reel: 0, row: 1 }, { reel: 1, row: 1 }, { reel: 2, row: 1 }],
};

function makeView() {
  return {
    setSpinEnabled: vi.fn(), clearWinningPaylines: vi.fn(), displayResult: vi.fn(),
    updateReplayHud: vi.fn(), animateBalanceDeductionBeat: vi.fn(async () => undefined),
    animateSpin: vi.fn(async () => undefined), animateReelStops: vi.fn(async () => undefined),
    displayWinningPaylines: vi.fn(), animateWinningSymbols: vi.fn(async () => undefined),
    animateCascadeStep: vi.fn(async () => undefined), animatePayoutBeat: vi.fn(async () => undefined),
    updateHud: vi.fn(),
  };
}
function replay(): LastSpinReplay {
  return {
    wager: 10, featureMultiplier: 5, preSpinGrid: GRID, balanceBeforeBet: 100,
    balanceAfterBet: 90, finalBalance: 340, totalWin: 250, primaryGrid: GRID,
    primaryWins: [WIN], cascades: [{ removed: WIN.positions, grid: CASCADE_GRID, wins: [CASCADE_WIN] }],
    finalGrid: CASCADE_GRID, allWins: [WIN, CASCADE_WIN],
  };
}

describe('SpinReplayController contract', () => {
  beforeEach(() => vi.useFakeTimers());

  it('reports availability and refuses replay when no snapshot exists', async () => {
    const view = makeView();
    const controller = new SpinReplayController(view as never);
    const availability = vi.fn();
    controller.setReplayAvailableHandler(availability);
    controller.setAvailability(true);
    expect(availability).toHaveBeenNthCalledWith(1, false);
    expect(availability).toHaveBeenNthCalledWith(2, false);
    expect(await controller.replayLastSpin({ balance: 100, bet: 10, win: 0, activeIncrement: 5 })).toBe(false);
  });

  it('replays captured primary/cascade wins and restores the live HUD', async () => {
    const view = makeView();
    const controller = new SpinReplayController(view as never);
    const availability = vi.fn();
    controller.setReplay(replay());
    controller.setReplayAvailableHandler(availability);

    const promise = controller.replayLastSpin({ balance: 777, bet: 25, win: 12, activeIncrement: 25 });
    expect(controller.inProgress).toBe(true);
    await vi.runAllTimersAsync();
    expect(await promise).toBe(true);

    expect(view.animateBalanceDeductionBeat).toHaveBeenCalledWith(100, 90);
    expect(view.animateReelStops).toHaveBeenCalledWith(GRID);
    expect(view.animateCascadeStep).toHaveBeenCalledWith(WIN.positions, CASCADE_GRID);
    expect(view.animateWinningSymbols).toHaveBeenCalledTimes(2);
    expect(view.animatePayoutBeat).toHaveBeenCalledWith(90, 340, 250);
    expect(view.updateHud).toHaveBeenLastCalledWith(777, 25, 12, 25);
    expect(controller.inProgress).toBe(false);
    expect(availability).toHaveBeenLastCalledWith(true);
  });
});
