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
const PANEL_WIDTH = 640;
const PANEL_HEIGHT = 410;
const PANEL_X = 500;
const PANEL_Y = 289;
const CARD_WIDTH = 100;
const CARD_HEIGHT = 100;
const CARD_Y = 256;
const CARD_X = [319, 500, 683] as const;
const CHOICES: MidnightChoice[] = ['gasCan', 'candyBar', 'plushDoll'];
const LABELS: Record<MidnightChoice, string> = {
  gasCan: 'GAS CAN',
  candyBar: 'CANDY BAR',
  plushDoll: 'PLUSH DOLL',
};
type ChoiceCard = {
  choice: MidnightChoice;
  container: Container;
  labelContainer: Container;
  hitArea: Graphics;
  surface: Graphics;
  selectionRing: Graphics;
  artwork: Sprite;
  artworkGlow: GlowFilter;
  multiplier: Text;
  originalX: number;
};
// ─────────────────────────────────────────────
// AFTER MIDNIGHT Presentation
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
      // Result hierarchy
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
      // Choice cards
      // ─────────────────────────────────────────────
      const cards = new Map<MidnightChoice, ChoiceCard>();
      const idleTweens: gsap.core.Tween[] = [];
      const setCardSurface = (
        surface: Graphics,
        options: {
          fillAlpha: number;
          borderColor: number;
          borderAlpha: number;
          borderWidth: number;
        },
      ): void => {
        surface.clear()
          .roundRect(
            -CARD_WIDTH / 2,
            -CARD_HEIGHT / 2,
            CARD_WIDTH,
            CARD_HEIGHT,
            18,
          )
          .fill({ color: 0x09070e, alpha: options.fillAlpha })
          .stroke({
            width: options.borderWidth,
            color: options.borderColor,
            alpha: options.borderAlpha,
          });
      };
      CHOICES.forEach((choice, index) => {
        const card = new Container();
        card.x = CARD_X[index];
        card.y = CARD_Y - 34;
        card.alpha = 0;
        card.scale.set(0.9);
        const surface = new Graphics();
        setCardSurface(surface, {
          fillAlpha: 0.58,
          borderColor: 0x7a568d,
          borderAlpha: 0.54,
          borderWidth: 1.5,
        });
        card.addChild(surface);
        const selectionRing = new Graphics()
          .roundRect(
            -CARD_WIDTH / 2 - 5,
            -CARD_HEIGHT / 2 - 5,
            CARD_WIDTH + 10,
            CARD_HEIGHT + 10,
            21,
          )
          .stroke({ width: 2, color: 0xd9b7ff, alpha: 0.95 });
        selectionRing.alpha = 0;
        card.addChild(selectionRing);
        const artwork = new Sprite(textures[choice]);
        artwork.anchor.set(0.5);
        artwork.y = 0;
        const maxArtworkSize = 98;
        const artworkScale = Math.min(
          maxArtworkSize / artwork.texture.width,
          maxArtworkSize / artwork.texture.height,
        );
        artwork.scale.set(artworkScale);
        artwork.eventMode = 'none';
        const artworkGlow = new GlowFilter({
          color: 0xe8dfff,
          distance: 15,
          outerStrength: 1.7,
          innerStrength: 0.25,
        });
        artworkGlow.enabled = false;
        artwork.filters = [artworkGlow];
        card.addChild(artwork);
        // Podium label treatment: preserve the exact approved geometry/style and
        // screen placement, but parent it to the locked backdrop so it behaves like
        // part of that artwork instead of part of the animated choice card.
        const labelContainer = new Container();
        labelContainer.x = CARD_X[index] - PANEL_X;
        labelContainer.y = CARD_Y - PANEL_Y - 1;
        labelContainer.alpha = 1;
        labelContainer.scale.set(1);
        const labelPlate = new Graphics()
          .roundRect(-40, 56, 80, 22, 4)
          .fill({ color: 0x050408, alpha: 0.5 })
          .stroke({ width: 0.5, color: 0xb78a4b, alpha: 0.8 });
        labelContainer.addChild(labelPlate);
        const label = new Text({
          text: LABELS[choice],
          style: {
            fill: 0xf0d7a0,
            fontFamily: 'monospace',
            fontSize: 12,
            fontWeight: 'normal',
            letterSpacing: 0.75,
          },
        });
        label.anchor.set(0.5);
        label.y = 68.5;
        labelContainer.addChild(label);
        const multiplier = new Text({
          text: '',
          style: {
            fill: 0xf0d9ff,
            fontFamily: 'monospace',
            fontSize: 48,
            fontWeight: 'bold',
            stroke: { color: 0x5f118a, width: 3 },
          },
        });
        multiplier.anchor.set(0.5);
        multiplier.y = 1;
        multiplier.alpha = 0;
        card.addChild(multiplier);
        const hitArea = new Graphics()
          .roundRect(
            -CARD_WIDTH / 2,
            -CARD_HEIGHT / 2,
            CARD_WIDTH,
            CARD_HEIGHT,
            18,
          )
          .fill({ color: 0xffffff, alpha: 0.001 });
        hitArea.eventMode = 'static';
        hitArea.cursor = 'pointer';
        card.addChild(hitArea);
        const idleTween = gsap.to(artwork, {
          y: artwork.y - 4,
          duration: 1.9 + index * 0.12,
          delay: index * 0.18,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
        idleTweens.push(idleTween);
hitArea.on('pointerover', () => {
  if (selected) return;
  artworkGlow.enabled = true;
  label.style.fill = 0xffffff;
  gsap.to(selectionRing, {
    alpha: 0.72,
    duration: 0.12,
    ease: 'power1.out',
  });
});
hitArea.on('pointerout', () => {
  if (selected) return;
  artworkGlow.enabled = false;
  label.style.fill = 0xf0d7a0;
  gsap.to(selectionRing, {
    alpha: 0,
    duration: 0.12,
    ease: 'power1.out',
  });
});
        hitArea.on('pointertap', () => {
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
          this.playRevealSequence({
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
            setCardSurface,
            finish: () => {
              if (completed) return;
              completed = true;
              this.cleanupOverlay(overlay, cards);
              resolve(selectedMultiplier);
            },
          });
        });
        cards.set(choice, {
          choice,
          container: card,
          labelContainer,
          hitArea,
          surface,
          selectionRing,
          artwork,
          artworkGlow,
          multiplier,
          originalX: CARD_X[index],
        });
        overlay.addChild(card);
        backdropLayer.addChild(labelContainer);
      });
      // ─────────────────────────────────────────────
      // Entrance: establish → invite → enable choices
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
  private playRevealSequence(args: {
    overlay: Container;
    dimmer: Graphics;
    panel: Container;
    backdropLayer: Container;
    panelVeil: Graphics;
    choiceEchoLayer: Container;
    heroFrame: Graphics;
    heroCaption: Text;
    heroMultiplier: Text;
    heroConfirmation: Text;
    cards: Map<MidnightChoice, ChoiceCard>;
    selectedChoice: MidnightChoice;
    selectedMultiplier: number;
    resolveChoice: (choice: MidnightChoice) => number;
    setCardSurface: (
      surface: Graphics,
      options: {
        fillAlpha: number;
        borderColor: number;
        borderAlpha: number;
        borderWidth: number;
      },
    ) => void;
    finish: () => void;
  }): void {
    const {
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
      selectedChoice,
      selectedMultiplier,
      resolveChoice,
      setCardSurface,
      finish,
    } = args;
    const selectedCard = cards.get(selectedChoice);
    if (!selectedCard) {
      finish();
      return;
    }
    const passiveCards = CHOICES
      .filter((choice) => choice !== selectedChoice)
      .map((choice) => cards.get(choice))
      .filter((card): card is ChoiceCard => card !== undefined);
    // Final-payoff atmosphere: repeat only the item the player actually chose.
    // Fixed placements keep the composition intentional and reproducible while
    // varied scale/rotation/drift prevents the echoes from reading like a grid.
    // The exact displayed mystery-item size remains the baseline.
    // Distribution: 20 baseline-size echoes, 8 medium accents, 3 large anchors.
    const echoLayout = [
      // Small / baseline tier — dominant field.
      // 20 echoes stay close to the original displayed mystery-item size.
      { x: -298, y: -160, scale: 0.92, alpha: 0.26 },
      { x: -262, y: -118, scale: 0.96, alpha: 0.31 },
      { x: -224, y: -152, scale: 1.00, alpha: 0.29 },
      { x: -186, y: -116, scale: 1.04, alpha: 0.33 },
      { x: -144, y: -158, scale: 0.94, alpha: 0.26 },
      { x: -98, y: -126, scale: 1.02, alpha: 0.31 },
      { x: -292, y: -36, scale: 1.00, alpha: 0.29 },
      { x: -250, y: 18, scale: 0.95, alpha: 0.31 },
      { x: -292, y: 92, scale: 1.05, alpha: 0.26 },
      { x: -238, y: 150, scale: 0.98, alpha: 0.33 },
      { x: 298, y: -158, scale: 0.93, alpha: 0.26 },
      { x: 258, y: -114, scale: 1.00, alpha: 0.31 },
      { x: 220, y: -150, scale: 1.05, alpha: 0.29 },
      { x: 176, y: -112, scale: 0.96, alpha: 0.33 },
      { x: 134, y: -158, scale: 1.02, alpha: 0.26 },
      { x: 92, y: -124, scale: 0.94, alpha: 0.31 },
      { x: 292, y: -34, scale: 1.04, alpha: 0.29 },
      { x: 248, y: 22, scale: 0.97, alpha: 0.31 },
      { x: 288, y: 96, scale: 1.00, alpha: 0.26 },
      { x: 236, y: 150, scale: 1.05, alpha: 0.33 },
      // Medium tier — 8 stronger accents.
      { x: -198, y: -70, scale: 1.28, alpha: 0.30 },
      { x: -170, y: 68, scale: 1.34, alpha: 0.33 },
      { x: -112, y: 132, scale: 1.42, alpha: 0.28 },
      { x: -78, y: -42, scale: 1.50, alpha: 0.35 },
      { x: 194, y: -72, scale: 1.30, alpha: 0.30 },
      { x: 168, y: 70, scale: 1.38, alpha: 0.33 },
      { x: 110, y: 134, scale: 1.46, alpha: 0.28 },
      { x: 76, y: -44, scale: 1.54, alpha: 0.35 },
      // Large tier — 3 dramatic anchors with lower opacity.
      { x: -270, y: 126, scale: 1.88, alpha: 0.22 },
      { x: 270, y: -128, scale: 2.02, alpha: 0.24 },
      { x: 8, y: 164, scale: 2.18, alpha: 0.20 },
    ] as const;
    const choiceBaselineScale = selectedCard.artwork.scale.x;
    const choiceEchoes = echoLayout.map((layout) => {
      const echo = new Sprite(selectedCard.artwork.texture);
      echo.anchor.set(0.5);
      echo.x = layout.x;
      echo.y = layout.y;
      // Random starting orientation: full 360° every feature run.
      const startRotation = Math.random() * Math.PI * 2;
      echo.rotation = startRotation;
      echo.alpha = 0;
      const baseScale = choiceBaselineScale * layout.scale;
      echo.scale.set(baseScale);
      choiceEchoLayer.addChild(echo);
      // Starting composition is controlled; motion is randomized every feature run.
      // Direction can be anywhere in 360°, with enough travel to feel alive without
      // turning into fast particle noise. Leaving the modal is allowed—the panel mask
      // simply clips an echo once it drifts beyond the visible backdrop.
      const angle = Math.random() * Math.PI * 2;
      // These tweens intentionally outlive the entire remaining payoff/exit window.
      // The overlay is destroyed before they can finish, so the echoes are always
      // still in motion right up to the final frame instead of settling early.
      const duration = 7.0 + Math.random() * 1.0; // 7.0–8.0 s
      const speed = 18 + Math.random() * 16; // 18–34 px/s
      const distance = speed * duration; // preserves the established motion feel
      const rotationDirection = Math.random() < 0.5 ? -1 : 1;
      const rotationDelta =
        rotationDirection * (0.18 + Math.random() * 0.42); // ±0.18–0.60 rad
      const scaleFactor = 0.94 + Math.random() * 0.18; // 0.94–1.12
      return {
        echo,
        layout,
        baseScale,
        motion: {
          x: layout.x + Math.cos(angle) * distance,
          y: layout.y + Math.sin(angle) * distance,
          rotation: startRotation + rotationDelta,
          duration,
          scaleFactor,
        },
      };
    });
    const revealCardFace = (
      card: ChoiceCard,
      multiplier: number,
      isSelected: boolean,
    ): void => {
      card.artwork.visible = false;
      card.multiplier.text = `×${multiplier}`;
      card.multiplier.alpha = 0;
      card.multiplier.scale.set(isSelected ? 0.88 : 0.78);
      card.multiplier.style.fontSize = isSelected ? 58 : 42;
      setCardSurface(card.surface, {
        fillAlpha: isSelected ? 0.97 : 0.9,
        borderColor: isSelected ? 0xc75cff : 0xa78bb3,
        borderAlpha: isSelected ? 1 : 0.72,
        borderWidth: isSelected ? 3 : 1.5,
      });
      card.selectionRing.alpha = isSelected ? 0.78 : 0;
    };
    const timeline = gsap.timeline({
      onComplete: () => {
        finish();
      },
    });
    // Beat 1 — click acknowledgement. The card/object pops; the podium label lives
    // in the backdrop layer and therefore remains visually planted.
    timeline
      .to(selectedCard.selectionRing, {
        alpha: 1,
        duration: 0.08,
        ease: 'power1.out',
      }, 0)
      .to(selectedCard.container.scale, {
        x: 1.08,
        y: 1.08,
        duration: 0.1,
        ease: 'power2.out',
      }, 0)
      .to(selectedCard.container.scale, {
        x: 1.02,
        y: 1.02,
        duration: 0.14,
        ease: 'power2.inOut',
      });
    // Beat 2 — silence the rest of the interface and create anticipation.
    passiveCards.forEach((card) => {
      timeline.to(card.container, {
        alpha: 0.32,
        duration: 0.24,
        ease: 'power1.out',
      }, 0.18);
      timeline.to(card.container.scale, {
        x: 0.96,
        y: 0.96,
        duration: 0.24,
        ease: 'power2.out',
      }, 0.18);
    });
    timeline
      .to(panelVeil, {
        alpha: 0.76,
        duration: 0.38,
        ease: 'power1.inOut',
      }, 0.28)
      .to(backdropLayer, {
        alpha: 0.44,
        duration: 0.38,
        ease: 'power1.inOut',
      }, 0.28);
    // Beat 3 — selected result reveal. Keep the card physically stable: fade the
    // mystery artwork away, swap the face, then let the multiplier pop into place.
    timeline
      .to(selectedCard.artwork, {
        alpha: 0,
        duration: 0.17,
        ease: 'power1.in',
      }, 0.66)
      .call(() => {
        revealCardFace(selectedCard, selectedMultiplier, true);
      }, [], 0.83)
      .to(selectedCard.multiplier, {
        alpha: 1,
        duration: 0.16,
        ease: 'power1.out',
      }, 0.84)
      .to(selectedCard.multiplier.scale, {
        x: 1,
        y: 1,
        duration: 0.18,
        ease: 'back.out(1.5)',
      }, 0.84);
    // Beat 4 — give the selected result a real recognition hold before revealing
    // the unchosen outcomes. The player should have time to read what they won.
    timeline.to({}, { duration: 0.36 });
    // Beat 5 — reveal the other two outcomes quickly and consistently.
    passiveCards.forEach((card, index) => {
      const passiveMultiplier = resolveChoice(card.choice);
      const start = 1.48 + index * 0.19;
      timeline
        .to(card.artwork, {
          alpha: 0,
          duration: 0.13,
          ease: 'power1.in',
        }, start)
        .call(() => {
          revealCardFace(card, passiveMultiplier, false);
        }, [], start + 0.13)
        .to(card.container, {
          alpha: 0.58,
          duration: 0.12,
          ease: 'power1.out',
        }, start + 0.14)
        .to(card.multiplier, {
          alpha: 1,
          duration: 0.12,
          ease: 'power1.out',
        }, start + 0.14)
        .to(card.multiplier.scale, {
          x: 1,
          y: 1,
          duration: 0.15,
          ease: 'power2.out',
        }, start + 0.14);
    });
    // Beat 6 — settle the card comparison, then deliberately hand visual control
    // to one centralized result. This is the feature's payoff frame.
    const heroStart = 2.08;
    timeline.call(() => {
      heroMultiplier.text = `×${selectedMultiplier}`;
    }, [], heroStart);
    cards.forEach((card, choice) => {
      timeline.to(card.container, {
        alpha: choice === selectedChoice ? 0.045 : 0.02,
        duration: 0.34,
        ease: 'power1.inOut',
      }, heroStart + 0.06);
    });
    // Start the selected-item atmosphere invisibly at the moment the chosen card
    // reveals. Give every echo its final opacity immediately while the parent layer
    // is still fully hidden, then let all 31 objects move behind the scenes.
    timeline.call(() => {
      choiceEchoes.forEach(({ echo, layout, baseScale, motion }) => {
        echo.alpha = layout.alpha;
        gsap.to(echo, {
          x: motion.x,
          y: motion.y,
          rotation: motion.rotation,
          duration: motion.duration,
          ease: 'none',
        });
        gsap.to(echo.scale, {
          x: baseScale * motion.scaleFactor,
          y: baseScale * motion.scaleFactor,
          duration: motion.duration,
          ease: 'none',
        });
      });
    }, [], 0.83);
    // Reveal the whole already-moving field as one layer when the backdrop begins
    // to suppress. No per-object stagger means nothing visibly "spawns" afterward.
    timeline.to(choiceEchoLayer, {
      alpha: 1,
      duration: 0.28,
      ease: 'power1.out',
    }, heroStart + 0.06);
    timeline
      // Once the outcome is known, the locked artwork becomes atmosphere rather
      // than information. Darken it decisively so the result frame owns the modal.
      .to(panelVeil, {
        alpha: 0.94,
        duration: 0.34,
        ease: 'power1.inOut',
      }, heroStart + 0.06)
      .to(backdropLayer, {
        alpha: 0.14,
        duration: 0.34,
        ease: 'power1.inOut',
      }, heroStart + 0.06)
      .to(heroFrame, {
        alpha: 1,
        duration: 0.22,
        ease: 'power1.out',
      }, heroStart + 0.16)
      .to(heroCaption, {
        alpha: 0.92,
        duration: 0.2,
        ease: 'power1.out',
      }, heroStart + 0.2)
      .to(heroMultiplier, {
        alpha: 1,
        duration: 0.18,
        ease: 'power1.out',
      }, heroStart + 0.2)
      .to(heroMultiplier.scale, {
        x: 1.08,
        y: 1.08,
        duration: 0.3,
        ease: 'back.out(1.85)',
      }, heroStart + 0.2)
      .to(heroMultiplier.scale, {
        x: 1,
        y: 1,
        duration: 0.18,
        ease: 'power2.out',
      }, heroStart + 0.5)
      .to(heroConfirmation, {
        alpha: 0.88,
        duration: 0.18,
        ease: 'power1.out',
      }, heroStart + 0.42);
    // Beat 7 — recognition hold. Give the player enough time to register the
    // centered result before the presentation hands control back to the base game.
    timeline.to({}, { duration: 3.1 });
    // Beat 8 — compact the result before the modal goes away. This makes the
    // subsequent base-game multiplier indicator feel like the continuation of
    // the same state rather than an unrelated UI pop.
    timeline
      // Let the selected-item echoes keep moving while the modal fades away.
      // Their motion is cleaned up only when the overlay is destroyed at the end.
      .to(choiceEchoLayer, {
        alpha: 0,
        duration: 0.18,
        ease: 'power1.in',
      })
      .to(heroConfirmation, {
        alpha: 0,
        duration: 0.16,
        ease: 'power1.in',
      }, '<')
      .to(heroFrame, {
        alpha: 0,
        duration: 0.18,
        ease: 'power1.in',
      }, '<')
      .to(heroCaption, {
        alpha: 0,
        duration: 0.16,
        ease: 'power1.in',
      }, '<')
      .to(heroMultiplier.scale, {
        x: 0.72,
        y: 0.72,
        duration: 0.24,
        ease: 'power2.inOut',
      }, '<')
      .to(heroMultiplier, {
        y: 455,
        alpha: 0,
        duration: 0.26,
        ease: 'power2.in',
      }, '<')
      .to(panel, {
        alpha: 0,
        duration: 0.24,
        ease: 'power1.in',
      }, '<0.06')
      .to(dimmer, {
        alpha: 0,
        duration: 0.28,
        ease: 'power1.in',
      }, '<0.02')
      .to(overlay, {
        alpha: 0,
        duration: 0.18,
        ease: 'power1.in',
      }, '<0.08');
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
