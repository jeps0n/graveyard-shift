import type { SymbolId } from '../game/types';
export const REEL_WEIGHTS: Record<SymbolId, number[]> = {
  coffee:  [190, 189, 188, 185, 185],
  burger:  [156, 154, 156, 155, 155],
  gas:     [133, 133, 133, 132, 133],
  chip:    [111, 111, 110, 110, 109],
  dice:    [96, 97, 97, 95, 95],
  zed:     [71, 72, 71, 72, 71],
  gary:    [64, 64, 64, 64, 63],
  barkley: [57, 57, 58, 57, 57],
  victor:  [51, 50, 50, 51, 51],
  marge:   [22, 24, 25, 29, 29],
  scatter: [49, 49, 48, 50, 52],
};
