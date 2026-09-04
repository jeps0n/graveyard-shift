import {
  Container,
  Graphics,
  Text,
} from 'pixi.js';
import { gsap } from 'gsap';
import type {
  ReelGrid,
  SymbolId,
  WinResult,
} from '../game/types';
import { PAYLINES } from '../math/Paylines';
const REEL_WIDTH = 120;
const REEL_HEIGHT = 120;
const GAP = 10;
const SYMBOL_LABELS: Record<SymbolId, string> = {
  coffee: 'COFFEE',
  burger: 'BURGER',
  gas: 'GAS',
  chip: 'CHIP',
  dice: 'DICE',
  zed: 'ZED',
  gary: 'GARY',
  barkley: 'BARKLEY',
  victor: 'VICTOR',
  marge: 'MARGE',
  scatter: 'MIDNIGHT',
};
interface TileVisual {
  readonly container: Container;
  readonly cell: Graphics;
  readonly label: Text;
  readonly coordinate: Text;
}
const PAYLINE_COLORS = [
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
export class ReelView extends Container {
  private readonly gridLayer: Container;
  private readonly paylineLayer: Container;
  private readonly reelLayers: Container[] = [];
  private readonly reelSpinners: Container[] = [];
  private readonly reelTiles: TileVisual[][] = [];
  private readonly winningCells = new Map<string, Graphics>();
  private displayedGrid: ReelGrid = [];
  constructor() {
    super();
    this.gridLayer = new Container();
    this.paylineLayer = new Container();
    this.addChild(this.gridLayer);
    this.addChild(this.paylineLayer);
    this.createPlaceholderGrid();
  }
  displayResult(grid: ReelGrid): void {
    console.log('[ReelView] displayResult called', grid);
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
    // Give the reels a short visible spin before the
    // sequential stop/reveal phase begins.
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
      // Take only this reel out of the active spin.
      // Other reels continue moving until their own stop.
      gsap.killTweensOf(spinner);
      await new Promise<void>((resolve) => {
        gsap.to(spinner, {
          y: 0,
          duration: 0.2,
          ease: 'back.out(1.5)',
          onComplete: resolve,
        });
      });
      // The stopped reel gets its new data immediately.
      // The remaining reels still show their old data.
      this.revealReel(
        reelIndex,
        grid[reelIndex],
      );
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
    // Winning symbols disappear as complete visual tiles.
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
    // Only surviving tiles that need to move are animated. The entire tile
    // container moves so its background, symbol, and coordinate stay together.
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
    // The faded tiles are no longer part of the visible reel. Survivors keep
    // their existing containers so their identity is preserved across steps.
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
    // New symbols are created as complete tiles above the visible window and
    // fall into exactly the positions opened by the removed symbols.
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
    // Re-index both tile references and winning-cell references to match the
    // new logical grid before the next evaluation/cascade can begin.
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
    const winningPositions = new Set<string>();
    for (const win of wins) {
      for (const position of win.positions) {
        winningPositions.add(
          `${position.reel},${position.row}`,
        );
      }
    }
    const animations: Promise<void>[] = [];
    for (const key of winningPositions) {
      const cell = this.winningCells.get(key);
      if (!cell) {
        continue;
      }
      animations.push(
        new Promise<void>((resolve) => {
          gsap.to(cell, {
            alpha: 0.25,
            duration: 0.16,
            yoyo: true,
            repeat: 3,
            ease: 'power1.inOut',
            onComplete: resolve,
          });
        }),
      );
    }
    await Promise.all(animations);
  }
  displayWinningPaylines(wins: WinResult[]): void {
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
        color: PAYLINE_COLORS[paylineIndex],
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
      tiles[row].label.text =
        SYMBOL_LABELS[symbols[row]];
    }
  }
  private stopReelAnimation(): void {
    for (const spinner of this.reelSpinners) {
      gsap.killTweensOf(spinner);
      gsap.killTweensOf(spinner.scale);
      spinner.y = 0;
      spinner.scale.set(1);
    }
    for (const reelLayer of this.reelLayers) {
      reelLayer.alpha = 1;
    }
    for (const cell of this.winningCells.values()) {
      gsap.killTweensOf(cell);
      cell.alpha = 1;
    }
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
    console.log('[ReelView] createGrid called', grid);
    this.reelLayers.length = 0;
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
    const cell = new Graphics()
      .roundRect(
        0,
        0,
        REEL_WIDTH,
        REEL_HEIGHT,
        10,
      )
      .fill(0x20252c)
      .stroke({
        width: 2,
        color: 0x555d68,
      });
    tileContainer.addChild(cell);
    const label = new Text({
      text: SYMBOL_LABELS[symbol],
      style: {
        fill: 0xffffff,
        fontSize: 16,
        fontWeight: 'bold',
        align: 'center',
      },
    });
    label.anchor.set(0.5);
    label.x = REEL_WIDTH / 2;
    label.y = REEL_HEIGHT / 2;
    tileContainer.addChild(label);
    const coordinate = new Text({
      text: `(${reel + 1},${row + 1})`,
      style: {
        fill: 0xaaaaaa,
        fontSize: 12,
      },
    });
    coordinate.x = 8;
    coordinate.y = 8;
    tileContainer.addChild(coordinate);
    return {
      container: tileContainer,
      cell,
      label,
      coordinate,
    };
  }
}
