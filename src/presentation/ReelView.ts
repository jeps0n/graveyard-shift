import {
  Container,
  Graphics,
  Sprite,
  Text,
  Texture,
} from 'pixi.js';
import { gsap } from 'gsap';
import type {
  ReelGrid,
  SymbolId,
  WinResult,
} from '../game/types';
import { PAYLINES } from '../math/Paylines';
import { SYMBOL_ASSET_URLS } from '../assets/SymbolAssets';
import { SYMBOL_PRESENTATION } from './SymbolPresentation';
const REEL_WIDTH = 120;
const REEL_HEIGHT = 120;
const GAP = 10;
const TILE_RADIUS = 8;
const TILE_BORDER_WIDTH = 3;
const WIN_PUNCH_SCALE = 1.07;
interface TileVisual {
  readonly container: Container;
  readonly visual: Container;
  readonly cell: Graphics;
  readonly symbol: Sprite;
  readonly frame: Graphics;
  readonly coordinate: Text;
}
const DEV_PAYLINE_COLORS = [
  0xff0000,
  0xff8000,
  0xffff00,
  0x00ff00,
  0x00ffff,
  0x0000ff,
  0x8000ff,
  0xff00ff,
  0x8b4513,
  0xffffff,
];
// ─────────────────────────────────────────────
// Reel Presentation / Tile Identity
// ─────────────────────────────────────────────
// ReelView owns visual reel motion only. Logical outcomes arrive pre-resolved,
// while tile containers preserve visual identity across wins and cascades.
export class ReelView extends Container {
  private readonly gridLayer: Container;
  private readonly paylineLayer: Container;
  private readonly reelLayers: Container[] = [];
  private readonly reelMasks: Graphics[] = [];
  private readonly reelSpinners: Container[] = [];
  private readonly reelTiles: TileVisual[][] = [];
  private readonly winningCells = new Map<string, Graphics>();
  private displayedGrid: ReelGrid = [];
  private devMode = false;
  private coordinatesVisible = true;
  private paylinesVisible = true;
  constructor() {
    super();
    this.gridLayer = new Container();
    this.paylineLayer = new Container();
    this.addChild(this.gridLayer);
    this.addChild(this.paylineLayer);
    this.createPlaceholderGrid();
  }
  displayResult(grid: ReelGrid): void {
    this.stopReelAnimation();
    this.gridLayer.removeChildren();
    this.createGrid(grid);
    this.displayedGrid = grid.map((reel) => [...reel]);
  }
  async animateSpin(): Promise<void> {
    this.clearWinningPaylines();
    this.stopReelAnimation();
    for (
      let reelIndex = 0;
      reelIndex < this.reelSpinners.length;
      reelIndex++
    ) {
      const reelSpinner =
        this.reelSpinners[reelIndex];
      gsap.to(reelSpinner, {
        y: 360,
        duration: 0.18,
        repeat: -1,
        ease: 'none',
        delay: reelIndex * 0.08,
      });
    }
    // Establish a short shared spin phase before sequential reel stops begin.
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 900);
    });
  }
  async animateReelStops(
    grid: ReelGrid,
  ): Promise<void> {
    for (
      let reelIndex = 0;
      reelIndex < this.reelSpinners.length;
      reelIndex++
    ) {
      const spinner =
        this.reelSpinners[reelIndex];
      gsap.killTweensOf(spinner);
      this.revealReel(
        reelIndex,
        grid[reelIndex],
      );
      await new Promise<void>((resolve) => {
        gsap.to(spinner, {
          y: 0,
          duration: 0.2,
          ease: 'back.out(1.5)',
          onComplete: resolve,
        });
      });
      await new Promise<void>((resolve) => {
        gsap.to(spinner.scale, {
          x: 1.04,
          y: 0.96,
          duration: 0.08,
          yoyo: true,
          repeat: 1,
          ease: 'power2.out',
          onComplete: resolve,
        });
      });
    }
  }
  async animateCascadeStep(
    removed: Array<{ reel: number; row: number }>,
    grid: ReelGrid,
  ): Promise<void> {
    const removedByReel = new Map<number, Set<number>>();
    for (const position of removed) {
      let rows = removedByReel.get(position.reel);
      if (!rows) {
        rows = new Set<number>();
        removedByReel.set(position.reel, rows);
      }
      rows.add(position.row);
    }
    // Remove winning symbols as complete tiles so symbol, backing, and DEV coordinate
    // remain visually atomic throughout the cascade.
    const removedAnimations: Promise<void>[] = [];
    for (const [reelIndex, rows] of removedByReel) {
      const tiles = this.reelTiles[reelIndex];
      if (!tiles) {
        continue;
      }
      for (const row of rows) {
        const tile = tiles[row];
        if (!tile) {
          continue;
        }
        removedAnimations.push(
          new Promise<void>((resolve) => {
            gsap.to(tile.container, {
              alpha: 0,
              duration: 0.16,
              ease: 'power1.out',
              onComplete: resolve,
            });
          }),
        );
      }
    }
    await Promise.all(removedAnimations);
    // Move only surviving tiles whose logical row changed. Animating the complete
    // tile preserves its background, symbol, and DEV coordinate as one identity.
    const collapseAnimations: Promise<void>[] = [];
    for (let reelIndex = 0; reelIndex < grid.length; reelIndex++) {
      const tiles = this.reelTiles[reelIndex];
      const currentSymbols = this.displayedGrid[reelIndex];
      const removedRows = removedByReel.get(reelIndex) ?? new Set<number>();
      if (!tiles || !currentSymbols) {
        continue;
      }
      const survivorRows: number[] = [];
      for (let row = 0; row < currentSymbols.length; row++) {
        if (!removedRows.has(row)) {
          survivorRows.push(row);
        }
      }
      const emptyCount = removedRows.size;
      for (let survivorIndex = 0; survivorIndex < survivorRows.length; survivorIndex++) {
        const sourceRow = survivorRows[survivorIndex];
        const targetRow = emptyCount + survivorIndex;
        const tile = tiles[sourceRow];
        if (!tile || sourceRow === targetRow) {
          continue;
        }
        tile.coordinate.text = `(${reelIndex + 1},${targetRow + 1})`;
        collapseAnimations.push(
          new Promise<void>((resolve) => {
            gsap.to(tile.container, {
              y: targetRow * (REEL_HEIGHT + GAP),
              duration: 0.24,
              ease: 'power2.in',
              onComplete: resolve,
            });
          }),
        );
      }
    }
    await Promise.all(collapseAnimations);
    // Destroy removed tiles after their fade; retain survivor containers so visual
    // identity persists into the next cascade step.
    for (const [reelIndex, rows] of removedByReel) {
      const spinner = this.reelSpinners[reelIndex];
      const tiles = this.reelTiles[reelIndex];
      if (!spinner || !tiles) {
        continue;
      }
      for (const row of rows) {
        const tile = tiles[row];
        if (tile) {
          spinner.removeChild(tile.container);
        }
      }
    }
    // Create refill symbols above the reel mask and drop them only into vacancies
    // produced by the resolved cascade.
    const nextTilesByReel: TileVisual[][] = [];
    const refillAnimations: Promise<void>[] = [];
    for (let reelIndex = 0; reelIndex < grid.length; reelIndex++) {
      const spinner = this.reelSpinners[reelIndex];
      const tiles = this.reelTiles[reelIndex];
      const removedRows = removedByReel.get(reelIndex) ?? new Set<number>();
      if (!spinner || !tiles) {
        nextTilesByReel.push(tiles ?? []);
        continue;
      }
      const refillCount = removedRows.size;
      const survivorTiles: TileVisual[] = [];
      for (let row = 0; row < tiles.length; row++) {
        if (!removedRows.has(row)) {
          survivorTiles.push(tiles[row]);
        }
      }
      const refillTiles: TileVisual[] = [];
      for (let refillIndex = 0; refillIndex < refillCount; refillIndex++) {
        const targetRow = refillIndex;
        const tile = this.createTile(
          grid[reelIndex][targetRow],
          reelIndex,
          targetRow,
        );
        const startRow = -(refillCount - refillIndex);
        tile.container.y = startRow * (REEL_HEIGHT + GAP);
        spinner.addChild(tile.container);
        refillTiles.push(tile);
        refillAnimations.push(
          new Promise<void>((resolve) => {
            gsap.to(tile.container, {
              y: targetRow * (REEL_HEIGHT + GAP),
              duration: 0.28,
              ease: 'back.out(1.2)',
              onComplete: resolve,
            });
          }),
        );
      }
      nextTilesByReel.push([
        ...refillTiles,
        ...survivorTiles,
      ]);
    }
    await Promise.all(refillAnimations);
    // Re-index tile and winning-cell references before the next step so visual
    // coordinates remain aligned with the newly resolved logical grid.
    this.winningCells.clear();
    for (let reelIndex = 0; reelIndex < nextTilesByReel.length; reelIndex++) {
      const tiles = nextTilesByReel[reelIndex];
      this.reelTiles[reelIndex] = tiles;
      for (let row = 0; row < tiles.length; row++) {
        const tile = tiles[row];
        tile.coordinate.text = `(${reelIndex + 1},${row + 1})`;
        this.winningCells.set(
          `${reelIndex},${row}`,
          tile.cell,
        );
      }
    }
    this.displayedGrid = grid.map((reel) => [...reel]);
  }
  async animateWinningSymbols(
    wins: WinResult[],
  ): Promise<void> {
    if (wins.length === 0) {
      return;
    }
    // ─────────────────────────────────────────────
    // Win Emphasis / Temporary Mask Release
    // ─────────────────────────────────────────────
    // Reel masks are required while symbols spin and cascade, but they would
    // clip the win punch at the 120px reel boundary. During the settled win
    // beat, temporarily release those masks so the 1.07x tile can breathe
    // into the existing 10px gutters. Neighboring winners remain separated.
    for (let reelIndex = 0; reelIndex < this.reelLayers.length; reelIndex++) {
      const reelLayer = this.reelLayers[reelIndex];
      const mask = this.reelMasks[reelIndex];
      reelLayer.mask = null;
      if (mask) {
        // While detached from reelLayer.mask, the mask Graphics becomes a
        // normal child and would render as a solid white rectangle. Hide it
        // only for the unmasked win-punch beat.
        mask.visible = false;
      }
    }
    const allTiles: TileVisual[] = [];
    for (const tiles of this.reelTiles) {
      allTiles.push(...tiles);
    }
    // Keep the win-read beat bounded even when several paylines hit. Each line
    // gets an immediate, readable symbol emphasis while the existing DEV
    // paylines remain visible and persistent.
    const beatDuration = Math.min(0.4, 1.2 / wins.length);
    const punchDuration = Math.min(0.14, beatDuration * 0.35);
    const holdDuration = Math.max(0.08, beatDuration - punchDuration * 2);
    for (const win of wins) {
      const activePositions = new Set(
        win.positions.map(
          (position) => `${position.reel},${position.row}`,
        ),
      );
      for (let reelIndex = 0; reelIndex < this.reelTiles.length; reelIndex++) {
        const tiles = this.reelTiles[reelIndex];
        for (let row = 0; row < tiles.length; row++) {
          const tile = tiles[row];
          const isActive = activePositions.has(`${reelIndex},${row}`);
          gsap.killTweensOf(tile.container);
          gsap.killTweensOf(tile.visual.scale);
          tile.container.alpha = isActive ? 1 : 0.31;
          tile.visual.scale.set(1);
        }
      }
      const activeTiles = win.positions
        .map((position) => this.reelTiles[position.reel]?.[position.row])
        .filter((tile): tile is TileVisual => tile !== undefined);
      await Promise.all(
        activeTiles.map(
          (tile) =>
            new Promise<void>((resolve) => {
              gsap.to(tile.visual.scale, {
                x: WIN_PUNCH_SCALE,
                y: WIN_PUNCH_SCALE,
                duration: punchDuration,
                ease: 'power2.out',
                onComplete: resolve,
              });
            }),
        ),
      );
      await new Promise<void>((resolve) => {
        setTimeout(resolve, holdDuration * 1000);
      });
      await Promise.all(
        activeTiles.map(
          (tile) =>
            new Promise<void>((resolve) => {
              gsap.to(tile.visual.scale, {
                x: 1,
                y: 1,
                duration: punchDuration,
                ease: 'power2.inOut',
                onComplete: resolve,
              });
            }),
        ),
      );
    }
    for (const tile of allTiles) {
      gsap.killTweensOf(tile.container);
      gsap.killTweensOf(tile.visual.scale);
      tile.container.alpha = 1;
      tile.visual.scale.set(1);
    }
    for (let reelIndex = 0; reelIndex < this.reelLayers.length; reelIndex++) {
      const mask = this.reelMasks[reelIndex];
      if (mask) {
        mask.visible = true;
      }
      this.reelLayers[reelIndex].mask = mask ?? null;
    }
    // Preserve one final all-payline read before control passes to the cascade.
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 180);
    });
  }
  setDevMode(enabled: boolean): void {
    this.devMode = enabled;
    this.paylineLayer.visible = enabled && this.paylinesVisible;
    for (const tiles of this.reelTiles) {
      for (const tile of tiles) {
        tile.coordinate.visible = enabled && this.coordinatesVisible;
        const background = tile.visual.getChildByLabel('dev-coordinate-background');
        if (background) {
          background.visible = enabled && this.coordinatesVisible;
        }
      }
    }
    if (!enabled) {
      this.clearWinningPaylines();
    }
  }
  setCoordinatesVisible(visible: boolean): void {
    this.coordinatesVisible = visible;
    for (const tiles of this.reelTiles) {
      for (const tile of tiles) {
        tile.coordinate.visible = this.devMode && visible;
        const background = tile.visual.getChildByLabel('dev-coordinate-background');
        if (background) {
          background.visible = this.devMode && visible;
        }
      }
    }
  }
  setPaylinesVisible(visible: boolean): void {
    this.paylinesVisible = visible;
    this.paylineLayer.visible = this.devMode && visible;
  }
  displayWinningPaylines(wins: WinResult[]): void {
    if (!this.devMode) {
      return;
    }
    this.paylineLayer.removeChildren();
    const displayedPaylines = new Set<number>();
    for (const win of wins) {
      if (displayedPaylines.has(win.payline)) {
        continue;
      }
      displayedPaylines.add(win.payline);
      const paylineIndex = win.payline - 1;
      const payline = PAYLINES[paylineIndex];
      if (!payline) {
        continue;
      }
      const line = new Graphics();
      for (
        let reel = 0;
        reel < payline.length;
        reel++
      ) {
        const x =
          reel * (REEL_WIDTH + GAP) +
          REEL_WIDTH / 2;
        const y =
          payline[reel] * (REEL_HEIGHT + GAP) +
          REEL_HEIGHT / 2;
        if (reel === 0) {
          line.moveTo(x, y);
        } else {
          line.lineTo(x, y);
        }
      }
      line.stroke({
        width: 3,
        color: DEV_PAYLINE_COLORS[paylineIndex],
        alpha: 0.8,
      });
      this.paylineLayer.addChild(line);
    }
  }
  clearWinningPaylines(): void {
    this.paylineLayer.removeChildren();
  }
  private revealReel(
    reelIndex: number,
    symbols: ReelGrid[number],
  ): void {
    const tiles = this.reelTiles[reelIndex];
    if (!tiles) {
      return;
    }
    for (
      let row = 0;
      row < tiles.length && row < symbols.length;
      row++
    ) {
      this.applySymbolPresentation(tiles[row], symbols[row]);
    }
  }
  private stopReelAnimation(): void {
    for (const spinner of this.reelSpinners) {
      gsap.killTweensOf(spinner);
      gsap.killTweensOf(spinner.scale);
      spinner.y = 0;
      spinner.scale.set(1);
    }
    for (let reelIndex = 0; reelIndex < this.reelLayers.length; reelIndex++) {
      const reelLayer = this.reelLayers[reelIndex];
      reelLayer.alpha = 1;
      reelLayer.mask = this.reelMasks[reelIndex] ?? null;
    }
    for (const cell of this.winningCells.values()) {
      gsap.killTweensOf(cell);
      cell.alpha = 1;
    }
  }
  private applySymbolPresentation(
    tile: TileVisual,
    symbol: SymbolId,
  ): void {
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

  private createPlaceholderGrid(): void {
    const grid: ReelGrid = [
      ['coffee', 'burger', 'gas'],
      ['chip', 'dice', 'zed'],
      ['gary', 'barkley', 'victor'],
      ['marge', 'coffee', 'burger'],
      ['gas', 'scatter', 'chip'],
    ];
    this.createGrid(grid);
  }
  private createGrid(grid: ReelGrid): void {
    this.reelLayers.length = 0;
    this.reelMasks.length = 0;
    this.reelSpinners.length = 0;
    this.reelTiles.length = 0;
    this.winningCells.clear();
    for (
      let reel = 0;
      reel < grid.length;
      reel++
    ) {
      const reelLayer = new Container();
      const reelSpinner = new Container();
      reelLayer.x = reel * (REEL_WIDTH + GAP);
      const mask = new Graphics()
        .rect(
          0,
          0,
          REEL_WIDTH,
          3 * REEL_HEIGHT + (3 - 1) * GAP,
        )
        .fill(0xffffff);
      reelLayer.addChild(mask);
      reelLayer.mask = mask;
      reelLayer.addChild(reelSpinner);
      this.gridLayer.addChild(reelLayer);
      this.reelLayers.push(reelLayer);
      this.reelMasks.push(mask);
      this.reelSpinners.push(reelSpinner);
      const tiles: TileVisual[] = [];
      for (
        let row = 0;
        row < grid[reel].length;
        row++
      ) {
        const tile = this.createTile(
          grid[reel][row],
          reel,
          row,
        );
        reelSpinner.addChild(tile.container);
        tiles.push(tile);
        this.winningCells.set(
          `${reel},${row}`,
          tile.cell,
        );
      }
      this.reelTiles.push(tiles);
    }
  }
  private createTile(
    symbol: SymbolId,
    reel: number,
    row: number,
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
    coordinateBackground.visible = this.devMode && this.coordinatesVisible;
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
    coordinate.visible = this.devMode && this.coordinatesVisible;
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
}
