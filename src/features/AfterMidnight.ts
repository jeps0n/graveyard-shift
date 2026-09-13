import { rng } from '../math/RNG';
export type MidnightChoice = 'gasCan' | 'candyBar' | 'plushDoll';
const POSSIBLE_MULTIPLIERS = [2, 5, 10] as const;
const MULTIPLIER_WEIGHTS = [0.5, 0.35, 0.15] as const;
function drawWeightedMultiplier(): number {
  const roll = rng.next();
  let cumulativeWeight = 0;
  for (let i = 0; i < POSSIBLE_MULTIPLIERS.length; i++) {
    cumulativeWeight += MULTIPLIER_WEIGHTS[i];
    if (roll < cumulativeWeight) {
      return POSSIBLE_MULTIPLIERS[i];
    }
  }
  return POSSIBLE_MULTIPLIERS[POSSIBLE_MULTIPLIERS.length - 1];
}
// ─────────────────────────────────────────────
// After Midnight Feature Math
// ─────────────────────────────────────────────
// Feature math owns multiplier assignment only; presentation and timing remain
// isolated in AfterMidnightView.
export class AfterMidnight {
  private outcomes: Partial<Record<MidnightChoice, number>> = {};
  choose(choice: MidnightChoice): number {
    const existingOutcome = this.outcomes[choice];
    if (existingOutcome !== undefined) {
      return existingOutcome;
    }
    // The selected choice receives the only weighted draw (50% / 35% / 15%).
    // Assign the two remaining distinct multipliers to the unrevealed choices so
    // every reveal is unique without changing the selected outcome's probability.
    const selectedMultiplier = drawWeightedMultiplier();
    this.outcomes[choice] = selectedMultiplier;
    const remainingChoices = (
      ['gasCan', 'candyBar', 'plushDoll'] as MidnightChoice[]
    ).filter((candidate) => candidate !== choice);
    const remainingMultipliers = POSSIBLE_MULTIPLIERS.filter(
      (multiplier) => multiplier !== selectedMultiplier,
    );
    if (rng.next() < 0.5) {
      remainingMultipliers.reverse();
    }
    remainingChoices.forEach((remainingChoice, index) => {
      this.outcomes[remainingChoice] = remainingMultipliers[index];
    });
    return selectedMultiplier;
  }
}
