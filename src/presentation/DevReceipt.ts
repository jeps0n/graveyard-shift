import type {
  ReelGrid,
  SymbolId,
  WinPosition,
  WinResult,
} from '../game/types';
import type {
  PaylineEvaluationTrace,
  RngDrawTrace,
} from '../math/GameMath';
const GRID_COLUMN_WIDTH = 8;
export class DevReceipt {
  private readonly element: HTMLTextAreaElement;
  private readonly lines: string[] = [];
  private sequence = 0;
  constructor(host?: HTMLElement) {
    this.element = document.createElement('textarea');
    this.element.readOnly = true;
    Object.assign(this.element.style, {
      position: host ? 'absolute' : 'fixed',
      inset: host ? '0' : 'auto',
      left: host ? '0' : '-9999px',
      top: host ? '0' : '-9999px',
      width: host ? '100%' : '1px',
      height: host ? '100%' : '1px',
      boxSizing: 'border-box',
      padding: '20px',
      margin: '0',
      background: '#15191f',
      border: host ? '2px solid #444b55' : '0',
      borderRadius: '0',
      outline: 'none',
      resize: 'none',
      overflowY: 'auto',
      overflowX: 'hidden',
      color: '#cccccc',
      fontFamily: 'monospace',
      fontSize: '12px',
      lineHeight: '17px',
      whiteSpace: 'pre',
      zIndex: '1',
      userSelect: 'text',
      WebkitUserSelect: 'text',
    });
    this.element.setAttribute(
      'aria-label',
      'Dev receipt',
    );
    (host ?? document.body).appendChild(this.element);
    this.render();
  }
  setVisible(visible: boolean): void {
    this.element.style.display = visible ? 'block' : 'none';
  }

  clear(): void {
    this.lines.length = 0;
    this.sequence = 0;
    this.render();
  }
  blur(): void {
    this.element.blur();
  }
  event(
    title: string,
    details: string[] = [],
  ): void {
    const number = String(
      ++this.sequence,
    ).padStart(3, '0');
    this.lines.push(
      `[${number}] ${title}`,
      ...details.map(
        (detail) => `      ${detail}`,
      ),
      '',
    );
    this.render();
  }
  spinStart(
    spinNumber: number,
    bet: number,
    featureMultiplier: number,
    balance: number,
  ): void {
    this.event(
      'SPIN START',
      [
        `NUMBER           #${spinNumber}`,
        `BET              $${this.formatMoney(bet)}`,
        `FEATURE MULTIPLIER ×${featureMultiplier}`,
        `BALANCE BEFORE   $${balance.toFixed(2)}`,
      ],
    );
  }
  primaryGrid(
    grid: ReelGrid,
  ): void {
    this.event(
      'PRIMARY GRID',
      this.formatGridLines(grid),
    );
  }
  rngDraws(
    draws: RngDrawTrace[],
  ): void {
    for (const draw of draws) {
      this.event(
        'RNG DRAW',
        [
          `REEL             ${draw.reel + 1}`,
          `ROW              ${draw.row + 1}`,
          `VALUE            ${draw.randomValue.toFixed(9)}`,
          `STRIP LENGTH     ${draw.stripLength}`,
          `INDEX            ${draw.index}`,
          `SYMBOL           ${draw.symbol.toUpperCase()}`,
        ],
      );
    }
  }
  evaluation(
    evaluations: PaylineEvaluationTrace[],
  ): void {
    this.event(
      'EVALUATION START',
      [
        `PAYLINES         ${evaluations.length}`,
      ],
    );
    for (const evaluation of evaluations) {
      this.paylineEvaluation(evaluation);
    }
    this.event(
      'EVALUATION COMPLETE',
      [
        `WIN LINES        ${evaluations.filter(
          ({ result }) => result === 'WIN',
        ).length
        }`,
      ],
    );
  }
  private paylineEvaluation(
    evaluation: PaylineEvaluationTrace,
  ): void {
    const symbols = evaluation.symbols
      .map(
        (symbol) => symbol.toUpperCase(),
      )
      .join(' | ');
    const path = evaluation.path
      .map(
        ({ reel, row }) =>
          `(${reel + 1},${row + 1})`,
      )
      .join(' → ');
    const details = [
      `LINE       ${evaluation.payline}`,
      `PATH       ${path}`,
      `SYMBOLS    ${symbols}`,
      `TARGET     ${evaluation.targetSymbol
        ? evaluation.targetSymbol.toUpperCase()
        : 'NONE'
      }`,
      `MATCHED    ${evaluation.matchedCount}`,
      `RESULT     ${evaluation.result}`,
    ];
    if (evaluation.result === 'WIN') {
      details.push(
        `PAYTABLE MULTIPLIER ×${evaluation.payoutMultiplier.toFixed(2)}`,
      );
    }
    details.push(
      `REASON     ${evaluation.reason}`,
    );
    if (evaluation.blockingSymbol) {
      details.push(
        `BLOCKED BY ${evaluation.blockingSymbol.toUpperCase()}`,
      );
    }
    this.event(
      `PAYLINE ${evaluation.payline}`,
      details,
    );
  }
  winResult(
    wins: WinResult[],
    bet: number,
  ): void {
    for (
      let index = 0;
      index < wins.length;
      index++
    ) {
      const win = wins[index];
      this.event(
        `WIN ${index + 1}`,
        [
          `LINE             ${win.payline}`,
          `SYMBOL           ${win.symbol.toUpperCase()}`,
          `COUNT            ${win.count}`,
          `PAYTABLE MULTIPLIER ×${win.payoutMultiplier.toFixed(2)}`,
          `BET              $${this.formatMoney(bet)}`,
          `BASE LINE WIN    $${this.formatMoney(win.payoutMultiplier * bet)}`,
          `PATH             ${this.formatPositions(win.positions)}`,
        ],
      );
    }
  }
  cascadeStart(index: number): void {
    this.event('CASCADE', [`CASCADE ${index}`]);
  }
  winningPositionsRemoved(
    removedSymbols: Array<{
      position: WinPosition;
      symbol: SymbolId;
    }>,
  ): void {
    this.event('WINNING POSITIONS REMOVED', [
      ...removedSymbols.map(
        ({ position, symbol }) =>
          `${this.formatPosition(position)}    ${symbol}`,
      ),
    ]);
  }
  gridAfterCollapse(grid: Array<Array<SymbolId | null>>): void {
    this.event('GRID AFTER COLLAPSE', this.formatNullableGridLines(grid));
  }
  refill(draws: RngDrawTrace[]): void {
    this.event('REFILL', [
      `SYMBOLS REFILLED    ${draws.length}`,
    ]);
  }
  cascadeGrid(grid: ReelGrid): void {
    this.event('CASCADE GRID', this.formatGridLines(grid));
  }
  finalGrid(
    grid: ReelGrid,
  ): void {
    this.event(
      'FINAL GRID',
      this.formatGridLines(grid),
    );
  }
  finalResult(
    basePayoutMultiplier: number,
    bet: number,
    featureMultiplier: number,
    totalWinAmount: number,
    // balanceBeforePayout: number,
    // balanceAfterPayout: number,
  ): void {
    this.event(
      'FINAL RESULT',
      [
        `BASE PAYOUT MULTIPLIER ${basePayoutMultiplier.toFixed(2)}×`,
        `BET                    $${this.formatMoney(bet)}`,
        `BASE WIN               $${this.formatMoney(basePayoutMultiplier * bet)}`,
        `FEATURE MULTIPLIER     ×${featureMultiplier}`,
        `TOTAL WIN              $${this.formatMoney(totalWinAmount)}`,
        // `BALANCE BEFORE  $${balanceBeforePayout.toFixed(2)}`,
        // `BALANCE AFTER   $${balanceAfterPayout.toFixed(2)}`,
      ],
    );
  }
  afterMidnight(
    scatterCount: number,
  ): void {
    this.event(
      'AFTER MIDNIGHT',
      [
        `SCATTERS DETECTED ${scatterCount}`,
        'FEATURE ENTERED',
      ],
    );
  }
  pick(
    choice: string,
    featureMultiplier: number,
  ): void {
    this.event(
      'MYSTERY PICK',
      [
        `CHOICE           ${choice}`,
        `REVEALED         ×${featureMultiplier}`,
      ],
    );
  }
  nextSpin(
    featureMultiplier: number,
  ): void {
    this.event(
      'NEXT SPIN',
      [
        `FEATURE MULTIPLIER ×${featureMultiplier}`,
      ],
    );
  }
  private formatMoney(amount: number): string {
    return amount.toFixed(2);
  }

  private render(): void {
    this.element.value =
      this.lines.join('\n');
    this.element.scrollTop =
      this.element.scrollHeight;
  }
  private formatPosition(
    position: WinPosition,
  ): string {
    return `(${position.reel + 1},${position.row + 1})`;
  }
  private formatPositions(
    positions: WinPosition[],
  ): string {
    return positions
      .map(
        (position) =>
          this.formatPosition(position),
      )
      .join(' → ');
  }
  private formatGridLines(
    grid: ReelGrid,
  ): string[] {
    const rows: string[] = [];
    for (let row = 0; row < 3; row++) {
      const symbols: string[] = [];
      for (let reel = 0; reel < 5; reel++) {
        symbols.push(
          grid[reel][row]
            .toUpperCase()
            .padEnd(GRID_COLUMN_WIDTH),
        );
      }
      rows.push(
        symbols.join('| '),
      );
    }
    return rows;
  }
  private formatNullableGridLines(
    grid: Array<Array<SymbolId | null>>,
  ): string[] {
    const rows: string[] = [];
    for (let row = 0; row < 3; row++) {
      const symbols: string[] = [];
      for (let reel = 0; reel < 5; reel++) {
        const symbol = grid[reel][row];
        symbols.push(
          (symbol ?? 'EMPTY')
            .toUpperCase()
            .padEnd(GRID_COLUMN_WIDTH),
        );
      }
      rows.push(
        symbols.join('| '),
      );
    }
    return rows;
  }
}