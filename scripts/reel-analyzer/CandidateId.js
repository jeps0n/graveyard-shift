/** Stable candidate identity: ordered mathematical values, never run metadata. */
import { createHash } from 'node:crypto';

export function candidateFingerprint(candidate) {
  const canonical = JSON.stringify({
    version: 1,
    paytable: Object.keys(candidate.paytable).sort().map((symbol) => [
      symbol,
      [3, 4, 5].map((count) => candidate.paytable[symbol].payoutMultipliers[count]),
    ]),
    reelWeights: Object.keys(candidate.reelWeights).sort().map((symbol) => [
      symbol, [...candidate.reelWeights[symbol]],
    ]),
  });
  return createHash('sha256').update(canonical).digest('hex').toUpperCase();
}

export function createCandidateId(candidate) {
  const hash = candidateFingerprint(candidate);
  return `GS-${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}`;
}
