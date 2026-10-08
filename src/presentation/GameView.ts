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
import { createBetButton, updateBetControls, applySpinControlState } from './BettingControls';
import type { BettingHost } from './BettingControls';
import { createGameHud, animateWagerBeat, animateBalanceDeductionBeat, animateWinCreditBeat, animateBalanceCreditBeat, animatePayoutBeat, updateReplayHud, updateHud } from './GameHud';
import type { HudHost } from './GameHud';
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
  public spinEnabledRequested = false;
  public spinBusy = false;
  readonly betDownButton: Graphics;
  readonly clearBetButton: Graphics;
  readonly betUpButton: Graphics;
  readonly maxBetButton: Graphics;
  readonly bet1Button: Graphics;
  readonly bet5Button: Graphics;
  readonly bet25Button: Graphics;
  private readonly reelView: ReelView;
  private readonly afterMidnightView: AfterMidnightView;
  public readonly balanceLabel: Text;
  public readonly wagerLabel: Text;
  public readonly winLabel: Text;
  public readonly balanceText: Text;
  public readonly betText: Text;
  public readonly winText: Text;
  private readonly nextSpinMultiplierText: Text;
  private readonly nextSpinMultiplierRecess = new Graphics();
  // ─────────────────────────────────────────────
  // Constructor / Base Slot Layout
  // ─────────────────────────────────────────────
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
    // Branding belongs to the outer presentation shell; GameView reserves its
    // native 1000×800 composition for playable slot presentation.
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
    const reelCabinetFront = this.createReelCabinetArtwork(
      REEL_CABINET_FRONT_URL,
    );
    this.addChild(reelCabinetFront);
    // Programmatic control framing sits above cabinet artwork and below interactive
    // HUD elements, keeping control geometry independent of decorative assets.
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
    // Feature presentation remains isolated from the base-game hierarchy and is
    // promoted only while After Midnight is active.
    this.afterMidnightView = new AfterMidnightView();
    // ─────────────────────────────────────────────
    // HUD / Wager Controls
    // ─────────────────────────────────────────────
    // Money readouts share one aligned baseline and visual hierarchy.
    const hud = createGameHud(this);
    this.balanceLabel = hud.balanceLabel;
    this.wagerLabel = hud.wagerLabel;
    this.winLabel = hud.winLabel;
    this.balanceText = hud.balanceText;
    this.betText = hud.betText;
    this.winText = hud.winText;
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
    this.bet1Button = createBetButton(
      '$1',
      402,
      634,
      60,
      34,
    );
    this.bet5Button = createBetButton(
      '$5',
      470,
      634,
      60,
      34,
    );
    this.bet25Button = createBetButton(
      '$25',
      538,
      634,
      60,
      34,
    );
    this.clearBetButton = createBetButton(
      'CLEAR',
      348,
      680,
      96,
      34,
    );
    this.betDownButton = createBetButton(
      '−',
      452,
      680,
      44,
      34,
    );
    this.betUpButton = createBetButton(
      '+',
      504,
      680,
      44,
      34,
    );
    this.maxBetButton = createBetButton(
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
      createRecess(
        356,
        5,
        288,
        32,
        10,
        this.nextSpinMultiplierRecess,
      ),
      createRecess(186, 533, 152, 54, 10),
      createRecess(426, 533, 152, 54, 10),
      createRecess(666, 533, 152, 54, 10),
      createRecess(325, 608, 350, 112, 14),
      createRecess(325, 723, 350, 58, 14),
    );
    this.nextSpinMultiplierRecess.visible = false;
    return framing;
  }


  // Updates hybrid increment selection and wager-control availability.
  updateBetControls(balance: number, bet: number, activeIncrement: 1 | 5 | 25): void {
    updateBetControls(this as unknown as BettingHost, balance, bet, activeIncrement);
  }
  // Small one-shot emphasis used whenever the wager changes.
  animateWagerBeat(peakScale = 1.06): void { animateWagerBeat(this as unknown as HudHost, peakScale); }
  // Brief financial feedback beats. These are presentation-only and never
  // mutate authoritative balance/win state.
  async animateBalanceDeductionBeat(before: number, after: number): Promise<void> { await animateBalanceDeductionBeat(this as unknown as HudHost, before, after); }
  async animateWinCreditBeat(): Promise<void> { await animateWinCreditBeat(this as unknown as HudHost); }
  async animateBalanceCreditBeat(): Promise<void> { await animateBalanceCreditBeat(this as unknown as HudHost); }
  async animatePayoutBeat(before: number, after: number, win: number): Promise<void> { await animatePayoutBeat(this as unknown as HudHost, before, after, win); }
  // ─────────────────────────────────────────────
  // Spin Control State
  // ─────────────────────────────────────────────
  // Enables or disables player interaction with the main spin control.
  setSpinEnabled(enabled: boolean): void {
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
  private applySpinControlState(): void { applySpinControlState(this as unknown as BettingHost); }
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
  // ─────────────────────────────────────────────
  // HUD Updates
  // ─────────────────────────────────────────────
  // Replay HUD values are historical presentation only. They never mutate
  // the authoritative live balance, wager, or win state.
  updateReplayHud(balance: number, bet: number, win: number): void { updateReplayHud(this as unknown as HudHost, balance, bet, win); }
  // Updates all player-facing HUD values from the current game state.
  updateHud(balance: number, bet: number, win: number, activeIncrement: 1 | 5 | 25): void { updateHud(this as unknown as HudHost, balance, bet, win, activeIncrement); }
}
