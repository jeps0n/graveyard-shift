/** Headless, read-only Monte Carlo simulation using unchanged production algorithms. */
import { performance } from 'node:perf_hooks';
import { simulateSeed } from './SimulationEngine.js';
import { ANALYZER_CONFIG } from './AnalyzerConfig.js';
const { spinsPerSeed: SPINS_PER_SEED, expectedSeeds: EXPECTED_SEEDS, warmupSpins: WARMUP_SPINS } = ANALYZER_CONFIG;
const SEED_CONSTANTS = ANALYZER_CONFIG.seedSets[ANALYZER_CONFIG.activeSeedSet];
import { loadMath } from './MathAdapter.js';
import { createCandidateId } from './CandidateId.js';
import { printReport, printSimulationHeader, printConfigurationTables, createProgressReporter } from './ReportFormatter.js';



if (SEED_CONSTANTS.length !== EXPECTED_SEEDS ||
    SEED_CONSTANTS.some((seed) => !Number.isInteger(seed) || seed < 0 || seed > 0xFFFFFFFF)) {
  throw new Error('AnalyzerConfig.js must select exactly five unsigned 32-bit seed values.');
}

const started = performance.now();

// Prime the JIT and lazy initialization without changing measured RNG streams.
simulateSeed(SEED_CONSTANTS[0], WARMUP_SPINS);

const totalSpins = SEED_CONSTANTS.length * SPINS_PER_SEED;
const { paytable, reelWeights } = loadMath(() => 0.5);
const candidateId = createCandidateId({ paytable, reelWeights });
printSimulationHeader(candidateId, totalSpins, EXPECTED_SEEDS, SPINS_PER_SEED);
printConfigurationTables();
console.log('');
const progress = createProgressReporter('Simulating', totalSpins);
function showProgress(completed, seedIndex) {
  progress.update(completed, `Seed ${seedIndex + 1}/${EXPECTED_SEEDS}`);
}

showProgress(0, 0);
const results = SEED_CONSTANTS.map((seed, index) => simulateSeed(
  seed,
  SPINS_PER_SEED,
  (completedForSeed) => showProgress(index * SPINS_PER_SEED + completedForSeed, index),
));
const elapsedSeconds = (performance.now() - started) / 1000;
progress.finish();
printReport(results, elapsedSeconds, candidateId, { headerPrinted: true });
