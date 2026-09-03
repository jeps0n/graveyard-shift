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
const RECEIPT_WIDTH = 400;
const RECEIPT_HEIGHT = 760;
const GAME_WIDTH = 1000;
const GAP = 20;
const GRID_COLUMN_WIDTH = 8;
export class DevReceipt {
  private readonly element: HTMLTextAreaElement;
  private readonly lines: string[] = [];
  private sequence = 0;
  constructor() {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.style.position = 'fixed';
      canvas.style.left = '50%';
      canvas.style.top = '50%';
      canvas.style.transform = 'translate(-50%, -50%)';
    }
    this.element = document.createElement('textarea');
    this.element.readOnly = true;
    Object.assign(this.element.style, {
      position: 'fixed',
      left: `calc(50% + ${GAME_WIDTH / 2 + GAP}px)`,
      top: '50%',
      transform: 'translateY(-50%)',
      width: `${RECEIPT_WIDTH}px`,
      height: `${RECEIPT_HEIGHT}px`,
      boxSizing: 'border-box',
      padding: '16px',
      margin: '0',
      background: '#15191f',
      border: '2px solid #444b55',
      borderRadius: '12px',
      outline: 'none',
      resize: 'none',
      overflowY: 'auto',
      overflowX: 'hidden',
      color: '#cccccc',
      fontFamily: 'monospace',
      fontSize: '12px',
      lineHeight: '16px',
      whiteSpace: 'pre',
      zIndex: '1000',
      userSelect: 'text',
      WebkitUserSelect: 'text',
    });
    this.element.setAttribute(
      'aria-label',
      'Dev receipt',
    );
    document.body.appendChild(this.element);
    this.render();
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
    multiplier: number,
    balance: number,
  ): void {
    this.event(
      'SPIN START',
      [
        `NUMBER           #${spinNumber}`,
        `BET              $${bet.toFixed(2)}`,
        `MULTIPLIER       ×${multiplier}`,
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
      `LINE             ${evaluation.payline}`,
      `PATH             ${path}`,
      `SYMBOLS          ${symbols}`,
      `TARGET           ${evaluation.targetSymbol
        ? evaluation.targetSymbol.toUpperCase()
        : 'NONE'
      }`,
      `MATCHED          ${evaluation.matchedCount}`,
      `RESULT           ${evaluation.result}`,
      `PAYOUT           $${evaluation.payout.toFixed(2)}`,
      `REASON           ${evaluation.reason}`,
    ];
    if (evaluation.blockingSymbol) {
      details.push(
        `BLOCKED BY       ${evaluation.blockingSymbol.toUpperCase()}`,
      );
    }
    this.event(
      `PAYLINE ${evaluation.payline}`,
      details,
    );
  }
  winResult(
    wins: WinResult[],
  ): void {
    this.event(
      'WIN RESULT',
      [
        `WIN LINES        ${wins.length}`,
      ],
    );
    if (wins.length === 0) {
      this.event('NO WIN');
      return;
    }
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
          `PAYOUT           $${win.amount.toFixed(2)}`,
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
    baseWin: number,
    multiplier: number,
    totalWin: number,
    balanceBeforePayout: number,
    balanceAfterPayout: number,
  ): void {
    this.event(
      'FINAL RESULT',
      [
        `BASE WIN        $${baseWin.toFixed(2)}`,
        `MULTIPLIER      ×${multiplier}`,
        `TOTAL WIN       $${totalWin.toFixed(2)}`,
        `BALANCE BEFORE  $${balanceBeforePayout.toFixed(2)}`,
        `BALANCE AFTER   $${balanceAfterPayout.toFixed(2)}`,
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
    multiplier: number,
  ): void {
    this.event(
      'MYSTERY PICK',
      [
        `CHOICE           ${choice}`,
        `REVEALED         ×${multiplier}`,
      ],
    );
  }
  nextSpin(
    multiplier: number,
  ): void {
    this.event(
      'NEXT SPIN',
      [
        `MULTIPLIER       ×${multiplier}`,
      ],
    );
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
        `      ${symbols.join('| ')}`,
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
        `      ${symbols.join('| ')}`,
      );
    }
    return rows;
  }
}