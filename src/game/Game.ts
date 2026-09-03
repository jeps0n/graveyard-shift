import type { Application } from 'pixi.js';
import { spinReels } from '../math/GameMath';
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

    const result = spinReels();

    this.stateMachine.transition('EVALUATING');

    this.evaluateResult(result);
  }

  private evaluateResult(result: GameResult): void {
    this.balance += result.totalWin;

    this.stateMachine.transition('WIN_PRESENTATION');

    this.view.displayResult(result.grid);
    this.view.displayWinningPaylines(result.wins);
    this.updateHud(result.totalWin);

    this.stateMachine.transition('IDLE');
  }

  private updateHud(win = 0): void {
    this.view.updateHud(this.balance, this.bet, win);
  }
}