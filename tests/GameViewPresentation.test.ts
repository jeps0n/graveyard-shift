import { describe, expect, it, vi } from 'vitest';
import { GAME_HEIGHT, GAME_WIDTH, GameView } from '../src/presentation/GameView';

// Exercise the real GameView methods without constructing GPU textures or a canvas.
// The simple doubles represent Pixi display objects, not a replacement GameView.
type Button = { alpha: number; eventMode: string; cursor: string; clear: ReturnType<typeof vi.fn>; roundRect: ReturnType<typeof vi.fn>; fill: ReturnType<typeof vi.fn>; stroke: ReturnType<typeof vi.fn> };
function button(): Button {
  const b = { alpha: 1, eventMode: 'static', cursor: 'pointer', clear: vi.fn(), roundRect: vi.fn(), fill: vi.fn(), stroke: vi.fn() };
  b.clear.mockReturnValue(b);
  b.roundRect.mockReturnValue(b);
  b.fill.mockReturnValue(b);
  b.stroke.mockReturnValue(b);
  return b;
}
function view() {
  const v: any = Object.create(GameView.prototype);
  for (const name of ['spinButton', 'betDownButton', 'betUpButton', 'clearBetButton', 'maxBetButton', 'bet1Button', 'bet5Button', 'bet25Button']) v[name] = button();
  for (const name of ['spinText', 'balanceLabel', 'wagerLabel', 'winLabel', 'balanceText', 'betText', 'winText']) v[name] = { text: '', alpha: 1, style: { fontSize: 26 } };
  v.spinBusy = false;
  v.spinEnabledRequested = false;
  return v;
}

describe('GameView presentation contracts', () => {
  it('keeps SPIN noninteractive until explicitly enabled', () => {
    const v = view();
    v.setSpinEnabled(false);
    expect(v.spinButton.eventMode).toBe('none');
    expect(v.spinButton.alpha).toBe(0.12);
    v.setSpinEnabled(true);
    expect(v.spinButton.eventMode).toBe('static');
    expect(v.spinButton.cursor).toBe('pointer');
  });
  it('locks SPIN during animation and restores its label and interaction afterwards', () => {
    const v = view();
    v.setSpinEnabled(true);
    v.setSpinBusy(true);
    expect(v.spinButton.eventMode).toBe('none');
    expect(v.spinButton.alpha).toBe(0.48);
    expect(v.spinText.text).toBe('SPINNING…');
    v.setSpinBusy(false);
    expect(v.spinText.text).toBe('SPIN');
    expect(v.spinButton.eventMode).toBe('static');
  });
  it('does not unlock SPIN when busy ends if the wager is disabled', () => {
    const v = view();
    v.setSpinEnabled(false);
    v.setSpinBusy(true);
    v.setSpinBusy(false);
    expect(v.spinButton.eventMode).toBe('none');
  });
  it('disables wager controls with no available balance', () => {
    const v = view();
    v.updateBetControls(0, 0, 1);
    for (const name of ['bet1Button', 'bet5Button', 'bet25Button', 'betUpButton', 'maxBetButton', 'clearBetButton', 'betDownButton']) {
      expect(v[name].eventMode, name).toBe('none');
    }
    expect(v.spinButton.eventMode).toBe('none');
  });
  it('disables increase and MAX at the maximum wager, but allows reducing it', () => {
    const v = view();
    v.updateBetControls(100, 100, 25);
    expect(v.betUpButton.eventMode).toBe('none');
    expect(v.maxBetButton.eventMode).toBe('none');
    expect(v.betDownButton.eventMode).toBe('static');
    expect(v.clearBetButton.eventMode).toBe('static');
  });
  it('enables wager entry but not SPIN when wager is zero', () => {
    const v = view();
    v.updateBetControls(100, 0, 5);
    expect(v.betUpButton.eventMode).toBe('static');
    expect(v.clearBetButton.eventMode).toBe('none');
    expect(v.spinButton.eventMode).toBe('none');
  });
  it('renders live HUD amounts and restores labels after replay', () => {
    const v = view();
    v.updateReplayHud(90, 5, 25);
    expect(v.balanceLabel.text).toBe('BALANCE (REPLAY)');
    expect(v.winText.text).toBe('$25.00');
    v.updateHud(110, 10, 20, 5);
    expect([v.balanceLabel.text, v.wagerLabel.text, v.winLabel.text]).toEqual(['BALANCE', 'WAGER', 'WIN']);
    expect([v.balanceText.text, v.betText.text, v.winText.text]).toEqual(['$110.00', '$10.00', '$20.00']);
    expect(v.spinButton.eventMode).toBe('static');
  });
  it('brings the bonus overlay to the top and returns its selected multiplier', async () => {
    const v = view();
    const bonus = { show: vi.fn(async () => 5) };
    v.afterMidnightView = bonus;
    v.addChild = vi.fn();
    const resolve = vi.fn(() => 5);
    await expect(v.showAfterMidnight(resolve)).resolves.toBe(5);
    expect(v.addChild).toHaveBeenCalledWith(bonus);
    expect(bonus.show).toHaveBeenCalledWith(resolve);
  });
  it('forwards spin and stop animation to the reel view without changing outcomes', async () => {
    const v = view();
    const grid = [['coffee'], ['burger']] as any;
    v.reelView = { animateSpin: vi.fn(async () => {}), animateReelStops: vi.fn(async () => {}) };
    await v.animateSpin();
    await v.animateReelStops(grid);
    expect(v.reelView.animateSpin).toHaveBeenCalledOnce();
    expect(v.reelView.animateReelStops).toHaveBeenCalledWith(grid);
  });
  it('passes cascade removals, wins, and result grids to ReelView unchanged', async () => {
    const v = view();
    const grid = [['coffee', 'gas', 'chip']] as any;
    const removed = [{ reel: 0, row: 1 }];
    const wins = [{ payline: 1 }] as any;
    v.reelView = {
      animateCascadeStep: vi.fn(async () => {}),
      animateWinningSymbols: vi.fn(async () => {}),
      displayResult: vi.fn(),
      displayWinningPaylines: vi.fn(),
      clearWinningPaylines: vi.fn(),
    };
    await v.animateCascadeStep(removed, grid);
    await v.animateWinningSymbols(wins);
    v.displayResult(grid);
    v.displayWinningPaylines(wins);
    v.clearWinningPaylines();
    expect(v.reelView.animateCascadeStep).toHaveBeenCalledWith(removed, grid);
    expect(v.reelView.animateWinningSymbols).toHaveBeenCalledWith(wins);
    expect(v.reelView.displayResult).toHaveBeenCalledWith(grid);
    expect(v.reelView.displayWinningPaylines).toHaveBeenCalledWith(wins);
    expect(v.reelView.clearWinningPaylines).toHaveBeenCalledOnce();
  });



});
