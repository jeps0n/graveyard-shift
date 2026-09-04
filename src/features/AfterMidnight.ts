import { rng } from '../math/RNG';
export type MidnightChoice = 'gasCan' | 'candyBar' | 'plushDoll';
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
      gasCan: shuffled[0],
      candyBar: shuffled[1],
      plushDoll: shuffled[2],
    };
  }
  choose(choice: MidnightChoice): number {
    return this.outcomes[choice];
  }
}