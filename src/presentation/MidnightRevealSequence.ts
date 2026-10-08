import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { gsap } from 'gsap';
import type { MidnightChoice } from '../features/AfterMidnight';
import { CHOICES, setCardSurface, type ChoiceCard } from './MidnightChoiceCards';

export function playMidnightRevealSequence(args: {
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
    // ─────────────────────────────────────────────
    // Selected-Item Atmosphere
    // ─────────────────────────────────────────────
    // Repeat only the item the player actually chose in the final-payoff atmosphere.
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
    // ─────────────────────────────────────────────
    // Reveal Choreography
    // ─────────────────────────────────────────────
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
    // Beat 1 — Selection acknowledgement. The card/object pops; the podium label lives
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
    // Beat 2 — Suppress competing choices and establish anticipation.
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
    // Beat 3 — Selected result reveal. Keep the card physically stable: fade the
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
    // Beat 4 — Recognition hold. Give the selected result time to register before revealing
    // the unchosen outcomes. The player should have time to read what they won.
    timeline.to({}, { duration: 0.36 });
    // Beat 5 — Passive reveal. Expose the two unchosen outcomes quickly and consistently.
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
    // Beat 6 — Hero handoff. Settle the comparison, then hand visual control
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
    // Beat 7 — Hero recognition hold. Keep the centralized result readable before
    // presentation hands control back to the base game.
    timeline.to({}, { duration: 3.1 });
    // Beat 8 — Exit handoff. Compact the result before the modal leaves so the
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
