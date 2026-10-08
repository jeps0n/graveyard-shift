import type { ReelGrid, WinResult } from '../game/types';
import type { LastSpinReplay } from './SpinReplayController';

export interface DebugSpinSnapshot {
  readonly label: string;
  readonly receiptSection: 'PRE-SPIN GRID' | 'PRIMARY GRID' | 'CASCADE GRID' | 'FINAL GRID';
  readonly cascadeIndex?: number;
  readonly grid: ReelGrid;
  readonly wins: WinResult[];
}

/** Resolved evaluation states only; no RNG or game-state mutation. */
export function createDebugSpinSnapshots(replay: LastSpinReplay): DebugSpinSnapshot[] {
  const cloneGrid = (grid: ReelGrid) => grid.map((reel) => [...reel]);
  const cloneWins = (wins: WinResult[]) => wins.map((win) => ({
    ...win,
    positions: win.positions.map((position) => ({ ...position })),
  }));
  const snapshots: DebugSpinSnapshot[] = [
    { label: 'Pre-Spin Grid', receiptSection: 'PRE-SPIN GRID', grid: cloneGrid(replay.preSpinGrid), wins: [] },
    { label: 'Initial Grid', receiptSection: 'PRIMARY GRID', grid: cloneGrid(replay.primaryGrid), wins: cloneWins(replay.primaryWins) },
  ];
  replay.cascades.forEach((cascade, index) => {
    snapshots.push({
      label: `Cascade ${index + 1} of ${replay.cascades.length}`,
      receiptSection: 'CASCADE GRID',
      cascadeIndex: index,
      grid: cloneGrid(cascade.grid),
      wins: cloneWins(cascade.wins),
    });
  });
  snapshots.push({ label: 'Final Grid', receiptSection: 'FINAL GRID', grid: cloneGrid(replay.finalGrid), wins: [] });
  return snapshots;
}
