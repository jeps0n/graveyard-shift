import type { Application } from 'pixi.js';
import { spinReels } from '../math/GameMath';
import { GameView } from '../presentation/GameView';

export class Game {
  readonly view: GameView;

  private balance = 100;
  private readonly bet = 1;

  constructor(app: Application) {
    this.view = new GameView();

    app.stage.addChild(this.view);

    this.view.spinButton.on('pointertap', () => {
      this.spin();
    });

    this.updateHud();
  }

  private spin(): void {
    if (this.balance < this.bet) {
      return;
    }

    this.balance -= this.bet;

    const result = spinReels();

    this.balance += result.totalWin;

    this.view.displayResult(result.grid);
    this.view.displayWinningPaylines(result.wins);
    this.updateHud(result.totalWin);
  }

  private updateHud(win = 0): void {
    this.view.updateHud(this.balance, this.bet, win);
  }
}