import { Container, Graphics, Text } from 'pixi.js';
import type { ReelGrid, WinResult } from '../game/types';
import { ReelView } from './ReelView';

export const GAME_WIDTH = 1000;
export const GAME_HEIGHT = 800;

export class GameView extends Container {
  readonly spinButton: Graphics;

  private readonly reelView: ReelView;
  private readonly balanceText: Text;
  private readonly betText: Text;
  private readonly winText: Text;

  constructor() {
    super();

    const background = new Graphics()
      .rect(0, 0, GAME_WIDTH, GAME_HEIGHT)
      .fill(0x0b0d10);

    this.addChild(background);

    const title = new Text({
      text: 'GRAVEYARD SHIFT',
      style: {
        fill: 0xffffff,
        fontSize: 42,
        fontWeight: 'bold',
      },
    });

    title.anchor.set(0.5);
    title.x = GAME_WIDTH / 2;
    title.y = 60;
    this.addChild(title);

    const subtitle = new Text({
      text: 'THE DEAD END',
      style: {
        fill: 0x999999,
        fontSize: 18,
      },
    });

    subtitle.anchor.set(0.5);
    subtitle.x = GAME_WIDTH / 2;
    subtitle.y = 105;
    this.addChild(subtitle);

    const reelFrame = new Graphics()
      .roundRect(150, 150, 700, 450, 20)
      .fill(0x15191f)
      .stroke({
        width: 4,
        color: 0x444b55,
      });

    this.addChild(reelFrame);

    this.reelView = new ReelView();
    this.reelView.x = 175;
    this.reelView.y = 175;
    this.addChild(this.reelView);

    this.balanceText = new Text({
      text: 'BALANCE: $100',
      style: {
        fill: 0xffffff,
        fontSize: 22,
      },
    });

    this.balanceText.x = 175;
    this.balanceText.y = 635;
    this.addChild(this.balanceText);

    this.betText = new Text({
      text: 'BET: $1',
      style: {
        fill: 0xffffff,
        fontSize: 22,
      },
    });

    this.betText.x = 425;
    this.betText.y = 635;
    this.addChild(this.betText);

    this.winText = new Text({
      text: 'WIN: $0',
      style: {
        fill: 0xffffff,
        fontSize: 22,
      },
    });

    this.winText.x = 675;
    this.winText.y = 635;
    this.addChild(this.winText);

    this.spinButton = new Graphics()
      .roundRect(400, 690, 200, 60, 15)
      .fill(0x8b1e2d);

    this.spinButton.eventMode = 'static';
    this.spinButton.cursor = 'pointer';
    this.addChild(this.spinButton);

    const spinText = new Text({
      text: 'SPIN',
      style: {
        fill: 0xffffff,
        fontSize: 26,
        fontWeight: 'bold',
      },
    });

    spinText.anchor.set(0.5);
    spinText.x = 500;
    spinText.y = 720;
    this.addChild(spinText);
  }

  displayResult(grid: ReelGrid): void {
    this.reelView.displayResult(grid);
  }

  displayWinningPaylines(wins: WinResult[]): void {
    this.reelView.displayWinningPaylines(wins);
  }

  updateHud(balance: number, bet: number, win: number): void {
    this.balanceText.text = `BALANCE: $${balance.toFixed(2)}`;
    this.betText.text = `BET: $${bet.toFixed(2)}`;
    this.winText.text = `WIN: $${win.toFixed(2)}`;
  }
}