import { Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';
import { GlowFilter } from 'pixi-filters';
import { gsap } from 'gsap';
import type { MidnightChoice } from '../features/AfterMidnight';
export const CARD_WIDTH = 100;
export const CARD_HEIGHT = 100;
export const CARD_Y = 256;
export const CARD_X = [319, 500, 683] as const;
export const CHOICES: MidnightChoice[] = ['gasCan', 'candyBar', 'plushDoll'];
const LABELS: Record<MidnightChoice, string> = {
  gasCan: 'GAS CAN', candyBar: 'CANDY BAR', plushDoll: 'PLUSH DOLL',
};
export type ChoiceCard = {
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
export type CardSurfaceOptions = {
  fillAlpha: number;
  borderColor: number;
  borderAlpha: number;
  borderWidth: number;
};

export const setCardSurface = (
        surface: Graphics,
        options: CardSurfaceOptions,
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

export function createMidnightChoiceCards(args: {
  textures: Record<MidnightChoice, Texture>;
  overlay: Container;
  backdropLayer: Container;
  isSelected: () => boolean;
  onSelect: (choice: MidnightChoice) => void;
  panelX: number;
  panelY: number;
}): { cards: Map<MidnightChoice, ChoiceCard>; idleTweens: gsap.core.Tween[] } {
  const { textures, overlay, backdropLayer, isSelected, onSelect, panelX: PANEL_X, panelY: PANEL_Y } = args;
  const cards = new Map<MidnightChoice, ChoiceCard>();
  const idleTweens: gsap.core.Tween[] = [];
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
  if (isSelected()) return;
  artworkGlow.enabled = true;
  label.style.fill = 0xffffff;
  gsap.to(selectionRing, {
    alpha: 0.72,
    duration: 0.12,
    ease: 'power1.out',
  });
});
hitArea.on('pointerout', () => {
  if (isSelected()) return;
  artworkGlow.enabled = false;
  label.style.fill = 0xf0d7a0;
  gsap.to(selectionRing, {
    alpha: 0,
    duration: 0.12,
    ease: 'power1.out',
  });
});
        hitArea.on('pointertap', () => {
          onSelect(choice);
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
  return { cards, idleTweens };
}
