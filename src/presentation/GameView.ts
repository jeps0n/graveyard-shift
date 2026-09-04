import {
  Container,
  Graphics,
  Text,
} from 'pixi.js';
import type {
  ReelGrid,
  WinResult,
} from '../game/types';
import { ReelView } from './ReelView';
export const GAME_WIDTH = 1000;
export const GAME_HEIGHT = 800;
type MidnightChoice = 'A' | 'B' | 'C';
export class GameView extends Container {
  readonly spinButton: Graphics;
  private readonly reelView: ReelView;
  private readonly balanceText: Text;
  private readonly betText: Text;
  private readonly winText: Text;
  constructor() {
    super();
    const background =
      new Graphics()
        .rect(
          0,
          0,
          GAME_WIDTH,
          GAME_HEIGHT,
        )
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
    const reelFrame =
      new Graphics()
        .roundRect(
          150,
          150,
          700,
          450,
          20,
        )
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
    this.spinButton =
      new Graphics()
        .roundRect(
          400,
          690,
          200,
          60,
          15,
        )
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
  setSpinEnabled(
    enabled: boolean,
  ): void {
    this.spinButton.eventMode =
      enabled
        ? 'static'
        : 'none';
    this.spinButton.cursor =
      enabled
        ? 'pointer'
        : 'default';
    this.spinButton.alpha =
      enabled ? 1 : 0.5;
  }
  showAfterMidnight(
    resolveChoice: (
      choice: MidnightChoice,
    ) => number,
  ): Promise<number> {
    return new Promise(
      (resolve) => {
        const overlay =
          new Container();
        const panel =
          new Graphics()
            .roundRect(
              180,
              170,
              640,
              410,
              24,
            )
            .fill(0x11151a)
            .stroke({
              width: 4,
              color: 0x8b1e2d,
            });
        overlay.addChild(panel);
        const title =
          new Text({
            text: 'AFTER MIDNIGHT',
            style: {
              fill: 0xffffff,
              fontSize: 38,
              fontWeight: 'bold',
            },
          });
        title.anchor.set(0.5);
        title.x = GAME_WIDTH / 2;
        title.y = 225;
        overlay.addChild(title);
        const subtitle =
          new Text({
            text: 'PICK YOUR FATE',
            style: {
              fill: 0x999999,
              fontSize: 18,
            },
          });
        subtitle.anchor.set(0.5);
        subtitle.x = GAME_WIDTH / 2;
        subtitle.y = 265;
        overlay.addChild(subtitle);
        const choices:
          MidnightChoice[] = [
            'A',
            'B',
            'C',
          ];
        const xPositions = [
          300,
          500,
          700,
        ];
        const buttons: Graphics[] = [];
        let selected = false;
        const footer =
          new Text({
            text:
              'ONE CHOICE. ONE MULTIPLIER. NEXT SPIN ONLY.',
            style: {
              fill: 0x777777,
              fontSize: 14,
            },
          });
        footer.anchor.set(0.5);
        footer.x = GAME_WIDTH / 2;
        footer.y = 510;
        overlay.addChild(footer);
        choices.forEach(
          (choice, index) => {
            const button =
              new Graphics()
                .roundRect(
                  xPositions[index] - 75,
                  330,
                  150,
                  120,
                  16,
                )
                .fill(0x242a31)
                .stroke({
                  width: 3,
                  color: 0x444b55,
                });
            button.eventMode =
              'static';
            button.cursor =
              'pointer';
            const choiceText =
              new Text({
                text:
                  `MYSTERY ${choice}`,
                style: {
                  fill: 0xffffff,
                  fontSize: 18,
                  fontWeight: 'bold',
                },
              });
            choiceText.anchor.set(0.5);
            choiceText.x =
              xPositions[index];
            choiceText.y = 390;
            button.on(
              'pointertap',
              () => {
                if (selected) {
                  return;
                }
                selected = true;
                const multiplier =
                  resolveChoice(choice);
                buttons.forEach(
                  (otherButton) => {
                    otherButton.eventMode =
                      'none';
                    otherButton.cursor =
                      'default';
                    otherButton.alpha =
                      0.4;
                  },
                );
                button.alpha = 1;
                choiceText.text =
                  `×${multiplier}`;
                choiceText.style.fontSize =
                  42;
                subtitle.text =
                  'YOUR NEXT SPIN MULTIPLIER';
                footer.text =
                  'ONE SPIN ONLY. MAKE IT COUNT.';
                setTimeout(() => {
                  overlay.destroy({
                    children: true,
                  });
                  resolve(multiplier);
                }, 1200);
              },
            );
            buttons.push(button);
            overlay.addChild(button);
            overlay.addChild(choiceText);
          },
        );
        this.addChild(overlay);
      },
    );
  }
  async animateSpin(): Promise<void> {
    await this.reelView.animateSpin();
  }
  async animateReelStops(
    grid: ReelGrid,
  ): Promise<void> {
    await this.reelView.animateReelStops(grid);
  }
  async animateCascadeStep(
    removed: Array<{ reel: number; row: number }>,
    grid: ReelGrid,
  ): Promise<void> {
    await this.reelView.animateCascadeStep(
      removed,
      grid,
    );
  }
  async animateWinningSymbols(
    wins: WinResult[],
  ): Promise<void> {
    await this.reelView.animateWinningSymbols(wins);
  }
  displayResult(
    grid: ReelGrid,
  ): void {
    this.reelView.displayResult(
      grid,
    );
  }
  displayWinningPaylines(
    wins: WinResult[],
  ): void {
    this.reelView.displayWinningPaylines(
      wins,
    );
  }
  clearWinningPaylines(): void {
    this.reelView.clearWinningPaylines();
  }
  updateHud(
    balance: number,
    bet: number,
    win: number,
  ): void {
    this.balanceText.text =
      `BALANCE: $${balance.toFixed(2)}`;
    this.betText.text =
      `BET: $${bet.toFixed(2)}`;
    this.winText.text =
      `WIN: $${win.toFixed(2)}`;
  }
}
