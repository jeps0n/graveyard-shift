import type { Application } from 'pixi.js';
import { AfterMidnight } from '../features/AfterMidnight';
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
  constructor(
    app: Application,
    devReceiptHost?: HTMLElement,
  ) {
    this.devReceipt = new DevReceipt(devReceiptHost);
    this.view = new GameView();
    app.stage.addChild(this.view);
    this.view.spinButton.on(
      'pointertap',
      () => {
        this.devReceipt.blur();
        void this.handleSpin();
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
  private decreaseBet(): void {
    if (this.stateMachine.current !== 'IDLE') {
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
    if (this.stateMachine.current !== 'IDLE') {
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
    if (this.stateMachine.current !== 'IDLE') {
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
    if (this.stateMachine.current !== 'IDLE') {
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
    if (this.stateMachine.current !== 'IDLE' || this.forceAfterMidnightNextSpin) {
      return false;
    }
    this.forceAfterMidnightNextSpin = true;
    return true;
  }

  setAfterMidnightDevTriggerConsumedHandler(handler: () => void): void {
    this.onAfterMidnightDevTriggerConsumed = handler;
  }

  private async handleSpin(): Promise<void> {
    if (
      this.stateMachine.current !==
      'IDLE'
    ) {
      return;
    }
    if (this.bet <= 0) {
      return;
    }
    if (this.balance < this.bet) {
      return;
    }
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
    this.view.setSpinEnabled(false);
    this.balance -= this.bet;
    this.view.updateHud(
      this.balance,
      this.bet,
      0,
      this.betIncrement,
    );
    this.devReceipt.event(
      'BET DEDUCTED',
      [
        `BET              $${this.bet.toFixed(2)}`,
        `BALANCE AFTER BET $${this.balance.toFixed(2)}`,
      ],
    );
    console.log('[Game] starting reel animation');
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
    console.log('[Game] using generated primary grid');
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
      this.finishSpin({
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
    this.finishSpin(
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
  private finishSpin(
    result: GameResult,
  ): void {
    const balanceBeforePayout =
      this.balance;
    this.balance +=
      result.totalWin;
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
