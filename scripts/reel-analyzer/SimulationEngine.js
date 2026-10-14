/** Deterministic simulation and metric collection; production game math is unchanged. */
import { performance } from 'node:perf_hooks';
import { createSeededRNG } from './SeededRNG.js';
import { loadMath } from './MathAdapter.js';
import { ANALYZER_CONFIG } from './AnalyzerConfig.js';

const PROGRESS_INTERVAL = ANALYZER_CONFIG.progressInterval;
const MAX_CASCADE_STEPS = ANALYZER_CONFIG.maxCascadeSteps;

export function simulateSeed(seed, spins, onProgress = null) {
  const random = createSeededRNG(seed);
  const { generatePrimaryGrid, evaluatePrimaryGrid, evaluateWins, resolveCascadeStep, AfterMidnight, reelWeights } = loadMath(random);
  const symbols = new Map(Object.keys(reelWeights).map((name) => [name, { name, appearance: [0, 0, 0, 0, 0], winningSpins: 0 }]));
  const multiplierCounts = { 2: 0, 5: 0, 10: 0 };
  // Awarded combinations and WILD assistance are tracked independently.
  const combinations = new Map();
  const highPreview = { natural: 0, assisted: 0, any: 0 };
  const lowPreview = { natural: 0, assisted: 0, any: 0 };
  const LOW_SYMBOLS = new Set(ANALYZER_CONFIG.lowSymbols);
  const HIGH_SYMBOLS = new Set(ANALYZER_CONFIG.highSymbols);
  let highNaturalThisSpin = false;
  let highAssistedThisSpin = false;
  let lowNaturalThisSpin = false;
  let lowAssistedThisSpin = false;
  const recordCombinations = (currentGrid, currentWins, appliedMultiplier) => {
    for (const win of currentWins) {
      const assisted = win.symbol !== 'marge' && win.positions.some(({ reel, row }) => currentGrid[reel][row] === 'marge');
      const key = `${win.symbol}:${win.count}:${assisted ? 'assisted' : 'natural'}`;
      const entry = combinations.get(key) ?? { symbol: win.symbol, count: win.count, assisted, hits: 0, payout: 0, uplift: 0 };
      entry.hits++;
      entry.payout += win.payoutMultiplier;
      entry.uplift += win.payoutMultiplier * (appliedMultiplier - 1);
      combinations.set(key, entry);
      if (HIGH_SYMBOLS.has(win.symbol)) {
        if (assisted) highAssistedThisSpin = true;
        else highNaturalThisSpin = true;
      }
      if (LOW_SYMBOLS.has(win.symbol)) {
        if (assisted) lowAssistedThisSpin = true;
        else lowNaturalThisSpin = true;
      }
    }
  };
  let initial = 0;
  let cascade = 0;
  let uplift = 0;
  let hits = 0;
  let triggers = 0;
  let nextMultiplier = 1;
  const start = performance.now();

  for (let spin = 0; spin < spins; spin++) {
    highNaturalThisSpin = false;
    highAssistedThisSpin = false;
    lowNaturalThisSpin = false;
    lowAssistedThisSpin = false;
    const appliedMultiplier = nextMultiplier;
    nextMultiplier = 1;
    const primary = generatePrimaryGrid();
    for (let reel = 0; reel < 5; reel++) {
      for (const symbol of primary.grid[reel]) {
        if (!symbols.has(symbol)) symbols.set(symbol, { name: symbol, appearance: [0, 0, 0, 0, 0], winningSpins: 0 });
        symbols.get(symbol).appearance[reel]++;
      }
    }

    const evaluation = evaluatePrimaryGrid(primary);
    const initialPay = evaluation.totalPayoutMultiplier;
    let cascadePay = 0;
    let grid = evaluation.grid;
    let wins = evaluation.wins;
    const winningSymbols = new Set();
    const recordWinningSymbols = (currentGrid, currentWins) => {
      for (const win of currentWins) {
        winningSymbols.add(win.symbol);
        for (const { reel, row } of win.positions) winningSymbols.add(currentGrid[reel][row]);
      }
    };
    recordWinningSymbols(grid, wins);
    recordCombinations(grid, wins, appliedMultiplier);
    let cascadeSteps = 0;
    while (wins.length > 0) {
      if (++cascadeSteps > MAX_CASCADE_STEPS) {
        throw new Error(`Cascade safety limit exceeded on seed 0x${seed.toString(16)}, spin ${spin + 1}`);
      }
      grid = resolveCascadeStep(grid, wins).grid;
      wins = evaluateWins(grid).wins;
      for (const win of wins) cascadePay += win.payoutMultiplier;
      recordWinningSymbols(grid, wins);
      recordCombinations(grid, wins, appliedMultiplier);
    }

    if (highNaturalThisSpin) highPreview.natural++;
    if (highAssistedThisSpin) highPreview.assisted++;
    if (highNaturalThisSpin || highAssistedThisSpin) highPreview.any++;
    if (lowNaturalThisSpin) lowPreview.natural++;
    if (lowAssistedThisSpin) lowPreview.assisted++;
    if (lowNaturalThisSpin || lowAssistedThisSpin) lowPreview.any++;

    const basePay = initialPay + cascadePay;
    initial += initialPay;
    cascade += cascadePay;
    uplift += basePay * (appliedMultiplier - 1);
    if (basePay > 0) hits++;
    for (const symbol of winningSymbols) {
      if (!symbols.has(symbol)) symbols.set(symbol, { name: symbol, appearance: [0, 0, 0, 0, 0], winningSpins: 0 });
      symbols.get(symbol).winningSpins++;
    }

    // Game.ts checks Scatters on the final post-cascade grid, once per spin.
    if (grid.flat().filter((symbol) => symbol === 'scatter').length >= 3) {
      triggers++;
      // Fixed first pick: selected multiplier distribution is independent of choice.
      const multiplier = new AfterMidnight().choose('gasCan');
      multiplierCounts[multiplier]++;
      nextMultiplier = multiplier;
    }
    if (onProgress && ((spin + 1) % PROGRESS_INTERVAL === 0 || spin + 1 === spins)) {
      onProgress(spin + 1);
    }
  }
  return {
    seed, spins, initial, cascade, uplift, hits, triggers, multiplierCounts,
    symbols: [...symbols.values()], combinations: [...combinations.values()], highPreview, lowPreview, seconds: (performance.now() - start) / 1000,
  };
}

