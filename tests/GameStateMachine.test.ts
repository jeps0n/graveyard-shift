import { describe, expect, it } from 'vitest';
import { GameStateMachine } from '../src/game/GameStateMachine';

describe('GameStateMachine contract', () => {
  it('starts IDLE', () => {
    expect(new GameStateMachine().current).toBe('IDLE');
  });

  it('supports the normal winning spin state path', () => {
    const state = new GameStateMachine();
    state.transition('SPINNING');
    state.transition('EVALUATING');
    state.transition('WIN_PRESENTATION');
    state.transition('CASCADING');
    state.transition('EVALUATING');
    state.transition('IDLE');
    expect(state.current).toBe('IDLE');
  });

  it('supports repeated cascade evaluation', () => {
    const state = new GameStateMachine();
    state.transition('SPINNING');
    state.transition('EVALUATING');
    state.transition('CASCADING');
    state.transition('EVALUATING');
    state.transition('CASCADING');
    expect(state.current).toBe('CASCADING');
  });

  it('rejects an invalid transition', () => {
    const state = new GameStateMachine();
    expect(() => state.transition('CASCADING')).toThrow('Invalid game state transition: IDLE → CASCADING');
    expect(state.current).toBe('IDLE');
  });
});
