import { DEV_PAYLINE_COLORS } from '../presentation/DevPaylineColors';
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
  private readonly coloredElement: HTMLPreElement | null;
  private readonly lines: string[] = [];
  private readonly renderedLines: HTMLElement[] = [];
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
      background: '#30383d',
      border: host ? '2px solid #515c62' : '0',
      borderRadius: '0',
      outline: 'none',
      resize: 'none',
      overflowY: 'auto',
      overflowX: 'hidden',
      color: '#b5bdb7',
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
    // Preserve the plain-text API; render selectable, styled lines when hosted.
    this.coloredElement = host && typeof HTMLElement !== 'undefined' && host instanceof HTMLElement
      ? document.createElement('pre')
      : null;
    if (this.coloredElement) {
      Object.assign(this.coloredElement.style, {
        position: 'absolute', inset: '0', boxSizing: 'border-box', margin: '0',
        padding: '20px', background: '#30383d', border: '2px solid #515c62',
        color: '#b5bdb7', fontFamily: 'monospace', fontSize: '12px',
        lineHeight: '17px', whiteSpace: 'pre', overflow: 'auto',
        userSelect: 'text', overflowWrap: 'normal',
      });
      this.coloredElement.setAttribute('aria-label', 'Dev receipt');
      (host ?? document.body).appendChild(this.coloredElement);
      this.element.style.display = 'none';
    }
    this.render();
  }
  setVisible(visible: boolean): void {
    this.element.style.display = visible && !this.coloredElement ? 'block' : 'none';
    if (this.coloredElement) this.coloredElement.style.display = visible ? 'block' : 'none';
  }
  clear(): void {
    this.lines.length = 0;
    this.sequence = 0;
    this.render();
    this.scrollToTop();
  }
  blur(): void {
    (this.coloredElement ?? this.element).blur();
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
      'EVALUATION COMPLETE',
      [
        `WIN LINES        ${evaluations.filter(
          ({ result }) => result === 'WIN',
        ).length
        }`,
      ],
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
  ): void {
    this.event(
      'FINAL RESULT',
      [
        `BASE PAYOUT MULTIPLIER ${basePayoutMultiplier.toFixed(2)}×`,
        `BET                    $${this.formatMoney(bet)}`,
        `BASE WIN               $${this.formatMoney(basePayoutMultiplier * bet)}`,
        `FEATURE MULTIPLIER     ×${featureMultiplier}`,
        `TOTAL WIN              $${this.formatMoney(totalWinAmount)}`,
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
  /** Reset the visible receipt to the first event, without moving the page. */
  scrollToTop(): void {
    (this.coloredElement ?? this.element).scrollTop = 0;
  }

  /** Show the final result and balance without moving the browser page. */
  scrollToBottom(): void {
    const viewport = this.coloredElement ?? this.element;
    viewport.scrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
  }

  /** Show the chosen historical grid and briefly identify its section. */
  scrollToGrid(section: 'PRE-SPIN GRID' | 'PRIMARY GRID' | 'CASCADE GRID' | 'FINAL GRID', cascadeIndex = 0): void {
    const matches = this.lines.flatMap((line, index) =>
      /^\[\d+\] /.test(line) && line.endsWith(` ${section}`) ? [index] : [],
    );
    const lineIndex = matches[section === 'CASCADE GRID' ? cascadeIndex : 0];
    if (lineIndex === undefined) return;

    const viewport = this.coloredElement ?? this.element;
    const header = this.renderedLines[lineIndex];
    // Use the rendered position when available: section spacing changes row offsets.
    // The plain-text fallback retains the fixed 17px line height.
    const target = header?.offsetTop ?? lineIndex * 17;
    const maximum = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
    viewport.scrollTop = viewport.scrollHeight > 0 ? Math.min(target, maximum) : target;
    // Animate the content-sized grid wrapper, not four full-width rows.
    const highlight = header?.parentElement;
    if (!highlight?.animate || !highlight.classList.contains('receipt-grid')) return;
    highlight.getAnimations().forEach((animation) => animation.cancel());
    highlight.animate(
      [
        { backgroundColor: 'rgba(181, 189, 183, 0.09)', borderLeftColor: 'rgba(181, 189, 183, 0.55)' },
        { backgroundColor: 'rgba(181, 189, 183, 0)', borderLeftColor: 'rgba(181, 189, 183, 0)' },
      ],
      { duration: 600, easing: 'ease-out' },
    );
  }

  private render(): void {
    this.element.value = this.lines.join('\n');
    if (!this.coloredElement) return;

    const viewport = this.coloredElement;
    const previousScroll = viewport.scrollTop;
    const fragment = document.createDocumentFragment();
    this.renderedLines.length = 0;

    let gridWrapper: HTMLDivElement | null = null;
    let gridRowsRemaining = 0;

    this.lines.forEach((line, index) => {
      const row = document.createElement('span');
      row.style.display = 'block';
      row.style.minHeight = '17px';
      const winHeader = line.match(/^(\[\d+\] )(WIN \d+)$/);
      const eventHeader = line.match(/^(\[\d+\] )(.*)$/);
      const isGridHeader = /^\[\d+\] (PRE-SPIN GRID|PRIMARY GRID|CASCADE GRID|FINAL GRID)$/.test(line);

      if (eventHeader && index > 0 && !isGridHeader) {
        row.style.paddingTop = '4px';
      }

      if (winHeader) {
        row.appendChild(document.createTextNode(line));
        const payline = Number(this.lines[index + 1]?.match(/^      LINE\s+(\d+)$/)?.[1]);
        if (payline >= 1 && payline <= DEV_PAYLINE_COLORS.length) {
          const dot = document.createElement('span');
          Object.assign(dot.style, {
            display: 'inline-block', width: '9px', height: '9px',
            marginLeft: '8px', borderRadius: '50%',
            backgroundColor: this.paylineColor(payline),
          });
          dot.setAttribute('aria-label', `Payline ${payline} color`);
          row.appendChild(dot);
        }
      } else if (eventHeader) {
        const number = document.createElement('span');
        number.textContent = eventHeader[1];
        number.style.color = '#8e9b96';
        row.append(number, document.createTextNode(eventHeader[2]));
      } else {
        row.textContent = line;
      }

      if (isGridHeader) {
        // Inline-block sizes to the longest grid row; equal inset on every side.
        gridWrapper = document.createElement('div');
        gridWrapper.className = 'receipt-grid';
        Object.assign(gridWrapper.style, {
          display: 'table', boxSizing: 'border-box',
          padding: '6px', marginTop: index > 0 ? '4px' : '0',
          borderLeft: '2px solid transparent',
          borderRadius: '3px', backgroundColor: 'transparent',
        });
        fragment.appendChild(gridWrapper);
        gridRowsRemaining = 4; // Header plus the three symbol rows.
      }

      if (gridWrapper && gridRowsRemaining > 0) {
        gridWrapper.appendChild(row);
        gridRowsRemaining--;
        if (gridRowsRemaining === 0) gridWrapper = null;
      } else {
        fragment.appendChild(row);
      }
      this.renderedLines.push(row);
    });
    viewport.replaceChildren(fragment);
    viewport.scrollTop = previousScroll;
  }

  private paylineColor(payline: number): string {
    return `#${DEV_PAYLINE_COLORS[payline - 1].toString(16).padStart(6, '0')}`;
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