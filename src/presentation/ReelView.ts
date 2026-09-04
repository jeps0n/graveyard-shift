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
  private readonly symbolLabels: Text[][] = [];
  private readonly winningCells = new Map<string, Graphics>();
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
    const labels =
      this.symbolLabels[reelIndex];
    if (!labels) {
      return;
    }
    for (
      let row = 0;
      row < labels.length && row < symbols.length;
      row++
    ) {
      labels[row].text =
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
    this.symbolLabels.length = 0;
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
      this.symbolLabels.push([]);
      for (
        let row = 0;
        row < grid[reel].length;
        row++
      ) {
        const symbol = grid[reel][row];
        const cell = new Graphics()
          .roundRect(
            0,
            row * (REEL_HEIGHT + GAP),
            REEL_WIDTH,
            REEL_HEIGHT,
            10,
          )
          .fill(0x20252c)
          .stroke({
            width: 2,
            color: 0x555d68,
          });
        this.winningCells.set(
          `${reel},${row}`,
          cell,
        );
        reelSpinner.addChild(cell);
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
        this.symbolLabels[reel].push(label);
        label.x = REEL_WIDTH / 2;
        label.y =
          row * (REEL_HEIGHT + GAP) +
          REEL_HEIGHT / 2;
        reelSpinner.addChild(label);
        const coordinate = new Text({
          text: `(${reel + 1},${row + 1})`,
          style: {
            fill: 0xaaaaaa,
            fontSize: 12,
          },
        });
        coordinate.x = 8;
        coordinate.y =
          row * (REEL_HEIGHT + GAP) + 8;
        reelSpinner.addChild(coordinate);
      }
    }
  }
}