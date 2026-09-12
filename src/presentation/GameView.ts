import {
  Container,
  Graphics,
  Sprite,
  Text,
  Texture,
} from 'pixi.js';
import { gsap } from 'gsap';
import {
  REEL_CABINET_FRONT_URL,
} from '../assets/SymbolAssets';
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
  private spinEnabledRequested = false;
  private spinBusy = false;
  readonly betDownButton: Graphics;
  readonly clearBetButton: Graphics;
  readonly betUpButton: Graphics;
  readonly maxBetButton: Graphics;
  readonly bet1Button: Graphics;
  readonly bet5Button: Graphics;
  readonly bet25Button: Graphics;
  private readonly reelView: ReelView;
  private readonly afterMidnightView: AfterMidnightView;
  private readonly balanceLabel: Text;
  private readonly wagerLabel: Text;
  private readonly winLabel: Text;
  private readonly balanceText: Text;
  private readonly betText: Text;
  private readonly winText: Text;
  private readonly nextSpinMultiplierText: Text;
  private readonly nextSpinMultiplierRecess = new Graphics();
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
    this.reelView.y = 100;
    this.addChild(this.reelView);
    // Upper cabinet artwork.
    const reelCabinetFront = this.createReelCabinetArtwork(
      REEL_CABINET_FRONT_URL,
    );
    this.addChild(reelCabinetFront);
    // Programmatic HUD/control bevel sits above the cabinet artwork and below
    // all labels/buttons. This framing is independent of any control-deck image.
    const controlDeckFraming = this.createControlDeckFraming();
    this.addChild(controlDeckFraming);
    this.nextSpinMultiplierText = new Text({
      text: '',
      style: {
        fill: 0xb829ff,
        stroke: {
          color: 0x120018,
          width: 4,
        },
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1.5,
      },
    });
    this.nextSpinMultiplierText.anchor.set(0.5);
    this.nextSpinMultiplierText.x = 500;
    this.nextSpinMultiplierText.y = 22;
    this.nextSpinMultiplierText.visible = false;
    this.addChild(this.nextSpinMultiplierText);
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
        fill: 0xf2c46d,
        stroke: {
          color: 0x1a1208,
          width: 1,
        },
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1.5,
      },
    });
    balanceLabel.anchor.set(0.5);
    balanceLabel.x = 262;
    balanceLabel.y = 546;
    this.addChild(balanceLabel);
    this.balanceLabel = balanceLabel;
    this.balanceText = new Text({
      text: '$100.00',
      style: {
        fill: 0xffffff,
        fontSize: 20,
        fontWeight: 'bold',
      },
    });
    this.balanceText.anchor.set(0.5);
    this.balanceText.x = 262;
    this.balanceText.y = 569;
    this.addChild(this.balanceText);
    const wagerLabel = new Text({
      text: 'WAGER',
      style: {
        fill: 0xf2c46d,
        stroke: {
          color: 0x1a1208,
          width: 1,
        },
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1.5,
      },
    });
    wagerLabel.anchor.set(0.5);
    wagerLabel.x = 502;
    wagerLabel.y = 546;
    this.addChild(wagerLabel);
    this.wagerLabel = wagerLabel;
    this.betText = new Text({
      text: '$0.00',
      style: {
        fill: 0xffffff,
        fontSize: 22,
        fontWeight: 'bold',
      },
    });
    this.betText.anchor.set(0.5);
    this.betText.x = 502;
    this.betText.y = 569;
    this.addChild(this.betText);
    const winLabel = new Text({
      text: 'WIN',
      style: {
        fill: 0xf2c46d,
        stroke: {
          color: 0x1a1208,
          width: 1,
        },
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1.5,
      },
    });
    winLabel.anchor.set(0.5);
    winLabel.x = 742;
    winLabel.y = 546;
    this.addChild(winLabel);
    this.winLabel = winLabel;
    this.winText = new Text({
      text: '$0.00',
      style: {
        fill: 0xffffff,
        fontSize: 20,
        fontWeight: 'bold',
      },
    });
    this.winText.anchor.set(0.5);
    this.winText.x = 742;
    this.winText.y = 569;
    this.addChild(this.winText);
    const betIncrementText = new Text({
      text: 'BET INCREMENT',
      style: {
        fill: 0xf2c46d,
        stroke: {
          color: 0x1a1208,
          width: 1,
        },
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1.5,
      },
    });
    betIncrementText.anchor.set(0.5);
    betIncrementText.x = 500;
    betIncrementText.y = 620;
    this.addChild(betIncrementText);
    // Hybrid quick-add controls:
    // clicking one immediately adds that amount and also makes it
    // the active value used by the + / − controls.
    this.bet1Button = this.createBetButton(
      '$1',
      402,
      634,
      60,
      34,
    );
    this.bet5Button = this.createBetButton(
      '$5',
      470,
      634,
      60,
      34,
    );
    this.bet25Button = this.createBetButton(
      '$25',
      538,
      634,
      60,
      34,
    );
    this.clearBetButton = this.createBetButton(
      'CLEAR',
      348,
      680,
      96,
      34,
    );
    this.betDownButton = this.createBetButton(
      '−',
      452,
      680,
      44,
      34,
    );
    this.betUpButton = this.createBetButton(
      '+',
      504,
      680,
      44,
      34,
    );
    this.maxBetButton = this.createBetButton(
      'MAX BET',
      556,
      678,
      96,
      34,
    );
    this.addChild(this.bet1Button);
    this.addChild(this.bet5Button);
    this.addChild(this.bet25Button);
    this.addChild(this.clearBetButton);
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
          350,
          730,
          300,
          42,
          99,
        )
        .fill(0x8b1e2d)
        .stroke({
          color: 0x63dbe8,
          width: 3,
        });
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
    this.spinText.y = 752;
    this.addChild(this.spinText);
  }
  private createReelCabinetArtwork(
    assetUrl: string,
  ): Sprite {
    const texture = Texture.from(assetUrl);
    const sprite = new Sprite(texture);
    const sourceWidth = Math.max(texture.width, 1);
    // UPPER CABINET TREATMENT:
    // Always normalize by width only. This preserves the source aspect ratio,
    // keeps the reel cabinet full-size, centered, and top-aligned.
    const scale = GAME_WIDTH / sourceWidth;
    sprite.scale.set(scale);
    sprite.x = (GAME_WIDTH - (texture.width * scale)) / 2;
    sprite.y = 0;
    return sprite;
  }

  private createControlDeckFraming(): Container {
    const framing = new Container();
    const createRecess = (
      x: number,
      y: number,
      width: number,
      height: number,
      radius: number,
      graphics = new Graphics(),
    ): Graphics =>
      graphics
        .roundRect(
          x,
          y,
          width,
          height,
          radius,
        )
        .fill({
          color: 0x0b0d10,
          alpha: 0.38,
        })
        .stroke({
          width: 1,
          color: 0x737c87,
          alpha: 0.52,
        });
    framing.addChild(
      // NEXT SPIN MULTIPLIER
      createRecess(
        356,
        5,
        288,
        32,
        10,
        this.nextSpinMultiplierRecess,
      ),
      // BALANCE
      createRecess(186, 533, 152, 54, 10),
      // WAGER
      createRecess(426, 533, 152, 54, 10),
      // WIN
      createRecess(666, 533, 152, 54, 10),
      // BET INCREMENT
      createRecess(325, 608, 350, 112, 14),
      // SPIN
      createRecess(325, 723, 350, 58, 14),
    );
    this.nextSpinMultiplierRecess.visible = false;
    return framing;
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
        fontSize: label === 'MAX BET' || label === 'CLEAR' ? 13 : 20,
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
        { button: this.bet1Button, value: 1, width: 60 },
        { button: this.bet5Button, value: 5, width: 60 },
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
    const canClear = bet > 0;
    const canDecrease = bet > 0;
    const canIncrease = bet < maxBet;
    const canMaxBet = balance > 0 && bet < maxBet;
    this.clearBetButton.alpha = canClear ? 1 : 0.12;
    this.betDownButton.alpha = canDecrease ? 1 : 0.12;
    this.betUpButton.alpha = canIncrease ? 1 : 0.12;
    this.maxBetButton.alpha = canMaxBet ? 1 : 0.12;
    this.clearBetButton.eventMode =
      canClear ? 'static' : 'none';
    this.betDownButton.eventMode =
      canDecrease ? 'static' : 'none';
    this.betUpButton.eventMode =
      canIncrease ? 'static' : 'none';
    this.maxBetButton.eventMode =
      canMaxBet ? 'static' : 'none';
    this.clearBetButton.cursor =
      canClear ? 'pointer' : 'default';
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
  // Brief financial feedback beats. These are presentation-only and never
  // mutate authoritative balance/win state.
  async animateBalanceDeductionBeat(
    balanceBeforeBet: number,
    balanceAfterBet: number,
  ): Promise<void> {
    gsap.killTweensOf(this.balanceText.scale);
    this.balanceText.scale.set(1);
    this.balanceText.style.fill = 0x63dbe8;
    this.balanceText.text = this.formatMoney(balanceBeforeBet);
    const displayedBalance = { value: balanceBeforeBet };
    await new Promise<void>((resolve) => {
      const timeline = gsap.timeline({
        onComplete: () => {
          this.balanceText.text = this.formatMoney(balanceAfterBet);
          this.balanceText.style.fill = 0xffffff;
          resolve();
        },
      });
      timeline
        .to(displayedBalance, {
          value: balanceAfterBet,
          duration: 0.2,
          ease: 'none',
          onUpdate: () => {
            this.balanceText.text = this.formatMoney(displayedBalance.value);
          },
        }, 0)
        .to(this.balanceText.scale, {
          x: 1.05,
          y: 1.05,
          duration: 0.08,
          ease: 'power2.out',
        }, 0)
        .to(this.balanceText.scale, {
          x: 1,
          y: 1,
          duration: 0.12,
          ease: 'power2.inOut',
        });
    });
  }
  async animateWinCreditBeat(): Promise<void> {
    await this.animateMoneyBeat(this.winText, 0x62d98b, 1.07);
  }
  async animateBalanceCreditBeat(): Promise<void> {
    await this.animateMoneyBeat(this.balanceText, 0x62d98b, 1.05);
  }
  async animatePayoutBeat(
    balanceBeforePayout: number,
    finalBalance: number,
    totalWin: number,
  ): Promise<void> {
    gsap.killTweensOf(this.winText.scale);
    gsap.killTweensOf(this.balanceText.scale);
    this.winText.scale.set(1);
    this.balanceText.scale.set(1);
    this.winText.text = '$0.00';
    this.balanceText.text = this.formatMoney(balanceBeforePayout);
    this.winText.style.fill = 0x62d98b;
    this.balanceText.style.fill = 0xffffff;
    const displayedWin = { value: 0 };
    const displayedBalance = { value: balanceBeforePayout };
    await new Promise<void>((resolve) => {
      const timeline = gsap.timeline({
        onComplete: () => {
          this.winText.text = this.formatMoney(totalWin);
          this.balanceText.text = this.formatMoney(finalBalance);
          this.winText.style.fill = 0xffffff;
          this.balanceText.style.fill = 0xffffff;
          resolve();
        },
      });
      timeline
        .to(displayedWin, {
          value: totalWin,
          duration: 0.2,
          ease: 'none',
          onUpdate: () => {
            this.winText.text = this.formatMoney(displayedWin.value);
          },
        }, 0)
        .to(this.winText.scale, {
          x: 1.07,
          y: 1.07,
          duration: 0.08,
          ease: 'power2.out',
        }, 0)
        .to(this.winText.scale, {
          x: 1,
          y: 1,
          duration: 0.12,
          ease: 'power2.inOut',
          onComplete: () => {
            this.winText.style.fill = 0xffffff;
            this.balanceText.style.fill = 0x62d98b;
          },
        })
        .to(displayedBalance, {
          value: finalBalance,
          duration: 0.2,
          ease: 'none',
          onUpdate: () => {
            this.balanceText.text = this.formatMoney(displayedBalance.value);
          },
        })
        .to(this.balanceText.scale, {
          x: 1.05,
          y: 1.05,
          duration: 0.08,
          ease: 'power2.out',
        }, '<')
        .to(this.balanceText.scale, {
          x: 1,
          y: 1,
          duration: 0.12,
          ease: 'power2.inOut',
        });
    });
  }
  private async animateMoneyBeat(
    text: Text,
    accentColor: number,
    peakScale: number,
  ): Promise<void> {
    gsap.killTweensOf(text.scale);
    text.scale.set(1);
    text.style.fill = accentColor;
    await new Promise<void>((resolve) => {
      const timeline = gsap.timeline({
        onComplete: () => {
          text.style.fill = 0xffffff;
          resolve();
        },
      });
      timeline
        .to(text.scale, {
          x: peakScale,
          y: peakScale,
          duration: 0.08,
          ease: 'power2.out',
        }, 0)
        .to(text.scale, {
          x: 1,
          y: 1,
          duration: 0.12,
          ease: 'power2.inOut',
        });
    });
  }
  // ─────────────────────────────────────────────
  // Spin Control State
  // ─────────────────────────────────────────────
  // Enables or disables player interaction with the main spin control.
  setSpinEnabled(
    enabled: boolean,
  ): void {
    this.spinEnabledRequested = enabled;
    this.applySpinControlState();
  }
  // Live spins use a distinct subdued busy state: non-interactive, but more
  // visible than a genuinely disabled control such as a $0 wager.
  setSpinBusy(busy: boolean): void {
    this.spinBusy = busy;
    this.spinText.text = busy ? 'SPINNING…' : 'SPIN';
    this.spinText.style.fontSize = busy ? 20 : 26;
    this.applySpinControlState();
  }
  private applySpinControlState(): void {
    const interactive = this.spinEnabledRequested && !this.spinBusy;
    this.spinButton.eventMode = interactive ? 'static' : 'none';
    this.spinButton.cursor = interactive ? 'pointer' : 'default';
    const alpha = this.spinBusy ? 0.48 : (this.spinEnabledRequested ? 1 : 0.12);
    this.spinButton.alpha = alpha;
    this.spinText.alpha = alpha;
  }
setNextSpinMultiplier(multiplier: number): void {
  this.nextSpinMultiplierRecess.visible = multiplier > 1;
  this.nextSpinMultiplierText.visible = multiplier > 1;

  this.nextSpinMultiplierText.text = multiplier > 1
    ? `×${multiplier} ACTIVE · NEXT LIVE SPIN`
    : '';

  if (multiplier > 1) {
    gsap.killTweensOf(this.nextSpinMultiplierText.scale);
    gsap.killTweensOf(this.nextSpinMultiplierRecess.scale);

    this.nextSpinMultiplierText.scale.set(1);
    this.nextSpinMultiplierRecess.scale.set(1);

    gsap.timeline()
      .to(
        [
          this.nextSpinMultiplierText.scale,
          this.nextSpinMultiplierRecess.scale,
        ],
        {
          x: 1.12,
          y: 1.12,
          duration: 0.14,
          ease: 'power2.out',
        },
      )
      .to(
        [
          this.nextSpinMultiplierText.scale,
          this.nextSpinMultiplierRecess.scale,
        ],
        {
          x: 1,
          y: 1,
          duration: 0.18,
          ease: 'back.out(2)',
        },
      );
  }
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
  setDevMode(enabled: boolean): void {
    this.reelView.setDevMode(enabled);
  }
  setDevCoordinatesVisible(visible: boolean): void {
    this.reelView.setCoordinatesVisible(visible);
  }
  setDevPaylinesVisible(visible: boolean): void {
    this.reelView.setPaylinesVisible(visible);
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
  private formatMoney(value: number): string {
    return `$${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  // ─────────────────────────────────────────────
  // HUD Updates
  // ─────────────────────────────────────────────
  // Replay HUD values are historical presentation only. They never mutate
  // the authoritative live balance, wager, or win state.
  updateReplayHud(
    balance: number,
    bet: number,
    win: number,
  ): void {
    this.balanceLabel.text = 'BALANCE (REPLAY)';
    this.wagerLabel.text = 'WAGER (REPLAY)';
    this.winLabel.text = 'WIN (REPLAY)';
    this.balanceText.text = this.formatMoney(balance);
    this.betText.text = this.formatMoney(bet);
    this.winText.text = this.formatMoney(win);
  }
  // Updates all player-facing HUD values from the current game state.
  updateHud(
    balance: number,
    bet: number,
    win: number,
    activeIncrement: 1 | 5 | 25,
  ): void {
    this.balanceLabel.text = 'BALANCE';
    this.wagerLabel.text = 'WAGER';
    this.winLabel.text = 'WIN';
    this.balanceText.text =
      this.formatMoney(balance);
    this.betText.text =
      this.formatMoney(bet);
    this.winText.text =
      this.formatMoney(win);
    this.updateBetControls(
      balance,
      bet,
      activeIncrement,
    );
  }
}
