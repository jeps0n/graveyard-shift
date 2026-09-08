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
      // Modal frame.
      const panelFrame = new Graphics()
        .roundRect(-320, -205, 640, 410, 24)
        .stroke({
          width: 3,
          color: 0x6a24a8,
        });
      panel.addChild(panelFrame);
      panel.x = 500;
      panel.y = 295;
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
