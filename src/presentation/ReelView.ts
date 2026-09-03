import { Container, Graphics, Text } from 'pixi.js';
import type { ReelGrid, SymbolId, WinResult } from '../game/types';
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
  0xff0000, // RED — Payline 1
  0xff8000, // ORANGE — Payline 2
  0xffff00, // YELLOW — Payline 3
  0x00ff00, // GREEN — Payline 4
  0x00ffff, // CYAN — Payline 5
  0x0000ff, // BLUE — Payline 6
  0x8000ff, // PURPLE — Payline 7
  0xff00ff, // MAGENTA — Payline 8
  0x8b4513, // BROWN — Payline 9
  0xffffff, // WHITE — Payline 10
];

export class ReelView extends Container {
  constructor() {
    super();

    this.createPlaceholderGrid();
  }

  displayResult(grid: ReelGrid): void {
    this.removeChildren();
    this.createGrid(grid);
  }

  displayWinningPaylines(wins: WinResult[]): void {
    for (const win of wins) {
      const paylineIndex = win.payline - 1;
      const payline = PAYLINES[paylineIndex];

      if (!payline) {
        continue;
      }

      const line = new Graphics();

      for (let reel = 0; reel < payline.length; reel++) {
        const x =
          reel * (REEL_WIDTH + GAP) + REEL_WIDTH / 2;

        const y =
          payline[reel] * (REEL_HEIGHT + GAP) + REEL_HEIGHT / 2;

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

      this.addChild(line);
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
    for (let reel = 0; reel < grid.length; reel++) {
      for (let row = 0; row < grid[reel].length; row++) {
        const symbol = grid[reel][row];

        const cell = new Graphics()
          .roundRect(
            reel * (REEL_WIDTH + GAP),
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

        this.addChild(cell);

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
        label.x =
          reel * (REEL_WIDTH + GAP) + REEL_WIDTH / 2;
        label.y =
          row * (REEL_HEIGHT + GAP) + REEL_HEIGHT / 2;

        this.addChild(label);

        const coordinate = new Text({
          text: `(${reel},${row})`,
          style: {
            fill: 0xaaaaaa,
            fontSize: 12,
          },
        });

        coordinate.x =
          reel * (REEL_WIDTH + GAP) + 8;
        coordinate.y =
          row * (REEL_HEIGHT + GAP) + 8;

        this.addChild(coordinate);
      }
    }
  }
}