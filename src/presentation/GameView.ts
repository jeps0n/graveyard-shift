import {
  Assets,
  Container,
  Graphics,
  Sprite,
  Text,
  type Texture,
} from 'pixi.js';
import { GlowFilter } from 'pixi-filters';
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
// ─────────────────────────────────────────────
// Main Game View
// ─────────────────────────────────────────────
// Owns the primary slot-game presentation layer:
// reels, HUD, spin control, and bonus feature overlays.
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
    // Game title.
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
    // Game subtitle.
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
    // Reel frame and reel view.
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
    balanceLabel.y = 620;
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
    this.balanceText.y = 642;
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
    wagerLabel.y = 620;
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
    this.betText.y = 642;
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
    winLabel.y = 620;
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
    this.winText.y = 642;
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
    betIncrementText.y = 670;
    this.addChild(betIncrementText);

    // Hybrid quick-add controls:
    // clicking one immediately adds that amount and also makes it
    // the active value used by the + / − controls.
    this.bet1Button = this.createBetButton(
      '$1',
      414,
      681,
      52,
      34,
    );
    this.bet5Button = this.createBetButton(
      '$5',
      474,
      681,
      52,
      34,
    );
    this.bet25Button = this.createBetButton(
      '$25',
      534,
      681,
      60,
      34,
    );

    this.betDownButton = this.createBetButton(
      '−',
      389,
      724,
      44,
      34,
    );
    this.betUpButton = this.createBetButton(
      '+',
      441,
      724,
      44,
      34,
    );
    this.maxBetButton = this.createBetButton(
      'MAX BET',
      493,
      724,
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
          763,
          200,
          32,
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
    this.spinText.y = 779;
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
  // AFTER MIDNIGHT Feature
  // ─────────────────────────────────────────────
  // Presents the bonus-choice feature.
  // Game logic supplies the multiplier resolver; this method owns
  // the feature presentation, interaction, animation, and reveal flow.
  async showAfterMidnight(
    resolveChoice: (
      choice: MidnightChoice,
    ) => number,
  ): Promise<number> {
    // ─────────────────────────────────────────────
    // Asset Loading
    // ─────────────────────────────────────────────
    // Choice artwork remains separate so each sprite can animate independently.
    const textures: Record<MidnightChoice, Texture> = {
      gasCan: await Assets.load<Texture>(
        new URL('../after-midnight/gasCan.png', import.meta.url).href,
      ),
      candyBar: await Assets.load<Texture>(
        new URL('../after-midnight/candyBar.png', import.meta.url).href,
      ),
      plushDoll: await Assets.load<Texture>(
        new URL('../after-midnight/plushDoll.png', import.meta.url).href,
      ),
    };
    // Backdrop contains the static feature artwork and framing.
    const backdropTexture = await Assets.load<Texture>(
      new URL('../after-midnight/backdrop.png', import.meta.url).href,
    );
    return new Promise((resolve) => {
      // ─────────────────────────────────────────────
      // Feature Overlay
      // ─────────────────────────────────────────────
      const overlay = new Container();
      overlay.alpha = 0;
      // Dims the main game behind the feature modal.
      const backdrop = new Graphics()
        .rect(0, 0, GAME_WIDTH, GAME_HEIGHT)
        .fill({ color: 0x05070a, alpha: 0.78 });
      overlay.addChild(backdrop);
      // ─────────────────────────────────────────────
      // Feature Panel / Backdrop
      // ─────────────────────────────────────────────
      const panel = new Container();
      const panelBackdrop = new Sprite(backdropTexture);
      panelBackdrop.anchor.set(0.5);
      panelBackdrop.width = 640;
      panelBackdrop.height = 410;
      panelBackdrop.x = 0;
      panelBackdrop.y = 0;
      panel.addChild(panelBackdrop);
      // Clips the backdrop to the rounded modal shape.
      const panelMask = new Graphics()
        .roundRect(-320, -205, 640, 410, 24)
        .fill(0xffffff);
      panel.addChild(panelMask);
      panelBackdrop.mask = panelMask;
      // Modal frame.
      const panelFrame = new Graphics()
        .roundRect(-320, -205, 640, 410, 24)
        .stroke({
          width: 3,
          color: 0x6a24a8,
        });
      panel.addChild(panelFrame);
      panel.x = 500;
      panel.y = 375;
      panel.scale.set(0.96);
      overlay.addChild(panel);
      // ─────────────────────────────────────────────
      // Feature Header
      // ─────────────────────────────────────────────
      // Backdrop currently supplies the visible feature title/subtitle artwork.
      const title = new Text({
        // text: 'AFTER MIDNIGHT',
        text: '',
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
        // text: 'PICK YOUR FATE',
        text: '',
        style: {
          fill: 0x999999,
          fontSize: 18,
        },
      });
      subtitle.anchor.set(0.5);
      subtitle.x = GAME_WIDTH / 2;
      subtitle.y = 265;
      overlay.addChild(subtitle);
      // ─────────────────────────────────────────────
      // Choice Configuration
      // ─────────────────────────────────────────────
      // Choice identifiers map directly to their artwork and game-state keys.
      const choices: MidnightChoice[] = [
        'gasCan',
        'candyBar',
        'plushDoll',
      ];
      const labels: Record<MidnightChoice, string> = {
        gasCan: 'Gas Can',
        candyBar: 'Candy Bar',
        plushDoll: 'Plush Doll',
      };
      // Fixed horizontal placement keeps all three choices aligned
      // with the visual composition of the feature backdrop.
      const xPositions = [300, 500, 700];
      const cards = new Map<
        MidnightChoice,
        {
          container: Container;
          button: Graphics;
          label: Text;
          multiplier: Text;
          artwork: Sprite;
        }
      >();
      let selected = false;
      let selectedMultiplier = 1;
      // ─────────────────────────────────────────────
      // Feature Footer
      // ─────────────────────────────────────────────
      const footer = new Text({
        // text: 'ONE CHOICE. ONE MULTIPLIER. NEXT SPIN ONLY.',
        text: '',
        style: {
          fill: 0x777777,
          fontSize: 14,
        },
      });
      footer.anchor.set(0.5);
      footer.x = GAME_WIDTH / 2;
      footer.y = 510;
      overlay.addChild(footer);
      // ─────────────────────────────────────────────
      // Choice Cards
      // ─────────────────────────────────────────────
      choices.forEach((choice, index) => {
        const card = new Container();
        card.x = xPositions[index];
        card.y = 410;
        card.alpha = 0;
        card.scale.set(0.82);
        // Invisible 160×140 interaction area.
        // Visual hover feedback is handled separately.
        const button = new Graphics()
          .roundRect(-80, -70, 160, 140, 16)
          .fill({
            color: 0xffffff,
            alpha: 0,
          })
          .stroke({
            width: 0,
            color: 0xffffff,
          });
        card.addChild(button);
        // ─────────────────────────────────────────────
        // Choice Artwork
        // ─────────────────────────────────────────────
        const artwork = new Sprite(textures[choice]);
        // Glow is attached to the artwork rather than the hitbox.
        const artworkGlow = new GlowFilter({
          color: 0xe8dfff,
          distance: 15,
          outerStrength: 2,
          innerStrength: 0.5,
        });
        artwork.filters = [artworkGlow];
        artworkGlow.enabled = false;
        artwork.anchor.set(0.5);
        artwork.x = 0;
        artwork.y = -34;
        const maxArtworkSize = 100;
        const artworkScale = Math.min(
          maxArtworkSize / artwork.texture.width,
          maxArtworkSize / artwork.texture.height,
        );
        artwork.scale.set(artworkScale);
        artwork.eventMode = 'none';
        card.addChild(artwork);
        // Subtle idle motion keeps the choices visually alive
        gsap.to(artwork, {
          y: -38,
          duration: 1.8 + index * 0.15,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
          delay: index * 0.2,
        });
        // ─────────────────────────────────────────────
        // Choice Label
        // ─────────────────────────────────────────────
        const label = new Text({
          text: labels[choice],
          style: {
            fill: 0xffffff,
            fontSize: 13,
            fontWeight: 'bold',
          },
        });
        label.anchor.set(0.5);
        label.y = 26;
        card.addChild(label);
        // ─────────────────────────────────────────────
        // Multiplier Display
        // ─────────────────────────────────────────────
        const multiplier = new Text({
          // text: '?',
          text: '',
          style: {
            fill: 0xb56cff,
            fontSize: 42,
            fontWeight: 'bold',
          },
        });
        multiplier.anchor.set(0.5);
        multiplier.y = 28;
        card.addChild(multiplier);
        // ─────────────────────────────────────────────
        // Hover Feedback
        // ─────────────────────────────────────────────
        // Hitbox remains 160×140; hover changes only visual feedback.
        button.eventMode = 'static';
        button.cursor = 'pointer';
        button.on('pointerover', () => {
          if (selected) {
            return;
          }
          // Keep the red hover border.
          button.clear()
            .roundRect(-80, -70, 160, 140, 16)
            .fill({
              color: 0xffffff,
              alpha: 0,
            })
            .stroke({
              width: 3,
              color: 0xe8dfff,
            });
          artworkGlow.enabled = true;
        });
        button.on('pointerout', () => {
          // Remove the hover border and artwork glow.
          button.clear()
            .roundRect(-80, -70, 160, 140, 16)
            .fill({
              color: 0xffffff,
              alpha: 0,
            })
            .stroke({
              width: 0,
              color: 0xffffff,
            });
          artworkGlow.enabled = false;
        });
        // ─────────────────────────────────────────────
        // Selection / Multiplier Reveal
        // ─────────────────────────────────────────────
        // Selection locks the feature, emphasizes the chosen outcome,
        // then reveals all three multipliers before resolving the bonus.
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
          // De-emphasize unselected choices while keeping their outcomes
          // visible for transparency after the player's selection.
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
          // Reveal sequence is intentionally staged:
          // selected result first, remaining outcomes second.
          const revealTimeline = gsap.timeline({
            onComplete: () => {
              footer.text = 'ONE SPIN ONLY. MAKE IT COUNT.';
              // Return control to the game only after the full reveal completes.
              gsap.to(overlay, {
                alpha: 0,
                delay: 0.7,
                duration: 0.28,
                ease: 'power2.in',
                onComplete: () => {
                  cards.forEach((card) => {
                    gsap.killTweensOf(card.artwork);
                    gsap.killTweensOf(card.container);
                    gsap.killTweensOf(card.multiplier.scale);
                  });

                  gsap.killTweensOf(panel.scale);
                  gsap.killTweensOf(overlay);

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
          artwork,
        });
        overlay.addChild(card);
      });
      // ─────────────────────────────────────────────
      // Feature Entrance Animation
      // ─────────────────────────────────────────────
      this.addChild(overlay);
      overlay.alpha = 0;

      const panelWipe = new Graphics()
        .poly([
          -15.5, -260,
          15.5, -260,
          55.5, 260,
          24.5, 260,
        ])
        .fill(0xd9dde3);
      panel.addChild(panelWipe);
      panelWipe.mask = panelMask;

      panel.alpha = 0;
      panel.scale.set(0.96);
      panelWipe.x = -450;

      gsap.to(overlay, {
        alpha: 1,
        duration: 0.18,
        ease: 'power1.out',
      });

      gsap.to(panel, {
        alpha: 1,
        duration: 0.2,
        ease: 'power2.out',
      });

      gsap.to(panelWipe, {
        x: 450,
        duration: 0.36,
        delay: 0.08,
        ease: 'power2.inOut',
        onComplete: () => {
          panelWipe.destroy();
        },
      });

      gsap.to(panel.scale, {
        x: 1,
        y: 1,
        duration: 0.42,
        delay: 0.04,
        ease: 'back.out(1.4)',
      });

      choices.forEach((choice, index) => {
        const card = cards.get(choice);
        if (!card) {
          return;
        }

        gsap.fromTo(
          card.container,
          {
            alpha: 0,
            y: 430,
            scale: 0.75,
          },
          {
            alpha: 1,
            y: 380,
            scale: 1,
            duration: 0.42,
            delay: 0.38 + index * 0.1,
            ease: 'back.out(1.7)',
          },
        );
      });
    });
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
