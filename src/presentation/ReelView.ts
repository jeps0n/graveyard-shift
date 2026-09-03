import { Container, Graphics, Text } from 'pixi.js';
import type { ReelGrid, SymbolId } from '../game/types';

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

export class ReelView extends Container {
  constructor() {
    super();

    this.createPlaceholderGrid();
  }

  displayResult(grid: ReelGrid): void {
    this.removeChildren();
    this.createGrid(grid);
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
        label.x = reel * (REEL_WIDTH + GAP) + REEL_WIDTH / 2;
        label.y = row * (REEL_HEIGHT + GAP) + REEL_HEIGHT / 2;

        this.addChild(label);
      }
    }
  }
}