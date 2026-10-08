import {
  Assets,
  Container,
  Graphics,
  Sprite,
  Text,
  type Texture,
} from 'pixi.js';
import { GlowFilter } from 'pixi-filters';
import { CARD_Y, CHOICES, createMidnightChoiceCards, type ChoiceCard } from './MidnightChoiceCards';
import { playMidnightRevealSequence } from './MidnightRevealSequence';
import { gsap } from 'gsap';
import type { MidnightChoice } from '../features/AfterMidnight';
const GAME_WIDTH = 1000;
const GAME_HEIGHT = 800;
const PANEL_WIDTH = 640;
const PANEL_HEIGHT = 410;
const PANEL_X = 500;
const PANEL_Y = 289;
// ─────────────────────────────────────────────
// After Midnight Presentation
// ─────────────────────────────────────────────
// The feature math lives in features/AfterMidnight.ts. This class owns only
// choreography: entrance, interaction, reveal hierarchy, pacing, and cleanup.
export class AfterMidnightView extends Container {
  async show(
    resolveChoice: (choice: MidnightChoice) => number,
  ): Promise<number> {
    const [gasCanTexture, candyBarTexture, plushDollTexture, backdropTexture] =
      await Promise.all([
        Assets.load<Texture>(
          new URL('../after-midnight/gasCan.png', import.meta.url).href,
        ),
        Assets.load<Texture>(
          new URL('../after-midnight/candyBar.png', import.meta.url).href,
        ),
        Assets.load<Texture>(
          new URL('../after-midnight/plushDoll.png', import.meta.url).href,
        ),
        Assets.load<Texture>(
          new URL('../after-midnight/backdrop.png', import.meta.url).href,
        ),
      ]);
    const textures: Record<MidnightChoice, Texture> = {
      gasCan: gasCanTexture,
      candyBar: candyBarTexture,
      plushDoll: plushDollTexture,
    };
    return new Promise((resolve) => {
      let selected = false;
      let selectedMultiplier = 1;
      let completed = false;
      const overlay = new Container();
      overlay.alpha = 0;
      this.addChild(overlay);
      // ─────────────────────────────────────────────
      // Stage / dimmer
      // ─────────────────────────────────────────────
      const dimmer = new Graphics()
        .rect(0, 0, GAME_WIDTH, GAME_HEIGHT)
        .fill({ color: 0x030407, alpha: 0.88 });
      dimmer.alpha = 0;
      overlay.addChild(dimmer);
      // ─────────────────────────────────────────────
      // Locked modal artwork + fixed modal position
      // ─────────────────────────────────────────────
      const panel = new Container();
      panel.x = PANEL_X;
      panel.y = PANEL_Y;
      panel.alpha = 0;
      panel.scale.set(0.985);
      overlay.addChild(panel);
      const panelMask = new Graphics()
        .roundRect(
          -PANEL_WIDTH / 2,
          -PANEL_HEIGHT / 2,
          PANEL_WIDTH,
          PANEL_HEIGHT,
          24,
        )
        .fill(0xffffff);
      panel.addChild(panelMask);
      const backdropLayer = new Container();
      panel.addChildAt(backdropLayer, 0);
      const panelBackdrop = new Sprite(backdropTexture);
      panelBackdrop.anchor.set(0.5);
      panelBackdrop.width = PANEL_WIDTH;
      panelBackdrop.height = PANEL_HEIGHT;
      panelBackdrop.mask = panelMask;
      backdropLayer.addChild(panelBackdrop);
      // A controlled low-opacity veil gives us presentation hierarchy without
      // altering the locked artwork itself.
      const panelVeil = new Graphics()
        .roundRect(
          -PANEL_WIDTH / 2,
          -PANEL_HEIGHT / 2,
          PANEL_WIDTH,
          PANEL_HEIGHT,
          24,
        )
        .fill({ color: 0x09060f, alpha: 0.74 });
      panelVeil.alpha = 0;
      panel.addChild(panelVeil);
      const panelFrame = new Graphics()
        .roundRect(
          -PANEL_WIDTH / 2,
          -PANEL_HEIGHT / 2,
          PANEL_WIDTH,
          PANEL_HEIGHT,
          24,
        )
        .stroke({ width: 3, color: 0x6a24a8, alpha: 0.92 });
      panel.addChild(panelFrame);
      // ─────────────────────────────────────────────
      // Result Hierarchy
      // ─────────────────────────────────────────────
      // Final result frame: a single opaque card keeps the payoff compact and
      // lets the multiplier own the center without adding more artwork.
      const heroFrame = new Graphics()
        .roundRect(-118, -86, 236, 172, 18)
        .fill({ color: 0x09070e, alpha: 0.97 })
        .stroke({ width: 3, color: 0xc75cff, alpha: 0.95 });
      // Selected-item echoes live inside the modal and behind the final result.
      // IMPORTANT: use a dedicated mask for this overlay layer. Reusing panelMask
      // here makes one Graphics object mask children in two different transform
      // spaces (panel-local and overlay-local), which can clip the backdrop at
      // responsive scales.
      const choiceEchoMask = new Graphics()
        .roundRect(
          PANEL_X - PANEL_WIDTH / 2,
          PANEL_Y - PANEL_HEIGHT / 2,
          PANEL_WIDTH,
          PANEL_HEIGHT,
          24,
        )
        .fill(0xffffff);
      overlay.addChild(choiceEchoMask);
      const choiceEchoLayer = new Container();
      choiceEchoLayer.x = PANEL_X;
      choiceEchoLayer.y = PANEL_Y;
      choiceEchoLayer.alpha = 0;
      choiceEchoLayer.mask = choiceEchoMask;
      overlay.addChild(choiceEchoLayer);
      heroFrame.x = GAME_WIDTH / 2;
      heroFrame.y = PANEL_Y;
      heroFrame.alpha = 0;
      overlay.addChild(heroFrame);
      const heroCaption = new Text({
        text: 'NEXT SPIN',
        style: {
          fill: 0xd5c6df,
          fontFamily: 'monospace',
          fontSize: 14,
          fontWeight: 'bold',
          letterSpacing: 3.4,
        },
      });
      heroCaption.anchor.set(0.5);
      heroCaption.x = GAME_WIDTH / 2;
      heroCaption.y = PANEL_Y - 52;
      heroCaption.alpha = 0;
      overlay.addChild(heroCaption);
      const heroMultiplier = new Text({
        text: '',
        style: {
          fill: 0xe9c8ff,
          fontFamily: 'monospace',
          fontSize: 104,
          fontWeight: 'bold',
          stroke: { color: 0x5f118a, width: 5 },
        },
      });
      heroMultiplier.anchor.set(0.5);
      heroMultiplier.x = GAME_WIDTH / 2;
      heroMultiplier.y = PANEL_Y;
      heroMultiplier.alpha = 0;
      heroMultiplier.scale.set(0.6);
      overlay.addChild(heroMultiplier);
      const heroGlow = new GlowFilter({
        color: 0xc65cff,
        distance: 22,
        outerStrength: 2.2,
        innerStrength: 0.35,
      });
      heroMultiplier.filters = [heroGlow];
      const heroConfirmation = new Text({
        text: 'MULTIPLIER',
        style: {
          fill: 0xffffff,
          fontFamily: 'monospace',
          fontSize: 13,
          fontWeight: 'bold',
          letterSpacing: 3.2,
        },
      });
      heroConfirmation.anchor.set(0.5);
      heroConfirmation.x = GAME_WIDTH / 2;
      heroConfirmation.y = PANEL_Y + 58;
      heroConfirmation.alpha = 0;
      overlay.addChild(heroConfirmation);
      // ─────────────────────────────────────────────
      // Choice Cards / Podium Labels
      // ─────────────────────────────────────────────
      const { cards, idleTweens } = createMidnightChoiceCards({
        textures,
        overlay,
        backdropLayer,
        panelX: PANEL_X,
        panelY: PANEL_Y,
        isSelected: () => selected,
        onSelect: (choice) => {
          if (selected) return;
          selected = true;
          selectedMultiplier = resolveChoice(choice);
          cards.forEach((candidate) => {
            candidate.hitArea.eventMode = 'none';
            candidate.hitArea.cursor = 'default';
            candidate.artworkGlow.enabled = false;
            gsap.killTweensOf(candidate.container.scale);
            gsap.killTweensOf(candidate.selectionRing);
          });
          idleTweens.forEach((tween) => tween.kill());
          playMidnightRevealSequence({
            overlay,
            dimmer,
            panel,
            backdropLayer,
            panelVeil,
            choiceEchoLayer,
            heroFrame,
            heroCaption,
            heroMultiplier,
            heroConfirmation,
            cards,
            selectedChoice: choice,
            selectedMultiplier,
            resolveChoice,
            finish: () => {
              if (completed) return;
              completed = true;
              this.cleanupOverlay(overlay, cards);
              resolve(selectedMultiplier);
            },
          });
        },
      });
      // ─────────────────────────────────────────────
      // Entrance Choreography
      // ─────────────────────────────────────────────
      const entrance = gsap.timeline();
      entrance
        .to(overlay, {
          alpha: 1,
          duration: 0.12,
          ease: 'power1.out',
        })
        .to(
          dimmer,
          {
            alpha: 1,
            duration: 0.28,
            ease: 'power1.out',
          },
          0,
        )
        .to(
          panel,
          {
            alpha: 1,
            duration: 0.26,
            ease: 'power2.out',
          },
          0.1,
        )
        .to(
          panel.scale,
          {
            x: 1,
            y: 1,
            duration: 0.38,
            ease: 'back.out(1.25)',
          },
          0.1,
        );
      CHOICES.forEach((choice, index) => {
        const card = cards.get(choice);
        if (!card) return;
        entrance.to(
          card.container,
          {
            alpha: 1,
            y: CARD_Y,
            duration: 0.34,
            ease: 'back.out(1.45)',
          },
          0.46 + index * 0.075,
        );
        entrance.to(
          card.container.scale,
          {
            x: 1,
            y: 1,
            duration: 0.34,
            ease: 'back.out(1.45)',
          },
          0.46 + index * 0.075,
        );
      });
    });
  }
  private cleanupOverlay(
    overlay: Container,
    cards: Map<MidnightChoice, ChoiceCard>,
  ): void {
    cards.forEach((card) => {
      gsap.killTweensOf(card.container);
      gsap.killTweensOf(card.container.scale);
      gsap.killTweensOf(card.artwork);
      gsap.killTweensOf(card.multiplier);
      gsap.killTweensOf(card.multiplier.scale);
      gsap.killTweensOf(card.selectionRing);
      card.artwork.filters = null;
    });
    gsap.killTweensOf(overlay);
    overlay.destroy({ children: true });
  }
}
