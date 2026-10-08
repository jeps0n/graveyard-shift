import { describe, expect, it, vi, beforeEach } from 'vitest';

const animation = vi.hoisted(() => {
  const timelines: Array<{ steps: Array<{ target: any; vars: any }>; callbacks: Array<() => void>; options: any }> = [];
  const timeline = vi.fn((options: any = {}) => {
    const record = { steps: [] as Array<{ target: any; vars: any }>, callbacks: [] as Array<() => void>, options };
    timelines.push(record);
    const chain: any = {
      to(target: any, vars: any) { record.steps.push({ target, vars }); return chain; },
      call(callback: () => void) { record.callbacks.push(callback); return chain; },
    };
    return chain;
  });
  return { timelines, timeline, to: vi.fn(() => ({ kill: vi.fn() })), killTweensOf: vi.fn() };
});
vi.mock('gsap', () => ({ gsap: animation }));

vi.mock('pixi.js', () => {
  class Display {
    children: any[] = [];
    events: Record<string, () => void> = {};
    alpha = 1;
    x = 0;
    y = 0;
    visible = true;
    eventMode = 'auto';
    cursor = '';
    rotation = 0;
    style: any = {};
    text = '';
    texture: any;
    filters: any;
    mask: any;
    width = 0;
    height = 0;
    anchor = { set: vi.fn() };
    pivot = { set: vi.fn() };
    scale = { x: 1, y: 1, set(x: number, y = x) { this.x = x; this.y = y; } };
    constructor(input?: any) { if (input?.text !== undefined) { this.text = input.text; this.style = input.style; } else if (input?.width) this.texture = input; }
    addChild(child: any) { this.children.push(child); return child; }
    addChildAt(child: any, index: number) { this.children.splice(index, 0, child); return child; }
    on(event: string, fn: () => void) { this.events[event] = fn; return this; }
    emit(event: string) { this.events[event]?.(); }
    destroy = vi.fn();
    clear() { return this; }
    rect() { return this; }
    roundRect() { return this; }
    fill() { return this; }
    stroke() { return this; }
  }
  class Sprite extends Display {
    constructor(texture?: any) { super(); this.texture = texture ?? { width: 100, height: 100 }; }
  }
  return { Container: Display, Graphics: Display, Text: Display, Sprite,
    Assets: { load: vi.fn(async () => ({ width: 100, height: 100 })) },
  };
});
vi.mock('pixi-filters', () => ({ GlowFilter: class { enabled = true; constructor(_options: any) {} } }));

import { Container } from 'pixi.js';
import { CHOICES, createMidnightChoiceCards } from '../src/presentation/MidnightChoiceCards';
import { playMidnightRevealSequence } from '../src/presentation/MidnightRevealSequence';
import { AfterMidnightView } from '../src/presentation/AfterMidnightView';

const textures = Object.fromEntries(CHOICES.map((choice) => [choice, { width: 100, height: 100 }])) as any;
function cards(selected = () => false, onSelect = vi.fn()) {
  const overlay = new Container();
  const backdropLayer = new Container();
  return { ...createMidnightChoiceCards({ textures, overlay, backdropLayer, isSelected: selected,
    onSelect, panelX: 500, panelY: 289 }), overlay, backdropLayer };
}

beforeEach(() => { animation.timelines.length = 0; animation.timeline.mockClear(); animation.to.mockClear(); animation.killTweensOf.mockClear(); });

describe('After Midnight choice presentation', () => {

  it('routes taps to the correct choice and suppresses hover effects after selection', () => {
    let selected = false;
    const onSelect = vi.fn(() => { selected = true; });
    const { cards: choices } = cards(() => selected, onSelect);
    const first = choices.get(CHOICES[0])!;
    first.hitArea.emit('pointerover');
    expect(first.artworkGlow.enabled).toBe(true);
    first.hitArea.emit('pointerout');
    expect(first.artworkGlow.enabled).toBe(false);
    first.hitArea.emit('pointertap');
    expect(onSelect).toHaveBeenCalledWith(CHOICES[0]);
    const calls = animation.to.mock.calls.length;
    first.hitArea.emit('pointerover');
    first.hitArea.emit('pointerout');
    expect(animation.to).toHaveBeenCalledTimes(calls);
  });

});

describe('After Midnight reveal choreography', () => {
  it('handles a missing selected card without animating', () => {
    const finish = vi.fn();
    playMidnightRevealSequence({ cards: new Map(), selectedChoice: CHOICES[0],
      selectedMultiplier: 5, finish } as any);
    expect(finish).toHaveBeenCalledOnce();
    expect(animation.timeline).not.toHaveBeenCalled();
  });

  it('reveals the selected result, unchosen results, and hero multiplier', () => {
    const { cards: choices } = cards();
    const resolveChoice = vi.fn((choice: string) => choice === CHOICES[1] ? 5 : 2);
    const heroMultiplier = new Container() as any;
    const echoLayer = new Container();
    const finish = vi.fn();
    playMidnightRevealSequence({ cards: choices, selectedChoice: CHOICES[1],
      selectedMultiplier: 5, resolveChoice, finish, heroMultiplier,
      choiceEchoLayer: echoLayer, overlay: new Container(), dimmer: new Container(),
      panel: new Container(), backdropLayer: new Container(), panelVeil: new Container(),
      heroFrame: new Container(), heroCaption: new Container(), heroConfirmation: new Container() } as any);
    expect(echoLayer.children).toHaveLength(31);
    expect(animation.timeline).toHaveBeenCalledOnce();
    for (const callback of animation.timelines[0].callbacks) callback();
    expect(heroMultiplier.text).toBe('×5');
    expect(choices.get(CHOICES[1])!.multiplier.text).toBe('×5');
    expect(resolveChoice).toHaveBeenCalledTimes(2);
    expect(choices.get(CHOICES[0])!.multiplier.text).toBe('×2');
    expect(choices.get(CHOICES[2])!.multiplier.text).toBe('×2');
  });
});

describe('After Midnight overlay lifecycle', () => {
  it('accepts only the first choice and cleans up exactly once after reveal', async () => {
    const view = new AfterMidnightView();
    const resolveChoice = vi.fn(() => 10);
    const result = view.show(resolveChoice);
    await Promise.resolve();
    await Promise.resolve();
    const overlay = (view as any).children[0];
    const interactive = overlay.children.flatMap((child: any) => child.children)
      .filter((child: any) => child.events?.pointertap);
    expect(interactive).toHaveLength(3);
    interactive[0].emit('pointertap');
    // The reveal also resolves the two unchosen cards. Only the first tap
    // should initiate a selection; the second tap must do nothing.
    expect(resolveChoice).toHaveBeenCalledTimes(3);
    expect(resolveChoice.mock.calls.map(([choice]) => choice)).toEqual([
      CHOICES[0], CHOICES[1], CHOICES[2],
    ]);
    interactive[1].emit('pointertap');
    expect(resolveChoice).toHaveBeenCalledTimes(3);
    expect(animation.timeline).toHaveBeenCalledTimes(2);
    expect(interactive.every((hit: any) => hit.eventMode === 'none')).toBe(true);
    const reveal = animation.timelines.at(-1)!;
    for (const callback of reveal.callbacks) callback();
    // The actual GSAP completion callback is the last handoff in the reveal timeline.
    reveal.options.onComplete?.();
    await expect(result).resolves.toBe(10);
    expect(overlay.destroy).toHaveBeenCalledOnce();
  });
});
