import { afterEach, describe, expect, it, vi } from 'vitest';
import { Graphics, Texture } from 'pixi.js';
import { gsap } from 'gsap';
import { GameView } from '../src/presentation/GameView';
import type { ReelGrid } from '../src/game/types';

const GRID: ReelGrid = [
  ['coffee', 'burger', 'gas'],
  ['chip', 'dice', 'zed'],
  ['gary', 'barkley', 'victor'],
  ['marge', 'coffee', 'burger'],
  ['gas', 'scatter', 'chip'],
];

function createView(): GameView {
  vi.spyOn(Texture, 'from').mockReturnValue(Texture.EMPTY);
  return new GameView();
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GameView real scene construction and integration', () => {




  it('updates and clears the actual one-spin multiplier indicator', () => {
    const view: any = createView();
    const timeline = { to: vi.fn().mockReturnThis() };
    const animate = vi.spyOn(gsap, 'timeline').mockReturnValue(timeline as any);
    vi.spyOn(gsap, 'killTweensOf').mockImplementation(() => undefined as any);
    view.setNextSpinMultiplier(5);
    expect(view.nextSpinMultiplierText.visible).toBe(true);
    expect(view.nextSpinMultiplierRecess.visible).toBe(true);
    expect(view.nextSpinMultiplierText.text).toContain('×5 ACTIVE');
    expect(animate).toHaveBeenCalledOnce();
    expect(timeline.to).toHaveBeenCalledTimes(2);
    view.setNextSpinMultiplier(1);
    expect(view.nextSpinMultiplierText.visible).toBe(false);
    expect(view.nextSpinMultiplierRecess.visible).toBe(false);
    expect(view.nextSpinMultiplierText.text).toBe('');
  });


  it('forwards snapshot selection without mutating the selected grid', () => {
    const view: any = createView();
    const selected = vi.fn();
    view.setDebugSnapshotSelectedHandler(selected);
    const snapshot = { grid: GRID, wins: [], label: 'Final Grid' };
    // Exercise the same callback registered by GameView's constructor.
    view.debugInspector.onSelect(snapshot);
    expect(view.reelView.displayedGrid).toEqual(GRID);
    expect(view.reelView.paylineLayer.children).toHaveLength(0);
    expect(selected).toHaveBeenCalledWith(snapshot);
  });
});
