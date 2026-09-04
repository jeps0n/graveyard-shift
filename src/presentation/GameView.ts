import {
  Container,
  Graphics,
  Text,
} from 'pixi.js';
import { gsap } from 'gsap';
import type {
  ReelGrid,
  WinResult,
} from '../game/types';
import { ReelView } from './ReelView';
export const GAME_WIDTH = 1000;
export const GAME_HEIGHT = 800;
type MidnightChoice =
  | 'gasCan'
  | 'candyBar'
  | 'plushDoll';
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
    return new Promise((resolve) => {
      const overlay = new Container();
      overlay.alpha = 0;
      const backdrop = new Graphics()
        .rect(0, 0, GAME_WIDTH, GAME_HEIGHT)
        .fill({ color: 0x05070a, alpha: 0.78 });
      overlay.addChild(backdrop);
      const panel = new Graphics()
        .roundRect(180, 170, 640, 410, 24)
        .fill(0x11151a)
        .stroke({
          width: 4,
          color: 0x8b1e2d,
        });
      panel.pivot.set(500, 375);
      panel.x = 500;
      panel.y = 375;
      panel.scale.set(0.96);
      overlay.addChild(panel);
      const title = new Text({
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
      const subtitle = new Text({
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
      const choices: MidnightChoice[] = [
        'gasCan',
        'candyBar',
        'plushDoll',
      ];
      const labels: Record<MidnightChoice, string> = {
        gasCan: 'GAS CAN',
        candyBar: 'CANDY BAR',
        plushDoll: 'PLUSH DOLL',
      };
      const xPositions = [300, 500, 700];
      const cards = new Map<
        MidnightChoice,
        {
          container: Container;
          button: Graphics;
          label: Text;
          multiplier: Text;
        }
      >();
      let selected = false;
      let selectedMultiplier = 1;
      const footer = new Text({
        text: 'ONE CHOICE. ONE MULTIPLIER. NEXT SPIN ONLY.',
        style: {
          fill: 0x777777,
          fontSize: 14,
        },
      });
      footer.anchor.set(0.5);
      footer.x = GAME_WIDTH / 2;
      footer.y = 510;
      overlay.addChild(footer);
      choices.forEach((choice, index) => {
        const card = new Container();
        card.x = xPositions[index];
        card.y = 410;
        card.alpha = 0;
        card.scale.set(0.82);
        const button = new Graphics()
          .roundRect(-75, -60, 150, 120, 16)
          .fill(0x242a31)
          .stroke({
            width: 3,
            color: 0x444b55,
          });
        card.addChild(button);
        const label = new Text({
          text: labels[choice],
          style: {
            fill: 0xffffff,
            fontSize: 17,
            fontWeight: 'bold',
          },
        });
        label.anchor.set(0.5);
        label.y = -18;
        card.addChild(label);
        const multiplier = new Text({
          text: '?',
          style: {
            fill: 0xb56cff,
            fontSize: 42,
            fontWeight: 'bold',
          },
        });
        multiplier.anchor.set(0.5);
        multiplier.y = 28;
        card.addChild(multiplier);
        button.eventMode = 'static';
        button.cursor = 'pointer';
        button.on('pointertap', () => {
          if (selected) {
            return;
          }
          selected = true;
          selectedMultiplier = resolveChoice(choice);
          const selectedCard = cards.get(choice);
          if (!selectedCard) {
            return;
          }
          cards.forEach((other, otherChoice) => {
            other.button.eventMode = 'none';
            other.button.cursor = 'default';
            if (otherChoice === choice) {
              return;
            }
            gsap.to(other.container, {
              alpha: 0.48,
              scale: 0.94,
              duration: 0.22,
              ease: 'power2.out',
            });
          });
          subtitle.text = 'YOUR NEXT SPIN MULTIPLIER';
          footer.text = 'REVEALING ALL THREE OUTCOMES…';
          gsap.to(selectedCard.container.scale, {
            x: 1.08,
            y: 1.08,
            duration: 0.18,
            ease: 'back.out(1.7)',
          });
          const revealTimeline = gsap.timeline({
            onComplete: () => {
              footer.text = 'ONE SPIN ONLY. MAKE IT COUNT.';
              gsap.to(overlay, {
                alpha: 0,
                delay: 0.7,
                duration: 0.28,
                ease: 'power2.in',
                onComplete: () => {
                  overlay.destroy({ children: true });
                  resolve(selectedMultiplier);
                },
              });
            },
          });
          revealTimeline
            .to(selectedCard.multiplier.scale, {
              x: 0,
              duration: 0.14,
              ease: 'power2.in',
            })
            .call(() => {
              selectedCard.multiplier.text = `×${selectedMultiplier}`;
            })
            .to(selectedCard.multiplier.scale, {
              x: 1,
              duration: 0.22,
              ease: 'back.out(2.2)',
            });
          choices.forEach((otherChoice) => {
            if (otherChoice === choice) {
              return;
            }
            const other = cards.get(otherChoice);
            if (!other) {
              return;
            }
            const otherMultiplier = resolveChoice(otherChoice);
            revealTimeline
              .to(
                other.multiplier.scale,
                {
                  x: 0,
                  duration: 0.12,
                  ease: 'power2.in',
                },
                '+=0.22',
              )
              .call(() => {
                other.multiplier.text = `×${otherMultiplier}`;
              })
              .to(other.multiplier.scale, {
                x: 0.9,
                duration: 0.2,
                ease: 'back.out(1.5)',
              });
          });
        });
        cards.set(choice, {
          container: card,
          button,
          label,
          multiplier,
        });
        overlay.addChild(card);
      });
      this.addChild(overlay);
      gsap.fromTo(
        overlay,
        { alpha: 0 },
        {
          alpha: 1,
          duration: 0.28,
          ease: 'power2.out',
        },
      );
      gsap.to(panel.scale, {
        x: 1,
        y: 1,
        duration: 0.32,
        ease: 'back.out(1.3)',
      });
      choices.forEach((choice, index) => {
        const card = cards.get(choice);
        if (!card) {
          return;
        }
        gsap.to(card.container, {
          alpha: 1,
          y: 390,
          scale: 1,
          duration: 0.3,
          delay: 0.12 + index * 0.08,
          ease: 'back.out(1.6)',
        });
      });
    });
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
