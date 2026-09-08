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
import type { MidnightChoice } from '../features/AfterMidnight';
import { AfterMidnightView } from './AfterMidnightView';
import { ReelView } from './ReelView';

export const GAME_WIDTH = 1000;
export const GAME_HEIGHT = 800;
// ─────────────────────────────────────────────
// Main Game View
// ─────────────────────────────────────────────
// Owns the primary slot-game presentation layer:
// reels, HUD, spin control, and feature-view coordination.
export class GameView extends Container {
  readonly spinButton: Graphics;
  private readonly spinText: Text;
  readonly betDownButton: Graphics;
  readonly betUpButton: Graphics;
  readonly maxBetButton: Graphics;
  readonly bet1Button: Graphics;
  readonly bet5Button: Graphics;
  readonly bet25Button: Graphics;
  private readonly reelView: ReelView;
  private readonly afterMidnightView: AfterMidnightView;
  private readonly balanceText: Text;
  private readonly betText: Text;
  private readonly winText: Text;
  // ─────────────────────────────────────────────
  // Constructor / Main Slot Layout
  // ─────────────────────────────────────────────
  constructor() {
    super();
    // Main game background.
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
    // Branding moves to the outer presentation layer so the gameplay
    // canvas can use its vertical space for the slot itself.
    // Reel frame and reel view.
    const reelFrame =
      new Graphics()
        .roundRect(
          150,
          70,
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
    this.reelView.x = 180;
    this.reelView.y = 105;
    this.addChild(this.reelView);
    // Bonus presentation is isolated from the base-game view and is
    // brought to the front only when the feature is shown.
    this.afterMidnightView = new AfterMidnightView();
    // ─────────────────────────────────────────────
    // HUD / Wager Controls
    // ─────────────────────────────────────────────
    // Money readouts share one aligned baseline and visual hierarchy.
    const balanceLabel = new Text({
      text: 'BALANCE',
      style: {
        fill: 0x777777,
        fontSize: 12,
        fontWeight: 'bold',
      },
    });
    balanceLabel.anchor.set(0.5);
    balanceLabel.x = 260;
    balanceLabel.y = 548;
    this.addChild(balanceLabel);
    this.balanceText = new Text({
      text: '$100.00',
      style: {
        fill: 0xffffff,
        fontSize: 20,
        fontWeight: 'bold',
      },
    });
    this.balanceText.anchor.set(0.5);
    this.balanceText.x = 260;
    this.balanceText.y = 572;
    this.addChild(this.balanceText);
    const wagerLabel = new Text({
      text: 'WAGER',
      style: {
        fill: 0xa9a9a9,
        fontSize: 12,
        fontWeight: 'bold',
      },
    });
    wagerLabel.anchor.set(0.5);
    wagerLabel.x = 500;
    wagerLabel.y = 548;
    this.addChild(wagerLabel);
    this.betText = new Text({
      text: '$0.00',
      style: {
        fill: 0xffffff,
        fontSize: 22,
        fontWeight: 'bold',
      },
    });
    this.betText.anchor.set(0.5);
    this.betText.x = 500;
    this.betText.y = 572;
    this.addChild(this.betText);
    const winLabel = new Text({
      text: 'WIN',
      style: {
        fill: 0x777777,
        fontSize: 12,
        fontWeight: 'bold',
      },
    });
    winLabel.anchor.set(0.5);
    winLabel.x = 740;
    winLabel.y = 548;
    this.addChild(winLabel);
    this.winText = new Text({
      text: '$0.00',
      style: {
        fill: 0xffffff,
        fontSize: 20,
        fontWeight: 'bold',
      },
    });
    this.winText.anchor.set(0.5);
    this.winText.x = 740;
    this.winText.y = 572;
    this.addChild(this.winText);
    const betIncrementText = new Text({
      text: 'BET INCREMENT',
      style: {
        fill: 0x777777,
        fontSize: 12,
        fontWeight: 'bold',
      },
    });
    betIncrementText.anchor.set(0.5);
    betIncrementText.x = 500;
    betIncrementText.y = 610;
    this.addChild(betIncrementText);
    // Hybrid quick-add controls:
    // clicking one immediately adds that amount and also makes it
    // the active value used by the + / − controls.
    this.bet1Button = this.createBetButton(
      '$1',
      414,
      624,
      52,
      34,
    );
    this.bet5Button = this.createBetButton(
      '$5',
      474,
      624,
      52,
      34,
    );
    this.bet25Button = this.createBetButton(
      '$25',
      534,
      624,
      60,
      34,
    );
    this.betDownButton = this.createBetButton(
      '−',
      389,
      670,
      44,
      34,
    );
    this.betUpButton = this.createBetButton(
      '+',
      441,
      670,
      44,
      34,
    );
    this.maxBetButton = this.createBetButton(
      'MAX BET',
      493,
      670,
      112,
      34,
    );
    this.addChild(this.bet1Button);
    this.addChild(this.bet5Button);
    this.addChild(this.bet25Button);
    this.addChild(this.betDownButton);
    this.addChild(this.betUpButton);
    this.addChild(this.maxBetButton);
    // ─────────────────────────────────────────────
    // Spin Control
    // ─────────────────────────────────────────────
    // Main spin button.
    this.spinButton =
      new Graphics()
        .roundRect(
          400,
          722,
          200,
          42,
          12,
        )
        .fill(0x8b1e2d);
    this.spinButton.eventMode = 'static';
    this.spinButton.cursor = 'pointer';
    this.addChild(this.spinButton);
    // Spin button label.
    this.spinText = new Text({
      text: 'SPIN',
      style: {
        fill: 0xffffff,
        fontSize: 26,
        fontWeight: 'bold',
      },
    });
    this.spinText.anchor.set(0.5);
    this.spinText.x = 500;
    this.spinText.y = 743;
    this.addChild(this.spinText);
  }
  private createBetButton(
    label: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ): Graphics {
    const button = new Graphics();
    const text = new Text({
      text: label,
      style: {
        fill: 0xffffff,
        fontSize: label === 'MAX BET' ? 13 : 20,
        fontWeight: 'bold',
      },
    });
    text.anchor.set(0.5);
    text.x = width / 2;
    text.y = height / 2;
    button.addChild(text);
    // Center the transform origin so the press beat does not shift the button.
    button.pivot.set(width / 2, height / 2);
    button.x = x + width / 2;
    button.y = y + height / 2;
    button.eventMode = 'static';
    button.cursor = 'pointer';
    button.clear()
      .roundRect(
        0,
        0,
        width,
        height,
        10,
      )
      .fill({
        color: 0x15191f,
        alpha: 0.96,
      })
      .stroke({
        width: 2,
        color: 0x444b55,
      });
    button.on('pointerover', () => {
      if (button.eventMode !== 'static') {
        return;
      }
      gsap.to(button, {
        alpha: 0.9,
        duration: 0.1,
        overwrite: true,
      });
    });
    button.on('pointerout', () => {
      gsap.to(button, {
        alpha: button.eventMode === 'static' ? 1 : 0.12,
        duration: 0.1,
        overwrite: true,
      });
      gsap.to(button.scale, {
        x: 1,
        y: 1,
        duration: 0.1,
        overwrite: true,
      });
    });
    button.on('pointerdown', () => {
      if (button.eventMode !== 'static') {
        return;
      }
      gsap.to(button.scale, {
        x: 0.96,
        y: 0.96,
        duration: 0.07,
        overwrite: true,
      });
    });
    button.on('pointerup', () => {
      gsap.to(button.scale, {
        x: 1,
        y: 1,
        duration: 0.12,
        ease: 'back.out(2)',
        overwrite: true,
      });
    });
    button.on('pointerupoutside', () => {
      gsap.to(button.scale, {
        x: 1,
        y: 1,
        duration: 0.1,
        overwrite: true,
      });
    });
    return button;
  }
  // Updates hybrid increment selection and wager-control availability.
  updateBetControls(
    balance: number,
    bet: number,
    activeIncrement: 1 | 5 | 25,
  ): void {
    const incrementButtons: Array<{
      button: Graphics;
      value: 1 | 5 | 25;
      width: number;
    }> = [
        { button: this.bet1Button, value: 1, width: 52 },
        { button: this.bet5Button, value: 5, width: 52 },
        { button: this.bet25Button, value: 25, width: 60 },
      ];
    incrementButtons.forEach(({
      button,
      value,
      width,
    }) => {
      const selected = value === activeIncrement;
      button.clear()
        .roundRect(0, 0, width, 34, 10)
        .fill({
          color: selected
            ? 0x8b1e2d
            : 0x15191f,
          alpha: 0.96,
        })
        .stroke({
          width: selected ? 3 : 2,
          color: selected
            ? 0xd9dde3
            : 0x444b55,
        });
      button.alpha = balance > 0 ? 1 : 0.12;
      button.eventMode = balance > 0
        ? 'static'
        : 'none';
      button.cursor = balance > 0
        ? 'pointer'
        : 'default';
    });
    const maxBet = Math.min(balance, 100);
    const canDecrease = bet > 0;
    const canIncrease = bet < maxBet;
    const canMaxBet = balance > 0 && bet < maxBet;
    this.betDownButton.alpha = canDecrease ? 1 : 0.12;
    this.betUpButton.alpha = canIncrease ? 1 : 0.12;
    this.maxBetButton.alpha = canMaxBet ? 1 : 0.12;
    this.betDownButton.eventMode =
      canDecrease ? 'static' : 'none';
    this.betUpButton.eventMode =
      canIncrease ? 'static' : 'none';
    this.maxBetButton.eventMode =
      canMaxBet ? 'static' : 'none';
    this.betDownButton.cursor =
      canDecrease ? 'pointer' : 'default';
    this.betUpButton.cursor =
      canIncrease ? 'pointer' : 'default';
    this.maxBetButton.cursor =
      canMaxBet ? 'pointer' : 'default';
    this.setSpinEnabled(bet > 0);
  }
  // Small one-shot emphasis used whenever the wager changes.
  animateWagerBeat(
    peakScale = 1.06,
  ): void {
    gsap.killTweensOf(this.betText.scale);
    this.betText.scale.set(1);
    gsap.timeline()
      .to(this.betText.scale, {
        x: peakScale,
        y: peakScale,
        duration: 0.08,
        ease: 'power2.out',
      })
      .to(this.betText.scale, {
        x: 1,
        y: 1,
        duration: 0.1,
        ease: 'power2.inOut',
      });
  }
  // ─────────────────────────────────────────────
  // Spin Control State
  // ─────────────────────────────────────────────
  // Enables or disables player interaction with the main spin control.
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
      enabled ? 1 : 0.12;
    this.spinText.alpha =
      enabled ? 1 : 0.12;
  }
  // ─────────────────────────────────────────────
  // AFTER MIDNIGHT Feature Delegation
  // ─────────────────────────────────────────────
  async showAfterMidnight(
    resolveChoice: (
      choice: MidnightChoice,
    ) => number,
  ): Promise<number> {
    // Re-adding an existing child brings the feature presentation to the
    // front, matching the previous overlay behavior.
    this.addChild(this.afterMidnightView);
    return this.afterMidnightView.show(resolveChoice);
  }
  // ─────────────────────────────────────────────
  // Reel Animation Delegation
  // ─────────────────────────────────────────────
  // GameView forwards reel-specific animation work to ReelView,
  // keeping reel presentation logic in its own class.
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
  // ─────────────────────────────────────────────
  // HUD Updates
  // ─────────────────────────────────────────────
  // Updates all player-facing HUD values from the current game state.
  updateHud(
    balance: number,
    bet: number,
    win: number,
    activeIncrement: 1 | 5 | 25,
  ): void {
    this.balanceText.text =
      `$${balance.toFixed(2)}`;
    this.betText.text =
      `$${bet.toFixed(2)}`;
    this.winText.text =
      `$${win.toFixed(2)}`;
    this.updateBetControls(
      balance,
      bet,
      activeIncrement,
    );
  }
}
