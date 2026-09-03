import type { Application } from 'pixi.js';
import { resolveCascades, spinReels } from '../math/GameMath';
import { GameView } from '../presentation/GameView';
import { GameStateMachine } from './GameStateMachine';
import type { GameResult } from './types';

export class Game {
  readonly view: GameView;

  private balance = 100;
  private readonly bet = 1;
  private readonly stateMachine = new GameStateMachine();

  constructor(app: Application) {
    this.view = new GameView();

    app.stage.addChild(this.view);

    this.view.spinButton.on('pointertap', () => {
      this.handleSpin();
    });

    this.updateHud();
  }

  private handleSpin(): void {
    if (this.stateMachine.current !== 'IDLE') {
      return;
    }

    if (this.balance < this.bet) {
      return;
    }

    this.stateMachine.transition('SPINNING');

    this.balance -= this.bet;

    const initialResult = spinReels();

    this.stateMachine.transition('EVALUATING');

    this.evaluateResult(initialResult);
  }

private evaluateResult(result: GameResult): void {
  if (result.wins.length === 0) {
    this.finishSpin(result);
    return;
  }

  this.stateMachine.transition('WIN_PRESENTATION');

  this.view.displayResult(result.grid);
  this.view.displayWinningPaylines(result.wins);

  this.stateMachine.transition('CASCADING');

  const cascadeResult = resolveCascades(result.grid);

  for (const step of cascadeResult.steps) {
    this.view.displayResult(step.grid);
    this.view.displayWinningPaylines(step.wins);
  }

  this.stateMachine.transition('EVALUATING');

  this.finishSpin({
    grid: cascadeResult.finalGrid,
    wins: cascadeResult.steps.flatMap((step) => step.wins),
    totalWin: cascadeResult.totalWin,
  });
}

  private finishSpin(result: GameResult): void {
    this.balance += result.totalWin;

    this.view.displayResult(result.grid);
    this.view.updateHud(
      this.balance,
      this.bet,
      result.totalWin,
    );

    this.stateMachine.transition('IDLE');
  }

  private updateHud(win = 0): void {
    this.view.updateHud(this.balance, this.bet, win);
  }
}