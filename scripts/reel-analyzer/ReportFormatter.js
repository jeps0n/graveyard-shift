import { ANALYZER_CONFIG, REEL_WEIGHTS, PAYTABLE } from './AnalyzerConfig.js';
/** Shared 60-column brand header for math command-line tools. */
export function formatMathToolHeader(toolName) {
  const title = `GRAVEYARD SHIFT - ${toolName}`;
  const innerWidth = 58;
  if (title.length > innerWidth) throw new Error('Math tool header is too wide');
  const left = Math.floor((innerWidth - title.length) / 2);
  const right = innerWidth - title.length - left;
  const border = '*'.repeat(60);
  return `${border}\n*${' '.repeat(left)}${title}${' '.repeat(right)}*\n${border}`;
}

/** Fixed-width terminal formatting; separators derive from the same widths as cells. */
const formatNumber = (number) => number.toLocaleString('en-US');
const pct = (number) => (number * 100).toFixed(2);
const seedCode = (seed) => `0x${seed.toString(16).toUpperCase().padStart(8, '0')}`;
const section = (number, name, simulated = false) => `\n${'─'.repeat(60)}\n${number}. ${name}${simulated ? ' **' : ''}`;
const odds = (probability) => probability > 0 ? `1 in ${(1 / probability).toFixed(1)}` : '-';
const width = (text, size, align = 'right') => String(text)[align === 'left' ? 'padEnd' : 'padStart'](size);

function table(columns, rows, { doubleBefore = -1, heavy = false } = {}) {
  const sizes = columns.map((column) => column.width);
  const separator = (character) => '+' + sizes.map((size, index) =>
    character.repeat(size + 2) + (index === doubleBefore - 1 ? '++' : '+')).join('');
  const line = (cells) => '|' + cells.map((cell, index) =>
    ` ${width(cell, sizes[index], columns[index].align)} ` + (index === doubleBefore - 1 ? '||' : '|')).join('');
  const output = [separator(heavy ? '=' : '-')];
  for (const row of rows) {
    if (row === 'divider') output.push(separator('-'));
    else if (row === 'spacer') output.push('+' + sizes.map((size, index) =>
      ' '.repeat(size + 2) + (index === doubleBefore - 1 ? '++' : '+')).join(''));
    else output.push(line(row));
  }
  output.push(separator(heavy ? '=' : '-'));
  return output.join('\n');
}

export function printSimulationHeader(candidateId, totalSpins, seeds, spinsPerSeed) {
  console.log(`\n${formatMathToolHeader('MATH ANALYZER')}\n`);
  console.log(`Candidate ID          : ${candidateId}`);
  console.log(`Total Spins           : ${formatNumber(totalSpins)}`);
  console.log(`Seeds                 : ${seeds}`);
  console.log(`Spins Per Seed        : ${formatNumber(spinsPerSeed)}`);
  console.log('Method                : Monte Carlo Simulation');
  console.log(`\n** Results are based on ${formatNumber(totalSpins)} simulated spins using seeded`);
  console.log('   randomness for consistent and reproducible analysis.');
}

/** Print the exact analyzer inputs before simulation begins. */
export function printConfigurationTables() {
  console.log(section(1, 'PAYTABLE'));
  const payColumns = [{ width: 8, align: 'left' }, ...Array.from({ length: 3 }, () => ({ width: 4 }))];
  const payRows = [['SYMBOL', '3x', '4x', '5x'], 'divider'];
  for (const [symbol, entry] of Object.entries(PAYTABLE)) {
    payRows.push([entry.label ?? symbol.toUpperCase(), ...[3, 4, 5].map((count) => String(entry.payoutMultipliers[count] ?? '-'))]);
  }
  console.log(table(payColumns, payRows));
  console.log('Source: AnalyzerConfig.js → PAYTABLE');

  console.log(section(2, 'REEL WEIGHTS'));
  const totals = [0, 0, 0, 0, 0];
  const groups = [
    ['LOW', ['coffee', 'burger', 'gas', 'chip', 'dice']],
    ['HIGH', ['zed', 'gary', 'barkley', 'victor']],
    ['WILD', ['marge']],
    ['BONUS', ['scatter']],
  ];
  const seen = new Set();
  const reelColumns = [
    { width: 10, align: 'left' },
    ...Array.from({ length: 5 }, () => ({ width: 4 })),
  ];
  const reelRows = [['SYMBOL', 'R1', 'R2', 'R3', 'R4', 'R5'], 'divider'];

  for (const [category, symbols] of groups) {
    if (category !== 'LOW') reelRows.push('divider');
    reelRows.push([category, '', '', '', '', '']);

    for (const symbol of symbols) {
      const weights = REEL_WEIGHTS[symbol];
      if (!Array.isArray(weights) || weights.length !== 5 || weights.some((weight) => !Number.isInteger(weight))) {
        throw new Error(`Invalid reel weights for ${symbol}`);
      }
      seen.add(symbol);
      weights.forEach((weight, index) => { totals[index] += weight; });
      const label = symbol === 'scatter' ? 'MOON' : symbol.toUpperCase();
      reelRows.push([`-- ${label}`, ...weights]);
    }
  }

  const extraSymbols = Object.keys(REEL_WEIGHTS).filter((symbol) => !seen.has(symbol));
  if (extraSymbols.length) throw new Error(`Uncategorized reel weights: ${extraSymbols.join(', ')}`);
  reelRows.push('divider', ['TOTAL', ...totals]);
  console.log(table(reelColumns, reelRows));
  console.log('Source: AnalyzerConfig.js → REEL_WEIGHTS');
}

export function printReport(results, seconds, candidateId = null, { headerPrinted = false } = {}) {
  const totalSpins = results.reduce((sum, result) => sum + result.spins, 0);
  const totals = results.reduce((sum, result) => {
    for (const key of ['initial', 'cascade', 'uplift', 'hits', 'triggers']) sum[key] += result[key];
    for (const multiplier of [2, 5, 10]) sum.multiplierCounts[multiplier] += result.multiplierCounts[multiplier];
    for (const symbol of result.symbols) {
      const current = sum.symbols.get(symbol.name) ?? { appearance: [0, 0, 0, 0, 0], winningSpins: 0 };
      for (let reel = 0; reel < 5; reel++) current.appearance[reel] += symbol.appearance[reel];
      current.winningSpins += symbol.winningSpins;
      sum.symbols.set(symbol.name, current);
    }
    for (const entry of result.combinations ?? []) {
      const key = `${entry.symbol}:${entry.count}:${entry.assisted ? 'assisted' : 'natural'}`;
      const current = sum.combinations.get(key) ?? { hits: 0, payout: 0, uplift: 0 };
      current.hits += entry.hits;
      current.payout += entry.payout;
      current.uplift += entry.uplift;
      sum.combinations.set(key, current);
    }
    for (const kind of ['natural', 'assisted', 'any']) {
      sum.highPreview[kind] += result.highPreview?.[kind] ?? 0;
      sum.lowPreview[kind] += result.lowPreview?.[kind] ?? 0;
    }
    return sum;
  }, { initial: 0, cascade: 0, uplift: 0, hits: 0, triggers: 0, multiplierCounts: { 2: 0, 5: 0, 10: 0 }, symbols: new Map(), combinations: new Map(), highPreview: { natural: 0, assisted: 0, any: 0 }, lowPreview: { natural: 0, assisted: 0, any: 0 } });
  if (!headerPrinted) printSimulationHeader(candidateId, totalSpins, results.length, results[0].spins);

  console.log(section(3, 'SYMBOL STATISTICS', true));
  const symbolColumns = [
    { width: 7, align: 'left' },
    ...Array.from({ length: 5 }, () => ({ width: 5 })),
    { width: 7 }, { width: 8 },
  ];
  const symbolRows = [['SYMBOL', 'R1', 'R2', 'R3', 'R4', 'R5', 'OVERALL', 'WIN RATE'], 'divider'];
  for (const [symbol, counts] of totals.symbols) {
    const appearances = counts.appearance.map((count) => pct(count / (totalSpins * 3)));
    symbolRows.push([symbol.toUpperCase(), ...appearances,
      pct(counts.appearance.reduce((sum, count) => sum + count, 0) / (totalSpins * 15)),
      pct(counts.winningSpins / totalSpins)]);
  }
  console.log(table(symbolColumns, symbolRows));

  console.log(section(4, 'WIN COMBINATION STATISTICS', true));
  const combinationColumns = [
    { width: 8, align: 'left' },
    ...Array.from({ length: 6 }, () => ({ width: 9 })),
    { width: 6 },
  ];
  const combinationRows = [
    ['SYMBOL', '3x NATURAL', '3x ASSIST', '4x NATURAL', '4x ASSIST', '5x NATURAL', '5x ASSIST', 'RTP %'],
    'divider',
  ];
  const symbolNames = [...totals.symbols.keys()].filter((symbol) => symbol !== 'scatter');
  for (const symbol of symbolNames) {
    const entries = [3, 4, 5].flatMap((count) => [false, true].map((assisted) =>
      totals.combinations.get(`${symbol}:${count}:${assisted ? 'assisted' : 'natural'}`)));
    const payout = entries.reduce((total, entry) => total + (entry?.payout ?? 0) + (entry?.uplift ?? 0), 0);
    combinationRows.push([
      symbol.toUpperCase(),
      ...entries.map((entry, index) => symbol === 'marge' && index % 2 === 1 ? '-' : formatNumber(entry?.hits ?? 0)),
      pct(payout / totalSpins),
    ]);
  }
  // Grouped 3x / 4x / 5x headings and double vertical separators.
  const combinationSizes = combinationColumns.map(column => column.width);
  const groupBorder = (fill = '-') => '+' + combinationSizes.map((size, index) =>
    fill.repeat(size + 2) + ([2, 4].includes(index) ? '++' : '+')).join('');
  const groupRow = cells => '|' + cells.map((cell, index) =>
    ` ${width(cell, combinationSizes[index], combinationColumns[index].align)} ` + ([2, 4].includes(index) ? '||' : '|')).join('');
  const groupHeader = '|' + ` ${'SYMBOL'.padEnd(8)} ` + '|' +
    ['3x HITS', '4x HITS', '5x HITS'].map((name, index) => {
      const inner = combinationSizes[1 + index * 2] + combinationSizes[2 + index * 2] + 3;
      return ` ${name.padStart(Math.floor((inner + name.length) / 2)).padEnd(inner)} ` + (index < 2 ? '||' : '|');
    }).join('') + ` ${'RTP %'.padStart(6)} |`;
  const output = [groupBorder(), groupHeader, groupBorder(),
    groupRow(['', 'NATURAL', 'ASSIST', 'NATURAL', 'ASSIST', 'NATURAL', 'ASSIST', '']),
    groupBorder(), ...combinationRows.slice(2).map(groupRow), groupBorder()];
  console.log(output.join('\n'));
  console.log('RTP % includes initial wins, cascades, and applied After Midnight multiplier uplift.');

  console.log(section(5, 'WIN FREQUENCY', true));
  const frequencyColumns = [
    { width: 8, align: 'left' }, { width: 7 }, { width: 14 }, { width: 8 }, { width: 9 },
  ];
  const frequencyRows = [['CATEGORY', 'NATURAL', 'MARGE-ASSISTED', 'HIT RATE', 'ODDS'], 'divider'];
  for (const [label, counts] of [['LOW', totals.lowPreview], ['HIGH', totals.highPreview]]) {
    const probability = counts.any / totalSpins;
    frequencyRows.push([label, `${pct(counts.natural / totalSpins)}%`, `${pct(counts.assisted / totalSpins)}%`, `${pct(probability)}%`, odds(probability)]);
  }
  frequencyRows.push('divider', ['OVERALL', '-', '-', `${pct(totals.hits / totalSpins)}%`, odds(totals.hits / totalSpins)]);
  console.log(table(frequencyColumns, frequencyRows));
  console.log('Natural and Marge-assisted wins may overlap within a spin.');
  console.log('Odds are approximate and derived from observed win frequencies.');

  console.log(section(6, 'AFTER MIDNIGHT', true));
  const bonusColumns = [{ width: 17, align: 'left' }, { width: 18, align: 'left' }];
  const triggerProbability = totals.triggers / totalSpins;
  const bonusRows = [
    ['METRIC', 'VALUE'], 'divider',
    ['Bonus Trigger', `${pct(triggerProbability)}%`],
    ['Trigger Odds', totals.triggers ? `${odds(triggerProbability)} spins` : 'No triggers'],
    'divider',
    ...[2, 5, 10].map((multiplier) => {
      const count = totals.multiplierCounts[multiplier];
      const share = totals.triggers ? pct(count / totals.triggers) : '0.00';
      return [`x${multiplier} Hits`, `${formatNumber(count).padStart(6)} (${share}%)`];
    }),
    'divider',
    ['Total Hits', formatNumber(totals.triggers)],
  ];
  console.log(table(bonusColumns, bonusRows));

  console.log(section(7, 'FINAL PERFORMANCE COMPARISON', true));
  const compareColumns = [{ width: 16, align: 'left' }, ...Array.from({ length: 5 }, () => ({ width: 10 })), { width: 10 }];
  const metric = (label, getValue) => [label, ...results.map((result) => pct(getValue(result))), pct(results.reduce((sum, result) => sum + getValue(result), 0) / results.length)];
  const rows = [
    ['METRIC', 'SEED 1', 'SEED 2', 'SEED 3', 'SEED 4', 'SEED 5', 'AVG'],
    'divider',
    ['Seed Code', ...results.map((result) => seedCode(result.seed)), '-'],
    ['Spins', ...results.map((result) => formatNumber(result.spins)), '-'],
    'divider',
    metric('Total RTP %', (r) => (r.initial + r.cascade + r.uplift) / r.spins),
    'divider',
    metric('Initial RTP %', (r) => r.initial / r.spins),
    metric('Cascade RTP %', (r) => r.cascade / r.spins),
    metric('Multiplier RTP %', (r) => r.uplift / r.spins),
    'divider',
    metric('Hit Rate %', (r) => r.hits / r.spins),
    metric('Bonus Trigger %', (r) => r.triggers / r.spins),
    'divider',
    ['Elapsed Time', ...results.map((r) => `${r.seconds.toFixed(2)}s`), `${seconds.toFixed(2)}s`],
  ];
  console.log(table(compareColumns, rows, { doubleBefore: 6 }));
}


/** Shared terminal presentation for simulation and optimization. */
export function createProgressReporter(label, total, width = ANALYZER_CONFIG.progressBarWidth) {
  let previousLength = 0;
  const write = (completed, detail = '') => {
    const fraction = Math.max(0, Math.min(1, completed / total));
    const filled = Math.floor(fraction * width);
    const bar = '#'.repeat(filled) + '-'.repeat(width - filled);
    const line = `${label} [${bar}] ${String(Math.floor(fraction * 100)).padStart(3)}% | ${detail ? detail + ' | ' : ''}${formatNumber(completed)} / ${formatNumber(total)} spins`;
    process.stdout.write(`\r${line.padEnd(previousLength)}`);
    previousLength = Math.max(previousLength, line.length);
  };
  return {
    update: write,
    finish() { process.stdout.write(`\r${' '.repeat(previousLength)}\r`); },
  };
}

