import { describe, expect, it, vi } from 'vitest';
import { ReelView } from '../src/presentation/ReelView';
import { Graphics } from 'pixi.js';

// Isolate the actual ReelView visibility methods from WebGL initialization.
function reel() {
  const v: any = Object.create(ReelView.prototype);
  const background = { visible: false };
  const coordinate = { visible: false };
  v.reelTiles = [[{ coordinate, visual: { getChildByLabel: vi.fn(() => background) } }]];
  v.paylineLayer = { visible: false, removeChildren: vi.fn() };
  v.devMode = false;
  v.coordinatesVisible = true;
  v.paylinesVisible = true;
  return { v, background, coordinate };
}

describe('ReelView diagnostic presentation contracts', () => {
  it('hides coordinates and paylines outside developer mode', () => {
    const { v, background, coordinate } = reel();
    v.setDevMode(false);
    expect(v.paylineLayer.visible).toBe(false);
    expect(coordinate.visible).toBe(false);
    expect(background.visible).toBe(false);
    expect(v.paylineLayer.removeChildren).toHaveBeenCalledOnce();
  });
  it('shows coordinate labels and paylines only when developer mode permits', () => {
    const { v, background, coordinate } = reel();
    v.setDevMode(true);
    expect(v.paylineLayer.visible).toBe(true);
    expect(coordinate.visible).toBe(true);
    expect(background.visible).toBe(true);
    v.setCoordinatesVisible(false);
    expect(coordinate.visible).toBe(false);
    expect(background.visible).toBe(false);
    v.setPaylinesVisible(false);
    expect(v.paylineLayer.visible).toBe(false);
  });
  it('does not expose developer overlays when mode is disabled even if flags are enabled', () => {
    const { v, coordinate } = reel();
    v.setCoordinatesVisible(true);
    v.setPaylinesVisible(true);
    expect(coordinate.visible).toBe(false);
    expect(v.paylineLayer.visible).toBe(false);
  });
});

describe('Winning payline graphics', () => {
  it('renders only winning paths with the locked line and circle treatments', () => {
    const { v } = reel();
    v.devMode = true;
    const drawings: Graphics[] = [];
    v.paylineLayer.addChild = vi.fn((drawing: Graphics) => drawings.push(drawing));
    const stroke = vi.spyOn(Graphics.prototype, 'stroke');
    const fill = vi.spyOn(Graphics.prototype, 'fill');
    try {
      v.displayWinningPaylines([{
        symbol: 'coffee', count: 3, payoutMultiplier: 2, payline: 1,
        positions: [{ reel: 0, row: 0 }, { reel: 1, row: 0 }, { reel: 2, row: 0 }],
      }]);
      expect(drawings).toHaveLength(1);
      const strokes = stroke.mock.calls.map(([style]) => style);
      expect(strokes.filter((style) => typeof style === 'object' && style.width === 6 && style.alpha === 0.8)).toHaveLength(2);
      expect(strokes.filter((style) => typeof style === 'object' && style.width === 4 && style.alpha === 0.4)).toHaveLength(4);
      expect(strokes.filter((style) => typeof style === 'object' && style.width === 4 && style.alpha === 0.8)).toHaveLength(3);
      expect(fill).toHaveBeenCalledTimes(3);
    } finally {
      stroke.mockRestore();
      fill.mockRestore();
    }
  });
});

describe('Payline rendering and independent diagnostic toggles', () => {
  const win = {
    symbol: 'coffee' as const, count: 3, payoutMultiplier: 2, payline: 1,
    positions: [{ reel: 0, row: 0 }, { reel: 1, row: 0 }, { reel: 2, row: 0 }],
  };

  it('never draws a losing payline or a terminal grid with zero wins', () => {
    const { v } = reel();
    v.devMode = true;
    v.paylineLayer.addChild = vi.fn();
    v.displayWinningPaylines([]);
    expect(v.paylineLayer.addChild).not.toHaveBeenCalled();
    v.displayWinningPaylines([win]);
    expect(v.paylineLayer.addChild).toHaveBeenCalledOnce();
    v.clearWinningPaylines();
    expect(v.paylineLayer.removeChildren).toHaveBeenCalledTimes(3);
  });

  it('terminates each segment at circle boundaries', () => {
    const { v } = reel();
    v.devMode = true;
    v.paylineLayer.addChild = vi.fn();
    const moveTo = vi.spyOn(Graphics.prototype, 'moveTo');
    const lineTo = vi.spyOn(Graphics.prototype, 'lineTo');
    const circle = vi.spyOn(Graphics.prototype, 'circle');
    try {
      v.displayWinningPaylines([win]);
      expect(circle).toHaveBeenCalledTimes(5);
      expect(moveTo).toHaveBeenCalledTimes(4);
      expect(lineTo).toHaveBeenCalledTimes(4);
      const firstCenter = circle.mock.calls[0];
      const secondCenter = circle.mock.calls[1];
      expect(moveTo.mock.calls[0][0]).toBeCloseTo(firstCenter[0] + 12);
      expect(moveTo.mock.calls[0][1]).toBeCloseTo(firstCenter[1]);
      expect(lineTo.mock.calls[0][0]).toBeCloseTo(secondCenter[0] - 12);
      expect(lineTo.mock.calls[0][1]).toBeCloseTo(secondCenter[1]);
    } finally {
      moveTo.mockRestore();
      lineTo.mockRestore();
      circle.mockRestore();
    }
  });

});
