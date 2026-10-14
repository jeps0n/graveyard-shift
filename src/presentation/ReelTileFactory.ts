import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import type { SymbolId } from '../game/types';
import { SYMBOL_ASSET_URLS } from '../assets/SymbolAssets';
import { SYMBOL_PRESENTATION } from './SymbolPresentation';

export const REEL_WIDTH = 120;
export const REEL_HEIGHT = 120;
export const GAP = 10;
const TILE_RADIUS = 8;
const TILE_BORDER_WIDTH = 3;

export interface TileVisual {
  readonly container: Container;
  readonly visual: Container;
  readonly cell: Graphics;
  readonly symbol: Sprite;
  readonly frame: Graphics;
  readonly coordinate: Text;
}

export function applySymbolPresentation(tile: TileVisual, symbol: SymbolId): void {
  const presentation = SYMBOL_PRESENTATION[symbol];
  tile.symbol.texture = Texture.from(SYMBOL_ASSET_URLS[symbol]);
  tile.cell
    .clear()
    .roundRect(0, 0, REEL_WIDTH, REEL_HEIGHT, TILE_RADIUS)
    .fill(presentation.background);
  tile.frame
    .clear()
    .roundRect(
      TILE_BORDER_WIDTH / 2,
      TILE_BORDER_WIDTH / 2,
      REEL_WIDTH - TILE_BORDER_WIDTH,
      REEL_HEIGHT - TILE_BORDER_WIDTH,
      TILE_RADIUS - 1,
    )
    .stroke({ width: TILE_BORDER_WIDTH, color: presentation.main });
}

export function createTile(
  symbol: SymbolId,
  reel: number,
  row: number,
  showCoordinates: boolean,
): TileVisual {
  const tileContainer = new Container();
  tileContainer.x = 0;
  tileContainer.y =
    row * (REEL_HEIGHT + GAP);
  const tileVisual = new Container();
  tileVisual.pivot.set(REEL_WIDTH / 2, REEL_HEIGHT / 2);
  tileVisual.position.set(REEL_WIDTH / 2, REEL_HEIGHT / 2);
  tileContainer.addChild(tileVisual);
  const presentation = SYMBOL_PRESENTATION[symbol];
  const cell = new Graphics()
    .roundRect(
      0,
      0,
      REEL_WIDTH,
      REEL_HEIGHT,
      TILE_RADIUS,
    )
    .fill(presentation.background);
  tileVisual.addChild(cell);
  const symbolSprite = new Sprite(
    Texture.from(SYMBOL_ASSET_URLS[symbol]),
  );
  symbolSprite.anchor.set(0.5);
  symbolSprite.position.set(
    REEL_WIDTH / 2,
    REEL_HEIGHT / 2,
  );
  symbolSprite.width = REEL_WIDTH;
  symbolSprite.height = REEL_HEIGHT;
  const symbolMask = new Graphics()
    .roundRect(
      0,
      0,
      REEL_WIDTH,
      REEL_HEIGHT,
      TILE_RADIUS,
    )
    .fill(0xffffff);
  tileVisual.addChild(symbolMask);
  symbolSprite.mask = symbolMask;
  tileVisual.addChild(symbolSprite);
  const frame = new Graphics()
    .roundRect(
      TILE_BORDER_WIDTH / 2,
      TILE_BORDER_WIDTH / 2,
      REEL_WIDTH - TILE_BORDER_WIDTH,
      REEL_HEIGHT - TILE_BORDER_WIDTH,
      TILE_RADIUS - 1,
    )
    .stroke({
      width: TILE_BORDER_WIDTH,
      color: presentation.main,
    });
  tileVisual.addChild(frame);
  const coordinateBadgeX = 6;
  const coordinateBadgeY = 6;
  const coordinateBadgeWidth = 32;
  const coordinateBadgeHeight = 22;
  const coordinateBackground = new Graphics()
    .roundRect(
      coordinateBadgeX,
      coordinateBadgeY,
      coordinateBadgeWidth,
      coordinateBadgeHeight,
      5,
    )
    .fill({ color: 0x000000, alpha: 0.62 });
  coordinateBackground.label = 'dev-coordinate-background';
  coordinateBackground.visible = showCoordinates;
  tileVisual.addChild(coordinateBackground);

  const coordinate = new Text({
    text: `(${reel + 1},${row + 1})`,
    style: {
      fill: 0x00e5ff,
      fontSize: 12,
      fontWeight: 'bold',
    },
  });
  coordinate.anchor.set(0.5);
  coordinate.position.set(
    coordinateBadgeX + coordinateBadgeWidth / 2,
    coordinateBadgeY + coordinateBadgeHeight / 2,
  );
  coordinate.visible = showCoordinates;
  tileVisual.addChild(coordinate);
  return {
    container: tileContainer,
    visual: tileVisual,
    cell,
    symbol: symbolSprite,
    frame,
    coordinate,
  };
}
