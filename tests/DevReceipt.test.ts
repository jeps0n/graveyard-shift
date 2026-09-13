import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WinResult } from '../src/game/types';
import type { PaylineEvaluationTrace } from '../src/math/GameMath';
import { DevReceipt } from '../src/dev/DevReceipt';
class FakeTextArea {
  readOnly = false;
  style: Record<string, unknown> = {};
  value = '';
  scrollTop = 0;
  scrollHeight = 0;
  blur = vi.fn();
  setAttribute = vi.fn();
}
let textarea: FakeTextArea;
beforeEach(() => {
  textarea = new FakeTextArea();
  vi.stubGlobal('document', {
    createElement: vi.fn(() => textarea),
    body: { appendChild: vi.fn() },
  });
});
function output(): string {
  return textarea.value;
}
function barkleyWin(): WinResult {
  return {
    symbol: 'barkley',
    count: 3,
    payoutMultiplier: 8,
    payline: 2,
    positions: [
      { reel: 0, row: 1 },
      { reel: 1, row: 1 },
      { reel: 2, row: 1 },
    ],
  };
}
describe('DevReceipt contract - wager-aware payout reporting', () => {
  it('labels a payline value as a multiplier rather than currency', () => {
    const receipt = new DevReceipt();
    const trace: PaylineEvaluationTrace = {
      payline: 2,
      path: [
        { reel: 0, row: 1 },
        { reel: 1, row: 1 },
        { reel: 2, row: 1 },
        { reel: 3, row: 1 },
        { reel: 4, row: 1 },
      ],
      symbols: ['marge', 'barkley', 'barkley', 'chip', 'zed'],
      targetSymbol: 'barkley',
      matchedCount: 3,
      result: 'WIN',
      payoutMultiplier: 8,
      blockingSymbol: 'chip',
      reason: 'Best-pay Wild evaluation selected 3 BARKLEY for ×8.',
    };
    receipt.evaluation([trace]);
    expect(output()).toContain('PAYTABLE MULTIPLIER ×8.00');
    expect(output()).not.toContain('PAYOUT     $8.00');
  });
  it('reports base line win from paytable multiplier times the current total bet', () => {
    const receipt = new DevReceipt();
    receipt.winResult([barkleyWin()], 5);
    expect(output()).toContain('PAYTABLE MULTIPLIER ×8.00');
    expect(output()).toContain('BET              $5.00');
    expect(output()).toContain('BASE LINE WIN    $40.00');
  });
  it('changes the reported base line win when the total bet changes', () => {
    const receipt = new DevReceipt();
    receipt.winResult([barkleyWin()], 25);
    expect(output()).toContain('BET              $25.00');
    expect(output()).toContain('BASE LINE WIN    $200.00');
  });
  it('separates base win from the feature-adjusted total win', () => {
    const receipt = new DevReceipt();
    receipt.finalResult(16, 5, 5, 400);
    expect(output()).toContain('BASE PAYOUT MULTIPLIER 16.00×');
    expect(output()).toContain('BET                    $5.00');
    expect(output()).toContain('BASE WIN               $80.00');
    expect(output()).toContain('FEATURE MULTIPLIER     ×5');
    expect(output()).toContain('TOTAL WIN              $400.00');
  });
});

describe('DevReceipt contract - diagnostic lifecycle', () => {
  it('renders the spin, RNG, cascade, feature, and utility receipt paths', () => {
    const host = { appendChild: vi.fn() };
    const receipt = new DevReceipt(host as never);
    const grid = [
      ['coffee', 'burger', 'gas'],
      ['burger', 'gas', 'chip'],
      ['gas', 'chip', 'dice'],
      ['chip', 'dice', 'gary'],
      ['dice', 'gary', 'zed'],
    ] as const;
    const draw = { reel: 0, row: 0, randomValue: 0.25, stripLength: 10, index: 2, symbol: 'coffee' as const };

    receipt.setVisible(false);
    receipt.setVisible(true);
    receipt.spinStart(7, 5, 2, 100);
    receipt.primaryGrid(grid as never);
    receipt.rngDraws([draw]);
    receipt.cascadeStart(1);
    receipt.winningPositionsRemoved([{ position: { reel: 0, row: 0 }, symbol: 'coffee' }]);
    receipt.gridAfterCollapse(grid.map((reel) => [...reel]) as never);
    receipt.refill([draw]);
    receipt.cascadeGrid(grid as never);
    receipt.finalGrid(grid as never);
    receipt.afterMidnight(3);
    receipt.pick('GAS CAN', 5);
    receipt.nextSpin(5);
    receipt.blur();

    expect(host.appendChild).toHaveBeenCalledWith(textarea);
    expect(textarea.blur).toHaveBeenCalledTimes(1);
    expect(output()).toContain('SPIN START');
    expect(output()).toContain('RNG DRAW');
    expect(output()).toContain('WINNING POSITIONS REMOVED');
    expect(output()).toContain('GRID AFTER COLLAPSE');
    expect(output()).toContain('AFTER MIDNIGHT');
    expect(output()).toContain('MYSTERY PICK');
    expect(output()).toContain('NEXT SPIN');

    receipt.clear();
    expect(output()).toBe('');
  });
});
