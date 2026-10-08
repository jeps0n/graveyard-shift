import { describe, expect, it } from 'vitest';
import { createDebugSpinSnapshots } from '../src/dev/DebugSpinSnapshots';
import type { LastSpinReplay } from '../src/dev/SpinReplayController';
import type { ReelGrid, WinResult } from '../src/game/types';

const grid: ReelGrid = Array.from({ length: 5 }, () => ['coffee', 'burger', 'gas']);
const initialWin: WinResult = {
  symbol: 'coffee', count: 3, payoutMultiplier: 2, payline: 1,
  positions: [{ reel: 0, row: 0 }, { reel: 1, row: 0 }, { reel: 2, row: 0 }],
};
const cascadeWin: WinResult = {
  ...initialWin, symbol: 'burger', payline: 2,
  positions: [{ reel: 0, row: 1 }, { reel: 1, row: 1 }, { reel: 2, row: 1 }],
};

function history(): LastSpinReplay {
  return {
    wager: 10, featureMultiplier: 1, preSpinGrid: grid, balanceBeforeBet: 100,
    balanceAfterBet: 90, finalBalance: 140, totalWin: 50,
    primaryGrid: grid, primaryWins: [initialWin],
    cascades: [
      { removed: initialWin.positions, grid, wins: [cascadeWin] },
      { removed: cascadeWin.positions, grid, wins: [] },
    ],
    finalGrid: grid, allWins: [initialWin, cascadeWin],
  };
}

describe('Historical snapshot presentation', () => {
  it('isolates wins by evaluation and always leaves Final Grid without paylines', () => {
    const snapshots = createDebugSpinSnapshots(history());
    expect(snapshots.map((snapshot) => snapshot.label)).toEqual([
      'Pre-Spin Grid', 'Initial Grid', 'Cascade 1 of 2', 'Cascade 2 of 2', 'Final Grid',
    ]);
    expect(snapshots.map((snapshot) => snapshot.wins)).toEqual([
      [], [initialWin], [cascadeWin], [], [],
    ]);
    expect(snapshots.map((snapshot) => snapshot.receiptSection)).toEqual([
      'PRE-SPIN GRID', 'PRIMARY GRID', 'CASCADE GRID', 'CASCADE GRID', 'FINAL GRID',
    ]);
    expect(snapshots[2].cascadeIndex).toBe(0);
    expect(snapshots[3].cascadeIndex).toBe(1);
  });

  it('does not let inspector snapshots mutate recorded grids or win positions', () => {
    const replay = history();
    const snapshots = createDebugSpinSnapshots(replay);
    snapshots[1].grid[0][0] = 'dice';
    snapshots[1].wins[0].positions[0].row = 2;
    expect(replay.primaryGrid[0][0]).toBe('coffee');
    expect(replay.primaryWins[0].positions[0].row).toBe(0);
  });
});
