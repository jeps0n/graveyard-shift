import { Container, Graphics } from 'pixi.js';
import type { WinResult } from '../game/types';
import { PAYLINES } from '../math/Paylines';
import { DEV_PAYLINE_COLORS } from './DevPaylineColors';
import { REEL_WIDTH, REEL_HEIGHT, GAP } from './ReelTileFactory';

/** Draw the evaluator's winning paths; callers own visibility and clearing. */
export function drawWinningPaylines(layer: Container, wins: WinResult[]): void {
  // Every path uses the evaluator's exact contributing positions. A single
  // win cannot be inferred reliably from visible symbols (Wilds are best-pay).
  const winningByLine = new Map(wins.map((win) => [win.payline, win]));
  const radius = 12;
  const contributingOpacity = 0.80;
  const remainingOpacity = 0.40;
  PAYLINES.forEach((rows, lineIndex) => {
    if (!winningByLine.has(lineIndex + 1)) return;
    const color = DEV_PAYLINE_COLORS[lineIndex];
    const contributing = new Set(
      (winningByLine.get(lineIndex + 1)?.positions ?? [])
        .map(({ reel, row }) => `${reel}:${row}`),
    );
    const centers = rows.map((row, reel) => ({
      x: reel * (REEL_WIDTH + GAP) + REEL_WIDTH / 2,
      y: row * (REEL_HEIGHT + GAP) + REEL_HEIGHT / 2,
      active: contributing.has(`${reel}:${row}`),
    }));
    const drawing = new Graphics();
    for (let i = 0; i < centers.length - 1; i++) {
      const from = centers[i];
      const to = centers[i + 1];
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distance = Math.hypot(dx, dy);
      const ux = dx / distance;
      const uy = dy / distance;
      // Segments stop at the circle perimeter: no lines inside nodes.
      drawing.moveTo(from.x + ux * radius, from.y + uy * radius);
      drawing.lineTo(to.x - ux * radius, to.y - uy * radius);
      drawing.stroke({
        width: from.active && to.active ? 6 : 4,
        color,
        alpha: from.active && to.active ? contributingOpacity : remainingOpacity,
      });
    }
    centers.forEach(({ x, y, active }) => {
      drawing.circle(x, y, radius);
      if (active) {
        drawing.fill({ color, alpha: contributingOpacity });
        drawing.stroke({ color, alpha: contributingOpacity, width: 4 });
      } else {
        drawing.stroke({ color, alpha: remainingOpacity, width: 4 });
      }
    });
    layer.addChild(drawing);
  });
}
