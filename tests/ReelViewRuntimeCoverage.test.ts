import { afterEach, describe, expect, it, vi } from 'vitest';
import { Container, Graphics, Texture } from 'pixi.js';
import { gsap } from 'gsap';
import { ReelView } from '../src/presentation/ReelView';
import type { ReelGrid, WinResult } from '../src/game/types';

const GRID: ReelGrid = [
  ['coffee', 'burger', 'gas'],
  ['coffee', 'chip', 'dice'],
  ['coffee', 'zed', 'gary'],
  ['barkley', 'victor', 'marge'],
  ['gas', 'scatter', 'chip'],
];
const WIN: WinResult = {
  payline: 1, symbol: 'coffee', count: 3, payoutMultiplier: 2,
  positions: [{ reel: 0, row: 0 }, { reel: 1, row: 0 }, { reel: 2, row: 0 }],
};

function immediateAnimations() {
  const to = vi.spyOn(gsap, 'to').mockImplementation(((target: object, vars: any) => {
    if (vars.x !== undefined && typeof target === 'object' && target !== null) {
      Object.assign(target, { x: vars.x, y: vars.y });
    }
    if (vars.y !== undefined && typeof target === 'object' && target !== null) {
      Object.assign(target, { y: vars.y });
    }
    vars.onComplete?.();
    return {} as any;
  }) as typeof gsap.to);
  const kill = vi.spyOn(gsap, 'killTweensOf').mockImplementation(() => undefined as any);
  return { to, kill };
}

function createReels() {
  // Asset loading belongs to the renderer; these tests exercise the real
  // Pixi scene graph and presentation methods with a shared in-memory texture.
  vi.spyOn(Texture, 'from').mockReturnValue(Texture.EMPTY);
  return new ReelView();
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('ReelView scene graph and reel motion', () => {


  it('starts staggered continuous reels and clears previous paylines', async () => {
    const view: any = createReels();
    const { to } = immediateAnimations();
    vi.useFakeTimers();
    const spin = view.animateSpin();
    expect(to).toHaveBeenCalledTimes(5);
    expect(to.mock.calls.map(([, vars]) => (vars as any).delay))
      .toEqual([0, 0.08, 0.16, 0.24, 0.32]);
    await vi.runAllTimersAsync();
    await spin;
  });

  it('stops reels sequentially, reveals recorded symbols, and settles scale', async () => {
    const view: any = createReels();
    const { to } = immediateAnimations();
    await view.animateReelStops(GRID);
    expect(to).toHaveBeenCalledTimes(10);
    expect(view.reelTiles[0][0].symbol.texture).toBe(Texture.EMPTY);
    expect(view.reelSpinners.every((spinner: Container) => spinner.y === 0)).toBe(true);
  });

  it('cascades complete tiles, refills vacancies, and updates grid coordinates', async () => {
    const view: any = createReels();
    view.displayResult(GRID);
    const survivor = view.reelTiles[0][1];
    const removed = view.reelTiles[0][0];
    immediateAnimations();
    const next: ReelGrid = GRID.map(reel => [...reel]);
    next[0] = ['dice', 'burger', 'gas'];
    await view.animateCascadeStep([{ reel: 0, row: 0 }], next);
    expect(view.reelTiles[0][1]).toBe(survivor);
    expect(view.reelTiles[0][0]).not.toBe(removed);
    expect(view.reelTiles[0][1].coordinate.text).toBe('(1,2)');
    expect(view.displayedGrid).toEqual(next);
    expect(view.winningCells.size).toBe(15);
  });


  it('temporarily releases masks for winning symbols and restores them afterward', async () => {
    const view: any = createReels();
    view.displayResult(GRID);
    immediateAnimations();
    vi.useFakeTimers();
    const beat = view.animateWinningSymbols([WIN]);
    await vi.runAllTimersAsync();
    await beat;
    expect(view.reelLayers.every((layer: Container, i: number) => layer.mask === view.reelMasks[i]))
      .toBe(true);
    expect(view.reelMasks.every((mask: Graphics) => mask.visible)).toBe(true);
    expect(view.reelTiles.flat().every((tile: any) => tile.container.alpha === 1)).toBe(true);
  });



});
