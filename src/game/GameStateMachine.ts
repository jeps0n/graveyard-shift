import type { GameState } from './types';
const VALID_TRANSITIONS: Record<GameState, GameState[]> = {
  IDLE: ['SPINNING'],
  SPINNING: ['EVALUATING'],
  EVALUATING: ['WIN_PRESENTATION', 'IDLE'],
  WIN_PRESENTATION: ['CASCADING'],
  CASCADING: ['EVALUATING', 'IDLE'],
};
export class GameStateMachine {
  private state: GameState = 'IDLE';
  get current(): GameState {
    return this.state;
  }
  transition(next: GameState): void {
    if (!VALID_TRANSITIONS[this.state].includes(next)) {
      throw new Error(
        `Invalid game state transition: ${this.state} → ${next}`,
      );
    }
    this.state = next;
  }
}