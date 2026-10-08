import { describe, expect, it, vi } from 'vitest';
import { ReelView } from '../src/presentation/ReelView';

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
  it('clears old payline drawings', () => {
    const { v } = reel();
    v.clearWinningPaylines();
    expect(v.paylineLayer.removeChildren).toHaveBeenCalledOnce();
  });
});
