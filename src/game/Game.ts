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
  private readonly bet = 1;
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
  private readonly devReceipt =
    new DevReceipt();
  constructor(app: Application) {
    this.view = new GameView();
    app.stage.addChild(this.view);
    this.view.spinButton.on(
      'pointertap',
      () => {
        this.devReceipt.blur();
        void this.handleSpin();
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
  private async handleSpin(): Promise<void> {
    if (
      this.stateMachine.current !==
      'IDLE'
    ) {
      return;
    }
    if (this.balance < this.bet) {
      return;
    }
    this.devReceipt.clear();
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
    console.log('[Game] starting reel animation');
    await this.view.animateSpin();
    const primary = generatePrimaryGrid();
    this.currentGrid = cloneGrid(primary.grid);
    await this.view.animateReelStops(primary.grid);
    this.devReceipt.event(
      'STATE TRANSITION',
      [
        'IDLE → SPINNING',
      ],
    );
    this.view.setSpinEnabled(false);
    this.spinNumber++;
    const multiplier =
      this.nextSpinMultiplier;
    this.nextSpinMultiplier = 1;
    this.devReceipt.spinStart(
      this.spinNumber,
      this.bet,
      multiplier,
      balanceBeforeBet,
    );
    this.devReceipt.event(
      'MULTIPLIER CAPTURED',
      [
        `APPLIED TO THIS SPIN ×${multiplier}`,
        'STORED MULTIPLIER RESET TO ×1',
      ],
    );
    this.balance -= this.bet;
    this.devReceipt.event(
      'BET DEDUCTED',
      [
        `BET              $${this.bet.toFixed(2)}`,
        `BALANCE AFTER BET $${this.balance.toFixed(2)}`,
      ],
    );
    this.devReceipt.event(
      'PRE-SPIN GRID',
      this.formatGridLines(
        this.currentGrid,
      ),
    );
    console.log('[Game] using generated primary grid');
    this.devReceipt.primaryGrid(
      primary.grid,
    );
    this.stateMachine.transition(
      'EVALUATING',
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
    );
    await this.evaluateResult(
      initialResult,
      multiplier,
    );
  }
  private async evaluateResult(
    result: ReturnType<typeof evaluatePrimaryGrid>,
    multiplier: number,
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
      const baseWin = 0;
      const totalWin = 0;
      this.devReceipt.finalResult(
        baseWin,
        multiplier,
        totalWin,
        // this.balance,
        // this.balance,
      );
      this.finishSpin(
        result,
      );
      const scatterCount =
        this.countScatters(
          result.grid,
        );
      if (
        scatterCount >=
        SCATTER_TRIGGER_COUNT
      ) {
        await this.triggerAfterMidnight(
          scatterCount,
        );
      }
      this.view.setSpinEnabled(true);
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
    await delay(
      CASCADE_DELAY,
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
      this.view.displayResult(cascadeGrid);
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
      this.devReceipt.winResult(evaluation.wins);
      cascadeWins = evaluation.wins;
      if (cascadeWins.length > 0) {
        cumulativeWins.push(...cascadeWins);
        this.stateMachine.transition('CASCADING');
        this.devReceipt.event('STATE TRANSITION', [
          'EVALUATING → CASCADING',
        ]);
      }
    }
    const baseWin = cumulativeWins.reduce(
      (total, win) => total + win.amount,
      0,
    );
    const totalWin =
      baseWin * multiplier;
    const finalResult: GameResult = {
      grid: cascadeGrid,
      wins: cumulativeWins,
      totalWin,
    };
    this.currentGrid =
      cloneGrid(
        finalResult.grid,
      );
    this.devReceipt.finalGrid(
      finalResult.grid,
    );
    this.devReceipt.finalResult(
      baseWin,
      multiplier,
      totalWin,
      // this.balance,
      // this.balance + totalWin,
    );
    this.finishSpin(
      finalResult,
    );
    const scatterCount =
      this.countScatters(
        result.grid,
      );
    if (
      scatterCount >=
      SCATTER_TRIGGER_COUNT
    ) {
      await this.triggerAfterMidnight(
        scatterCount,
      );
    }
    this.view.setSpinEnabled(true);
  }
  private async triggerAfterMidnight(
    scatterCount: number,
  ): Promise<void> {
    this.devReceipt.afterMidnight(
      scatterCount,
    );
    this.afterMidnight =
      new AfterMidnight();
    const multiplier =
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
      multiplier;
    this.devReceipt.nextSpin(
      multiplier,
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
