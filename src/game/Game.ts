import type { Application } from 'pixi.js';
import { AfterMidnight } from '../features/AfterMidnight';
import {
  SpinReplayController,
  type LastSpinReplay,
} from '../dev/SpinReplayController';
import {
  evaluatePrimaryGrid,
  evaluateWins,
  generatePrimaryGrid,
  resolveCascadeStep,
} from '../math/GameMath';
import { DevReceipt } from '../presentation/DevReceipt';
import { GameView } from '../presentation/GameView';
import { GameStateMachine } from './GameStateMachine';
import type {
  GameResult,
  ReelGrid,
  WinResult,
} from './types';
const CASCADE_DELAY = 800;
const SCATTER_TRIGGER_COUNT = 3;
type BetIncrement = 1 | 5 | 25;
function cloneWins(wins: WinResult[]): WinResult[] {
  return wins.map((win) => ({
    ...win,
    positions: win.positions.map((position) => ({ ...position })),
  }));
}
const INITIAL_DISPLAYED_GRID: ReelGrid = [
  ['coffee', 'burger', 'gas'],
  ['chip', 'dice', 'zed'],
  ['gary', 'barkley', 'victor'],
  ['marge', 'coffee', 'burger'],
  ['gas', 'scatter', 'chip'],
];
function cloneGrid(
  grid: ReelGrid,
): ReelGrid {
  return grid.map((reel) => [...reel]);
}
function delay(
  ms: number,
): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
export class Game {
  readonly view: GameView;
  private balance = 100;
  private bet = 0;
  private betIncrement: BetIncrement = 1;
  private nextSpinMultiplier = 1;
  private spinNumber = 0;
  private currentGrid: ReelGrid =
    cloneGrid(
      INITIAL_DISPLAYED_GRID,
    );
  private readonly stateMachine =
    new GameStateMachine();
  private afterMidnight =
    new AfterMidnight();
  private readonly devReceipt: DevReceipt;
  private forceAfterMidnightNextSpin = false;
  private onAfterMidnightDevTriggerConsumed: (() => void) | null = null;
  private replayCapture: LastSpinReplay | null = null;
  private readonly spinReplayController: SpinReplayController;
  private currentWin = 0;
  constructor(
    app: Application,
    devReceiptHost?: HTMLElement,
  ) {
    this.devReceipt = new DevReceipt(devReceiptHost);
    this.view = new GameView();
    this.spinReplayController = new SpinReplayController(this.view);
    app.stage.addChild(this.view);
    this.view.spinButton.on(
      'pointertap',
      () => {
        this.devReceipt.blur();
        void this.handleSpin();
      },
    );
    this.view.clearBetButton.on(
      'pointertap',
      () => {
        this.clearBet();
      },
    );
    this.view.betDownButton.on(
      'pointertap',
      () => {
        this.decreaseBet();
      },
    );
    this.view.betUpButton.on(
      'pointertap',
      () => {
        this.increaseBet();
      },
    );
    this.view.bet1Button.on(
      'pointertap',
      () => {
        this.quickAddBet(1);
      },
    );
    this.view.bet5Button.on(
      'pointertap',
      () => {
        this.quickAddBet(5);
      },
    );
    this.view.bet25Button.on(
      'pointertap',
      () => {
        this.quickAddBet(25);
      },
    );
    this.view.maxBetButton.on(
      'pointertap',
      () => {
        this.setMaxBet();
      },
    );
    window.addEventListener(
      'keydown',
      (event) => {
        if (event.code !== 'Space') {
          return;
        }
        event.preventDefault();
        void this.handleSpin();
      },
    );
    this.updateHud();
  }
  private clearBet(): void {
    if (this.stateMachine.current !== 'IDLE' || this.spinReplayController.inProgress) {
      return;
    }
    if (this.bet === 0) {
      return;
    }
    this.bet = 0;
    this.updateHud();
    this.view.animateWagerBeat();
  }
  private decreaseBet(): void {
    if (this.stateMachine.current !== 'IDLE' || this.spinReplayController.inProgress) {
      return;
    }
    this.bet = Math.max(
      0,
      this.bet - this.betIncrement,
    );
    this.updateHud();
    this.view.animateWagerBeat();
  }
  private increaseBet(): void {
    if (this.stateMachine.current !== 'IDLE' || this.spinReplayController.inProgress) {
      return;
    }
    const maxBet = Math.min(
      this.balance,
      100,
    );
    const nextBet = Math.min(
      maxBet,
      this.bet + this.betIncrement,
    );
    if (nextBet === this.bet) {
      return;
    }
    this.bet = nextBet;
    this.updateHud();
    this.view.animateWagerBeat();
  }
  private quickAddBet(
    increment: BetIncrement,
  ): void {
    if (this.stateMachine.current !== 'IDLE' || this.spinReplayController.inProgress) {
      return;
    }
    this.betIncrement = increment;
    const maxBet = Math.min(
      this.balance,
      100,
    );
    this.bet = Math.min(
      maxBet,
      this.bet + increment,
    );
    this.updateHud();
    this.view.animateWagerBeat();
  }
  private setMaxBet(): void {
    if (this.stateMachine.current !== 'IDLE' || this.spinReplayController.inProgress) {
      return;
    }
    this.bet = Math.min(
      this.balance,
      100,
    );
    this.updateHud();
    this.view.animateWagerBeat(1.09);
  }
  setDevMode(enabled: boolean): void {
    this.devReceipt.setVisible(enabled);
    this.view.setDevMode(enabled);
  }
  armAfterMidnightTrigger(): boolean {
    if (this.stateMachine.current !== 'IDLE' || this.spinReplayController.inProgress || this.forceAfterMidnightNextSpin) {
      return false;
    }
    this.forceAfterMidnightNextSpin = true;
    return true;
  }
  setAfterMidnightDevTriggerConsumedHandler(handler: () => void): void {
    this.onAfterMidnightDevTriggerConsumed = handler;
  }
  setLastSpinReplayAvailableHandler(handler: (available: boolean) => void): void {
    this.spinReplayController.setReplayAvailableHandler(handler);
  }
  async replayLastSpin(): Promise<boolean> {
    if (this.stateMachine.current !== 'IDLE' || this.spinReplayController.inProgress) {
      return false;
    }
    return this.spinReplayController.replayLastSpin({
      balance: this.balance,
      bet: this.bet,
      win: this.currentWin,
      activeIncrement: this.betIncrement,
    });
  }
  private async handleSpin(): Promise<void> {
    if (
      this.stateMachine.current !==
      'IDLE' || this.spinReplayController.inProgress
    ) {
      return;
    }
    if (this.bet <= 0) {
      return;
    }
    if (this.balance < this.bet) {
      return;
    }
    this.spinReplayController.setAvailability(false);
    this.devReceipt.clear();
    const preSpinGrid = cloneGrid(
      this.currentGrid,
    );
    const balanceBeforeBet =
      this.balance;
    this.devReceipt.event(
      'SPIN REQUEST ACCEPTED',
      [
        `STATE            ${this.stateMachine.current}`,
        `BALANCE          $${balanceBeforeBet.toFixed(2)}`,
      ],
    );
    this.view.clearWinningPaylines();
    this.stateMachine.transition(
      'SPINNING',
    );
    this.view.setSpinBusy(true);
    this.balance -= this.bet;
    this.currentWin = 0;
    this.view.updateHud(
      this.balance,
      this.bet,
      0,
      this.betIncrement,
    );
    await this.view.animateBalanceDeductionBeat();
    this.devReceipt.event(
      'BET DEDUCTED',
      [
        `BET              $${this.bet.toFixed(2)}`,
        `BALANCE AFTER BET $${this.balance.toFixed(2)}`,
      ],
    );
    await this.view.animateSpin();
    const primary = generatePrimaryGrid();
    // LEAVE THIS COMMENT
    // generatePrimaryGrid();
    // const primary = {
    //   grid: [
    //     ['barkley', 'marge', 'coffee'],
    //     ['gas', 'barkley', 'victor'],
    //     ['burger', 'barkley', 'gas'],
    //     ['burger', 'chip', 'dice'],
    //     ['zed', 'zed', 'dice'],
    //   ] as ReelGrid,
    //   draws: [],
    // };
    this.currentGrid = cloneGrid(primary.grid);
    await this.view.animateReelStops(primary.grid);
    this.devReceipt.event(
      'STATE TRANSITION',
      [
        'IDLE → SPINNING',
      ],
    );
    this.spinNumber++;
    const featureMultiplier =
      this.nextSpinMultiplier;
    this.nextSpinMultiplier = 1;
    this.view.setNextSpinMultiplier(1);
    this.devReceipt.spinStart(
      this.spinNumber,
      this.bet,
      featureMultiplier,
      balanceBeforeBet,
    );
    this.devReceipt.event(
      'MULTIPLIER CAPTURED',
      [
        `APPLIED TO THIS SPIN ×${featureMultiplier}`,
        'STORED MULTIPLIER RESET TO ×1',
      ],
    );
    this.devReceipt.event(
      'PRE-SPIN GRID',
      this.formatGridLines(
        preSpinGrid,
      ),
    );
    this.devReceipt.primaryGrid(
      primary.grid,
    );
    this.stateMachine.transition(
      'EVALUATING',
    );
    this.devReceipt.event(
      'STATE TRANSITION',
      [
        'SPINNING → EVALUATING',
      ],
    );
    const initialResult =
      evaluatePrimaryGrid(
        primary,
      );
    this.replayCapture = {
      wager: this.bet,
      featureMultiplier,
      preSpinGrid: cloneGrid(preSpinGrid),
      balanceBeforeBet,
      balanceAfterBet: this.balance,
      finalBalance: this.balance,
      totalWin: 0,
      primaryGrid: cloneGrid(primary.grid),
      primaryWins: cloneWins(initialResult.wins),
      cascades: [],
      finalGrid: cloneGrid(initialResult.grid),
      allWins: cloneWins(initialResult.wins),
    };
    this.devReceipt.evaluation(
      initialResult.trace.primaryEvaluations,
    );
    this.devReceipt.winResult(
      initialResult.wins,
      this.bet,
    );
    await this.evaluateResult(
      initialResult,
      featureMultiplier,
    );
    this.view.setSpinBusy(false);
  }
  private async evaluateResult(
    result: ReturnType<typeof evaluatePrimaryGrid>,
    featureMultiplier: number,
  ): Promise<void> {
    if (result.wins.length === 0) {
      this.devReceipt.event(
        'NO CASCADE RESOLUTION',
        [
          'PRIMARY GRID HAS NO WIN',
        ],
      );
      this.devReceipt.finalGrid(
        result.grid,
      );
      const basePayoutMultiplier = 0;
      const totalWinAmount = 0;
      this.devReceipt.finalResult(
        basePayoutMultiplier,
        this.bet,
        featureMultiplier,
        totalWinAmount,
        // this.balance,
        // this.balance,
      );
      this.commitReplayCapture(result.grid, result.wins, totalWinAmount);
      await this.finishSpin({
        grid: result.grid,
        wins: result.wins,
        totalWin: totalWinAmount,
      });
      const scatterCount =
        this.countScatters(
          result.grid,
        );
      if (
        this.consumeForcedAfterMidnight() ||
        scatterCount >= SCATTER_TRIGGER_COUNT
      ) {
        await this.triggerAfterMidnight(
          scatterCount,
        );
      }
      this.spinReplayController.setAvailability(true);
      return;
    }
    this.stateMachine.transition(
      'WIN_PRESENTATION',
    );
    this.devReceipt.event(
      'STATE TRANSITION',
      [
        'EVALUATING → WIN_PRESENTATION',
      ],
    );
    this.view.displayResult(
      result.grid,
    );
    this.view.displayWinningPaylines(
      result.wins,
    );
    await this.view.animateWinningSymbols(result.wins);
    this.devReceipt.event(
      'WIN PRESENTATION',
      [
        `WIN LINES        ${result.wins.length}`,
      ],
    );
    this.stateMachine.transition(
      'CASCADING',
    );
    this.devReceipt.event(
      'STATE TRANSITION',
      [
        'WIN_PRESENTATION → CASCADING',
      ],
    );
    let cascadeGrid = cloneGrid(result.grid);
    let cascadeWins = [...result.wins];
    const cumulativeWins: WinResult[] = [...result.wins];
    let cascadeIndex = 0;
    while (cascadeWins.length > 0) {
      cascadeIndex += 1;
      const step = resolveCascadeStep(cascadeGrid, cascadeWins);
      this.devReceipt.cascadeStart(cascadeIndex);
      this.devReceipt.winningPositionsRemoved(step.removedSymbols);
      this.devReceipt.gridAfterCollapse(step.collapsed);
      this.devReceipt.refill(step.refillDraws);
      cascadeGrid = cloneGrid(step.grid);
      await this.view.animateCascadeStep(
        step.removed,
        cascadeGrid,
      );
      this.view.displayWinningPaylines(cumulativeWins);
      this.currentGrid = cloneGrid(cascadeGrid);
      this.devReceipt.cascadeGrid(cascadeGrid);
      await delay(CASCADE_DELAY);
      this.stateMachine.transition('EVALUATING');
      this.devReceipt.event('STATE TRANSITION', [
        'CASCADING → EVALUATING',
      ]);
      const evaluation = evaluateWins(cascadeGrid);
      this.devReceipt.evaluation(evaluation.evaluations);
      this.devReceipt.winResult(evaluation.wins, this.bet);
      cascadeWins = evaluation.wins;
      this.replayCapture?.cascades.push({
        removed: step.removed.map((position) => ({ ...position })),
        grid: cloneGrid(cascadeGrid),
        wins: cloneWins(cascadeWins),
      });
      if (cascadeWins.length > 0) {
        cumulativeWins.push(...cascadeWins);
        this.view.displayWinningPaylines(cumulativeWins);
        await this.view.animateWinningSymbols(cascadeWins);
        this.stateMachine.transition('CASCADING');
        this.devReceipt.event('STATE TRANSITION', [
          'EVALUATING → CASCADING',
        ]);
      }
    }
    const basePayoutMultiplier = cumulativeWins.reduce(
      (total, win) => total + win.payoutMultiplier,
      0,
    );
    const totalWinAmount =
      basePayoutMultiplier * this.bet * featureMultiplier;
    const finalResult: GameResult = {
      grid: cascadeGrid,
      wins: cumulativeWins,
      totalWin: totalWinAmount,
    };
    this.currentGrid =
      cloneGrid(
        finalResult.grid,
      );
    this.devReceipt.finalGrid(
      finalResult.grid,
    );
    this.devReceipt.finalResult(
      basePayoutMultiplier,
      this.bet,
      featureMultiplier,
      totalWinAmount,
      // this.balance,
      // this.balance + totalWin,
    );
    this.commitReplayCapture(finalResult.grid, finalResult.wins, totalWinAmount);
    await this.finishSpin(
      finalResult,
    );
    // Scatter stays live through cascades. Because Scatter never
    // participates in line wins, existing Scatters persist while refill
    // symbols can add more. Check the final resolved grid once so After
    // Midnight can trigger at most once for this spin.
    const scatterCount =
      this.countScatters(
        cascadeGrid,
      );
    if (
      this.consumeForcedAfterMidnight() ||
      scatterCount >= SCATTER_TRIGGER_COUNT
    ) {
      await this.triggerAfterMidnight(
        scatterCount,
      );
    }
    this.spinReplayController.setAvailability(true);
  }
  private commitReplayCapture(
    finalGrid: ReelGrid,
    allWins: WinResult[],
    totalWin: number,
  ): void {
    if (!this.replayCapture) {
      return;
    }
    this.spinReplayController.setReplay({
      ...this.replayCapture,
      finalGrid: cloneGrid(finalGrid),
      allWins: cloneWins(allWins),
      totalWin,
      finalBalance: this.replayCapture.balanceAfterBet + totalWin,
    });
    this.replayCapture = null;
  }
  private consumeForcedAfterMidnight(): boolean {
    if (!this.forceAfterMidnightNextSpin) {
      return false;
    }
    this.forceAfterMidnightNextSpin = false;
    this.onAfterMidnightDevTriggerConsumed?.();
    return true;
  }
  private async triggerAfterMidnight(
    scatterCount: number,
  ): Promise<void> {
    this.devReceipt.afterMidnight(
      scatterCount,
    );
    this.afterMidnight =
      new AfterMidnight();
    const featureMultiplier =
      await this.view.showAfterMidnight(
        (choice) => {
          const result =
            this.afterMidnight.choose(
              choice,
            );
          this.devReceipt.pick(
            choice,
            result,
          );
          return result;
        },
      );
    this.nextSpinMultiplier =
      featureMultiplier;
    this.view.setNextSpinMultiplier(featureMultiplier);
    this.devReceipt.nextSpin(
      featureMultiplier,
    );
  }
  private countScatters(
    grid: ReelGrid,
  ): number {
    return grid
      .flat()
      .filter(
        (symbol) =>
          symbol === 'scatter',
      )
      .length;
  }
  private async finishSpin(
    result: GameResult,
  ): Promise<void> {
    const balanceBeforePayout =
      this.balance;
    this.balance +=
      result.totalWin;
    this.currentWin = result.totalWin;
    this.bet = Math.min(
      this.bet,
      this.balance,
      100,
    );
    this.devReceipt.event(
      'BALANCE UPDATED',
      [
        `BALANCE BEFORE  $${balanceBeforePayout.toFixed(2)}`,
        `WIN CREDITED   +$${result.totalWin.toFixed(2)}`,
        `BALANCE AFTER   $${this.balance.toFixed(2)}`,
      ],
    );
    this.view.displayResult(
      result.grid,
    );
    this.view.displayWinningPaylines(
      result.wins,
    );
    this.view.updateHud(
      this.balance,
      this.bet,
      result.totalWin,
      this.betIncrement,
    );
    if (result.totalWin > 0) {
      await this.view.animatePayoutBeat();
    }
    this.stateMachine.transition(
      'IDLE',
    );
    this.devReceipt.event(
      'STATE TRANSITION',
      [
        'EVALUATING → IDLE',
      ],
    );
  }
  private updateHud(): void {
    this.currentWin = 0;
    this.view.updateHud(
      this.balance,
      this.bet,
      0,
      this.betIncrement,
    );
  }
  private formatGridLines(
    grid: ReelGrid,
  ): string[] {
    const lines: string[] = [];
    for (let row = 0; row < 3; row++) {
      const symbols: string[] = [];
      for (let reel = 0; reel < 5; reel++) {
        symbols.push(
          grid[reel][row]
            .toUpperCase()
            .padEnd(8),
        );
      }
      lines.push(
        symbols.join('| '),
      );
    }
    return lines;
  }
}
