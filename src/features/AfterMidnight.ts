import { rng } from '../math/RNG';
export type MidnightChoice = 'A' | 'B' | 'C';
const POSSIBLE_MULTIPLIERS = [2, 5, 10];
export class AfterMidnight {
  private readonly outcomes: Record<MidnightChoice, number>;
  constructor() {
    const shuffled = [...POSSIBLE_MULTIPLIERS];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    this.outcomes = {
      A: shuffled[0],
      B: shuffled[1],
      C: shuffled[2],
    };
  }
  choose(choice: MidnightChoice): number {
    return this.outcomes[choice];
  }
}