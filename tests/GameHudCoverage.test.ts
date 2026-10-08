import { beforeEach, describe, expect, it, vi } from 'vitest';

const animation = vi.hoisted(() => {
  const timelines: Array<{ options: any; steps: Array<{ target: any; vars: any }> }> = [];
  const timeline = vi.fn((options: any = {}) => {
    const record = { options, steps: [] as Array<{ target: any; vars: any }> };
    timelines.push(record);
    const chain = { to(target: any, vars: any) { record.steps.push({ target, vars }); return chain; } };
    return chain;
  });
  return { timelines, timeline, killTweensOf: vi.fn() };
});
vi.mock('gsap', () => ({ gsap: animation }));
vi.mock('pixi.js', () => ({
  Container: class {},
  Text: class {
    text: string;
    style: any;
    x = 0;
    y = 0;
    anchor = { set: vi.fn() };
    scale = { x: 1, y: 1, set(x: number, y = x) { this.x = x; this.y = y; } };
    constructor({ text, style }: any) { this.text = text; this.style = style; }
  },
}));
import { createGameHud, animateWagerBeat, animateBalanceDeductionBeat,
  animateBalanceCreditBeat, animateWinCreditBeat, animatePayoutBeat,
  updateReplayHud, updateHud, formatMoney } from '../src/presentation/GameHud';

function host() {
  const children: any[] = [];
  const display = createGameHud({ addChild: (child: any) => children.push(child) } as any);
  return { ...display, children, updateBetControls: vi.fn() };
}
function completeLastTimeline() {
  const record = animation.timelines.at(-1)!;
  for (const { target, vars } of record.steps) {
    if ('value' in vars) target.value = vars.value;
    vars.onUpdate?.();
    vars.onComplete?.();
  }
  record.options.onComplete?.();
}
beforeEach(() => { animation.timelines.length = 0; animation.timeline.mockClear(); animation.killTweensOf.mockClear(); });

describe('HUD presentation and animated balances', () => {
  it('formats values and keeps replay labels distinct from live labels', () => {
    const display = host();
    expect(formatMoney(1234.5)).toBe('$1,234.50');
    updateReplayHud(display, 150, 5, 25);
    expect(display.balanceLabel.text).toBe('BALANCE (REPLAY)');
    expect(display.winText.text).toBe('$25.00');
    updateHud(display, 175, 10, 20, 5);
    expect(display.balanceLabel.text).toBe('BALANCE');
    expect(display.winText.text).toBe('$20.00');
    expect(display.updateBetControls).toHaveBeenCalledWith(175, 10, 5);
  });
  it('finishes a wager deduction with the exact balance and neutral styling', async () => {
    const display = host();
    const done = animateBalanceDeductionBeat(display, 100, 90);
    expect(display.balanceText.style.fill).toBe(0x63dbe8);
    completeLastTimeline();
    await done;
    expect(display.balanceText.text).toBe('$90.00');
    expect(display.balanceText.style.fill).toBe(0xffffff);
  });
  it('completes payout choreography with the recorded win and final balance', async () => {
    const display = host();
    const done = animatePayoutBeat(display, 90, 115, 25);
    completeLastTimeline();
    await done;
    expect(display.winText.text).toBe('$25.00');
    expect(display.balanceText.text).toBe('$115.00');
    expect(display.winText.style.fill).toBe(0xffffff);
    expect(display.balanceText.style.fill).toBe(0xffffff);
  });
});
