import type { ReelGrid, WinResult } from '../game/types';
import { GameView } from '../presentation/GameView';
const CASCADE_DELAY = 800;
export interface ReplayCascadeStep {
  readonly removed: Array<{ reel: number; row: number }>;
  readonly grid: ReelGrid;
  readonly wins: WinResult[];
}
export interface LastSpinReplay {
  readonly wager: number;
  readonly featureMultiplier: number;
  readonly preSpinGrid: ReelGrid;
  readonly balanceBeforeBet: number;
  readonly balanceAfterBet: number;
  readonly finalBalance: number;
  readonly totalWin: number;
  readonly primaryGrid: ReelGrid;
  readonly primaryWins: WinResult[];
  readonly cascades: ReplayCascadeStep[];
  readonly finalGrid: ReelGrid;
  readonly allWins: WinResult[];
}
export interface ReplayLiveHud {
  readonly balance: number;
  readonly bet: number;
  readonly win: number;
  readonly activeIncrement: 1 | 5 | 25;
}
function cloneWins(wins: WinResult[]): WinResult[] {
  return wins.map((win) => ({
    ...win,
    positions: win.positions.map((position) => ({ ...position })),
  }));
}
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
export class SpinReplayController {
  private replay: LastSpinReplay | null = null;
  private replayInProgress = false;
  private onReplayAvailable: ((available: boolean) => void) | null = null;
  private readonly view: GameView;
  constructor(view: GameView) {
    this.view = view;
  }
  get inProgress(): boolean {
    return this.replayInProgress;
  }
  setReplay(replay: LastSpinReplay): void {
    this.replay = replay;
  }
  setReplayAvailableHandler(handler: (available: boolean) => void): void {
    this.onReplayAvailable = handler;
    handler(this.replay !== null);
  }
  setAvailability(available: boolean): void {
    this.onReplayAvailable?.(available && this.replay !== null);
  }
  async replayLastSpin(liveHud: ReplayLiveHud): Promise<boolean> {
    if (this.replayInProgress || !this.replay) {
      return false;
    }
    const replay = this.replay;
    this.replayInProgress = true;
    this.setAvailability(false);
    this.view.setSpinEnabled(false);
    this.view.clearWinningPaylines();
    try {
      // Restore the exact historical state before SPIN was pressed.
      this.view.displayResult(replay.preSpinGrid);
      this.view.updateReplayHud(
        replay.balanceBeforeBet,
        replay.wager,
        0,
      );
      // Reproduce the exact same financial presentation used by LIVE.
      await this.view.animateBalanceDeductionBeat(
        replay.balanceBeforeBet,
        replay.balanceAfterBet,
      );
      // Replay the captured spin presentation.
      await this.view.animateSpin();
      await this.view.animateReelStops(replay.primaryGrid);
      const cumulativeWins = cloneWins(replay.primaryWins);
      if (replay.primaryWins.length > 0) {
        this.view.displayWinningPaylines(cumulativeWins);
        await this.view.animateWinningSymbols(replay.primaryWins);
      }
      for (const cascade of replay.cascades) {
        await this.view.animateCascadeStep(
          cascade.removed,
          cascade.grid,
        );
        this.view.displayWinningPaylines(cumulativeWins);
        await delay(CASCADE_DELAY);
        if (cascade.wins.length > 0) {
          cumulativeWins.push(...cloneWins(cascade.wins));
          this.view.displayWinningPaylines(cumulativeWins);
          await this.view.animateWinningSymbols(cascade.wins);
        }
      }
      // Match live payout presentation exactly: paint the complete final
      // financial state once, then run the same WIN -> BALANCE beat cadence.
      this.view.displayResult(replay.finalGrid);
      this.view.displayWinningPaylines(replay.allWins);
      this.view.updateReplayHud(
        replay.finalBalance,
        replay.wager,
        replay.totalWin,
      );
      if (replay.totalWin > 0) {
        await this.view.animatePayoutBeat(
          replay.balanceAfterBet,
          replay.finalBalance,
          replay.totalWin,
        );
      }
      // Deliberate settlement/readability hold. Replay availability remains
      // disabled until this completes and the live HUD is restored below.
      await delay(200);
      return true;
    } finally {
      this.replayInProgress = false;
      this.view.updateHud(
        liveHud.balance,
        liveHud.bet,
        liveHud.win,
        liveHud.activeIncrement,
      );
      this.setAvailability(true);
    }
  }
}
