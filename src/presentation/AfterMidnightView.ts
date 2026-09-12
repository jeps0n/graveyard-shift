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
import type { MidnightChoice } from '../features/AfterMidnight';

const GAME_WIDTH = 1000;
const GAME_HEIGHT = 800;

// ─────────────────────────────────────────────
// AFTER MIDNIGHT Presentation
// ─────────────────────────────────────────────
// Owns the bonus feature's visual presentation, interaction, animation,
// reveal flow, and animation cleanup. Feature outcome logic remains in
// features/AfterMidnight.ts.
export class AfterMidnightView extends Container {
  async show(
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
      // Reveal wash sits above the illustrated backdrop but below the modal
      // frame and choice cards. It stays invisible until the player picks.
      const revealWash = new Graphics()
        .roundRect(-320, -205, 640, 410, 24)
        .fill({
          color: 0x100817,
          alpha: 1,
        });
      revealWash.alpha = 0;
      panel.addChild(revealWash);
      // Modal frame.
      const panelFrame = new Graphics()
        .roundRect(-320, -205, 640, 410, 24)
        .stroke({
          width: 3,
          color: 0x6a24a8,
        });
      panel.addChild(panelFrame);
      panel.x = 500;
      panel.y = 289;
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
          textPlate: Graphics;
          revealCard: Graphics;
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
        card.y = 330;
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
        // Full reveal card stays hidden during the initial pick state. After the
        // backdrop falls away, it fades in to visually complete each choice before
        // the cards flip to their multiplier faces.
        const revealCard = new Graphics()
          .roundRect(-80, -70, 160, 140, 16)
          .fill({
            color: 0x12091b,
            alpha: 0.96,
          })
          .stroke({
            width: 2,
            color: 0x6a24a8,
            alpha: 0.88,
          });
        revealCard.alpha = 0;
        card.addChild(revealCard);
        // Readability plate keeps labels/multipliers legible over the busy backdrop.
        const textPlate = new Graphics()
          .roundRect(-62, 6, 124, 62, 10)
          .fill({
            color: 0x09070f,
            alpha: 0.72,
          })
          .stroke({
            width: 1,
            color: 0x6a24a8,
            alpha: 0.55,
          });
        card.addChild(textPlate);
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
        // Selection locks the feature, lets the illustrated world fall away,
        // completes all three programmatic cards, then flips the chosen card
        // first before the two passive reveals.
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

          cards.forEach((other) => {
            other.button.eventMode = 'none';
            other.button.cursor = 'default';
            other.artwork.filters = null;
          });

          // Immediate acknowledgement: the chosen card answers the click, then
          // settles before the slower transition into the reveal stage.
          gsap.timeline()
            .to(selectedCard.container.scale, {
              x: 1.08,
              y: 1.08,
              duration: 0.12,
              ease: 'power2.out',
            })
            .to(selectedCard.container.scale, {
              x: 1,
              y: 1,
              duration: 0.14,
              ease: 'power2.inOut',
            });

          // subtitle.text = 'YOUR NEXT SPIN MULTIPLIER';
          // footer.text = 'THE NIGHT GOES QUIET…';

          const revealTimeline = gsap.timeline({
            onComplete: () => {
              // footer.text = 'ONE SPIN ONLY. MAKE IT COUNT.';
              gsap.to(overlay, {
                alpha: 0,
                delay: 1.2,
                duration: 0.3,
                ease: 'power2.in',
                onComplete: () => {
                  cards.forEach((card) => {
                    gsap.killTweensOf(card.artwork);
                    gsap.killTweensOf(card.container);
                    gsap.killTweensOf(card.multiplier.scale);
                    gsap.killTweensOf(card.revealCard);
                  });
                  gsap.killTweensOf(panel.scale);
                  gsap.killTweensOf(panelBackdrop);
                  gsap.killTweensOf(revealWash);
                  gsap.killTweensOf(overlay);
                  overlay.destroy({ children: true });
                  resolve(selectedMultiplier);
                },
              });
            },
          });

          // Beat 1: slowly let the illustrated feature artwork disappear into a
          // purple-black void. The items remain visible while the world falls away.
          revealTimeline
            .to(revealWash, {
              alpha: 0.96,
              duration: 1.05,
              ease: 'power1.inOut',
            }, 0)
            .to(panelBackdrop, {
              alpha: 0.08,
              duration: 1.05,
              ease: 'power1.inOut',
            }, 0);

          // Beat 2: complete all three cards only after the wash is nearly settled.
          // The original lower text plates disappear as the full card faces arrive.
          cards.forEach((card) => {
            revealTimeline
              .to(card.revealCard, {
                alpha: 1,
                duration: 0.28,
                ease: 'power2.out',
              }, 0.82)
              .to(card.textPlate, {
                alpha: 0,
                duration: 0.2,
                ease: 'power1.out',
              }, 0.82);
          });

          revealTimeline.call(() => {
            // footer.text = 'TURN IT OVER.';
          }, [], 1.18);

          // Small tension beat before the chosen card flips.
          revealTimeline.to({}, { duration: 0.2 });

          // Beat 3: chosen card flips first. Collapse to its edge, swap the face,
          // then open back up with the selected multiplier treated as the hero result.
          revealTimeline
            .to(selectedCard.container.scale, {
              x: 0.04,
              y: 1.03,
              duration: 0.18,
              ease: 'power2.in',
            })
            .call(() => {
              gsap.killTweensOf(selectedCard.artwork);
              selectedCard.artwork.visible = false;
              selectedCard.label.visible = false;
              selectedCard.multiplier.style.fontSize = 64;
              selectedCard.multiplier.text = `×${selectedMultiplier}`;
              selectedCard.multiplier.scale.set(1);
              selectedCard.revealCard.clear()
                .roundRect(-80, -70, 160, 140, 16)
                .fill({
                  color: 0x16091f,
                  alpha: 0.98,
                })
                .stroke({
                  width: 3,
                  color: 0xb829ff,
                  alpha: 1,
                });
            })
            .to(selectedCard.container.scale, {
              x: 1.1,
              y: 1.1,
              duration: 0.24,
              ease: 'back.out(2)',
            })
            .to(selectedCard.container.scale, {
              x: 1.04,
              y: 1.04,
              duration: 0.14,
              ease: 'power2.out',
            })
            .to(selectedCard.multiplier.scale, {
              x: 1.18,
              y: 1.18,
              duration: 0.12,
              ease: 'power2.out',
            }, '<')
            .to(selectedCard.multiplier.scale, {
              x: 1,
              y: 1,
              duration: 0.16,
              ease: 'back.out(1.8)',
            });

          revealTimeline.call(() => {
            // footer.text = 'THE OTHER TWO…';
          }, [], '+=0.24');

          // Beat 4: the remaining cards reveal passively, one after the other.
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
              .to(other.container.scale, {
                x: 0.04,
                y: 0.96,
                duration: 0.15,
                ease: 'power2.in',
              }, '+=0.12')
              .call(() => {
                gsap.killTweensOf(other.artwork);
                other.artwork.visible = false;
                other.label.visible = false;
                other.multiplier.style.fontSize = 36;
                other.multiplier.style.fill = 0xffffff;
                other.multiplier.text = `×${otherMultiplier}`;
                other.multiplier.scale.set(1);
                other.revealCard.clear()
                  .roundRect(-80, -70, 160, 140, 16)
                  .fill({
                    color: 0x100817,
                    alpha: 0.96,
                  })
                  .stroke({
                    width: 2,
                    color: 0xffffff,
                    alpha: 1,
                  });
              })
              .to(other.container.scale, {
                x: 0.96,
                y: 0.96,
                duration: 0.2,
                ease: 'back.out(1.5)',
              });
          });

          // Beat 5: settle the three revealed outcomes into their final hierarchy.
          // Passive cards recede while the selected result remains fully readable.
          // No extra pulse is used here; the winning multiplier now transitions
          // directly into the final takeover beat.
          revealTimeline.call(() => {
            cards.forEach((card, cardChoice) => {
              card.container.alpha = cardChoice === choice ? 1 : 0.5;
            });
            footer.text = `×${selectedMultiplier} LOCKED IN`;
          });

          // Beat 6: the winning multiplier takes over the selected card face.
          // After a short confirmation beat, it moves to the center and grows
          // to its full-card resting size, overshoots slightly for one final hit,
          // then settles back into the exact size that carries into the next spin.
          revealTimeline
            .call(() => {
              // footer.text = `×${selectedMultiplier} ACTIVE NEXT SPIN`;
            }, [], '+=0.16')
            .to(selectedCard.multiplier, {
              y: 0,
              duration: 0.2,
              ease: 'power2.out',
            })
            .to(
              selectedCard.multiplier.scale,
              {
                x: 1.45,
                y: 1.45,
                duration: 0.24,
                ease: 'power2.out',
              },
              '<',
            )
            .to(selectedCard.multiplier.scale, {
              x: 1.70,
              y: 1.70,
              duration: 0.13,
              ease: 'power2.out',
            })
            .to(selectedCard.multiplier.scale, {
              x: 1.45,
              y: 1.45,
              duration: 0.20,
              ease: 'back.out(1.4)',
            })
            .to(selectedCard.container.scale, {
              x: 1.04,
              y: 1.04,
              duration: 0.12,
              ease: 'power2.out',
            });

          // Beat 7: bookend the feature with a final confirmation wipe across
          // only the winning card. The passive cards and modal background stay
          // untouched so the wipe reads as a stamp on the selected multiplier.
          revealTimeline
            .call(() => {
              const winningCardWipe = new Graphics()
                .poly([
                  -18, -90,
                  12, -90,
                  48, 90,
                  18, 90,
                ])
                .fill({
                  color: 0xe8dfff,
                  alpha: 0.82,
                });

              // Use a dedicated invisible mask for the wipe instead of the
              // winning card itself. This keeps the selected card's purple
              // reveal border completely independent from the wipe effect.
              const winningCardWipeMask = new Graphics()
                .roundRect(-80, -70, 160, 140, 16)
                .fill(0xffffff);

              selectedCard.container.addChild(winningCardWipeMask);

              winningCardWipe.x = -150;
              winningCardWipe.mask = winningCardWipeMask;
              selectedCard.container.addChild(winningCardWipe);

              gsap.to(winningCardWipe, {
                x: 150,
                duration: 0.34,
                ease: 'power2.inOut',
                onComplete: () => {
                  winningCardWipe.mask = null;
                  winningCardWipe.destroy();
                  winningCardWipeMask.destroy();
                },
              });
            })
            // Keep the reveal timeline alive long enough for the card-only wipe
            // to finish before the final hold and modal exit begin.
            .to({}, {
              duration: 0.34,
            });
        });
        cards.set(choice, {
          container: card,
          button,
          label,
          multiplier,
          artwork,
          textPlate,
          revealCard,
        });
        overlay.addChild(card);
      });
      // ─────────────────────────────────────────────
      // Feature Entrance Animation
      // ─────────────────────────────────────────────
      this.addChild(overlay);
      overlay.alpha = 0;
      // Opening wipe is an exact 4× scale of the winning-card wipe.
      // The modal is 640px wide and the card is 160px wide, so scaling the
      // card wipe geometry by 4 preserves the same width ratio, diagonal angle,
      // direction, and overall visual language at the larger surface size.
      const panelWipe = new Graphics()
        .poly([
          -72, -360,
          48, -360,
          192, 360,
          72, 360,
        ])
        .fill({
          color: 0xe8dfff,
          alpha: 0.82,
        });
      panel.addChild(panelWipe);
      panelWipe.mask = panelMask;
      panel.alpha = 0;
      panel.scale.set(0.96);
      // Match the winning-card wipe travel distance proportionally:
      // 300px across a 160px card = 1.875 surface widths.
      // 1.875 × 640px modal = 1200px total travel, centered from -600 to 600.
      panelWipe.x = -600;
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
        x: 600,
        // Same duration and easing as the winning-card wipe. Because the
        // travel distance is also normalized to surface width, perceived speed
        // now matches at both scales.
        duration: 0.34,
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
            y: 350,
            scale: 0.75,
          },
          {
            alpha: 1,
            y: 300,
            scale: 1,
            duration: 0.42,
            delay: 0.38 + index * 0.1,
            ease: 'back.out(1.7)',
          },
        );
      });
    });
  }

}
