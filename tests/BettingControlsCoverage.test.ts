import { describe, expect, it, vi } from 'vitest';
import { updateBetControls, setSpinEnabled,
  setSpinBusy, applySpinControlState } from '../src/presentation/BettingControls';

function button() {
  const graphics: any = {
    alpha: 1, eventMode: 'static', cursor: 'pointer',
    clear: vi.fn(), roundRect: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
  };
  for (const method of ['clear', 'roundRect', 'fill', 'stroke']) graphics[method].mockReturnValue(graphics);
  return graphics;
}
function host() {
  const buttons = {
    spinButton: button(), betDownButton: button(), clearBetButton: button(),
    betUpButton: button(), maxBetButton: button(), bet1Button: button(),
    bet5Button: button(), bet25Button: button(),
  };
  const h: any = {
    ...buttons, spinText: { text: 'SPIN', alpha: 1, style: { fontSize: 26 } },
    spinEnabledRequested: false, spinBusy: false,
    applySpinControlState() { applySpinControlState(h); },
    setSpinEnabled(enabled: boolean) { setSpinEnabled(h, enabled); },
  };
  return h;
}

describe('Betting controls boundaries and spin locking', () => {
  it.each([1, 5, 25] as const)('marks the %i increment as selected', (increment) => {
    const h = host();
    updateBetControls(h, 100, 10, increment);
    const selected = increment === 1 ? h.bet1Button : increment === 5 ? h.bet5Button : h.bet25Button;
    expect(selected.stroke).toHaveBeenCalledWith(expect.objectContaining({ width: 3 }));
    expect(h.spinButton.eventMode).toBe('static');
  });
  it('disables all wager actions when balance is zero', () => {
    const h = host();
    updateBetControls(h, 0, 0, 1);
    for (const name of ['bet1Button', 'bet5Button', 'bet25Button', 'betUpButton', 'maxBetButton'])
      expect(h[name].eventMode).toBe('none');
    expect(h.spinButton.eventMode).toBe('none');
  });
  it('enforces the maximum wager and permits lowering or clearing it', () => {
    const h = host();
    updateBetControls(h, 100, 100, 25);
    expect(h.betUpButton.eventMode).toBe('none');
    expect(h.maxBetButton.eventMode).toBe('none');
    expect(h.betDownButton.eventMode).toBe('static');
    expect(h.clearBetButton.eventMode).toBe('static');
  });
  it('never unlocks spin while busy even if the wager is valid', () => {
    const h = host();
    setSpinEnabled(h, true);
    expect(h.spinButton.eventMode).toBe('static');
    setSpinBusy(h, true);
    expect(h.spinButton.eventMode).toBe('none');
    expect(h.spinText.text).toBe('SPINNING…');
    setSpinEnabled(h, false);
    setSpinBusy(h, false);
    expect(h.spinButton.eventMode).toBe('none');
    expect(h.spinText.text).toBe('SPIN');
  });

});
