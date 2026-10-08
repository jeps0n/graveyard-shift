import { describe, expect, it, vi } from 'vitest';
import { DebugSpinInspector } from '../src/presentation/DebugSpinInspector';
import type { DebugSpinSnapshot } from '../src/dev/DebugSpinSnapshots';

// Minimal Pixi display objects: exercise the real toolbar and pointer handlers.
vi.mock('pixi.js', () => {
  class Container {
    children: unknown[] = [];
    visible = true;
    x = 0;
    y = 0;
    addChild(...children: unknown[]) { this.children.push(...children); }
  }
  class Graphics extends Container {
    alpha = 1;
    eventMode = 'none';
    cursor = '';
    handlers = new Map<string, () => void>();
    roundRect() { return this; }
    fill() { return this; }
    stroke() { return this; }
    on(event: string, handler: () => void) { this.handlers.set(event, handler); return this; }
    tap() { this.handlers.get('pointertap')?.(); }
  }
  class Text extends Container {
    text: string;
    alpha = 1;
    anchor = { set: () => undefined };
    constructor(options: { text: string }) { super(); this.text = options.text; }
  }
  return { Container, Graphics, Text };
});

const phases = ['Pre-Spin Grid', 'Initial Grid', 'Cascade 1 of 2', 'Cascade 2 of 2', 'Final Grid'];
const snapshots = phases.map((label) => ({ label })) as DebugSpinSnapshot[];

type Toolbar = DebugSpinInspector & {
  buttons: Array<{ surface: { alpha: number; eventMode: string; tap(): void } }>;
  phaseLabel: { text: string };
};

function toolbar() {
  const onSelect = vi.fn();
  const inspector = new DebugSpinInspector(onSelect) as unknown as Toolbar;
  inspector.setDevMode(true);
  inspector.setSnapshots(snapshots);
  inspector.setEnabled(true);
  return { inspector, onSelect };
}

function tap(inspector: Toolbar, index: number) {
  inspector.buttons[index].surface.tap();
}

describe('DebugSpinInspector navigation', () => {
  it('starts at Final Grid and navigates each historical phase in both directions', () => {
    const { inspector, onSelect } = toolbar();
    expect(inspector.phaseLabel.text).toBe('Final Grid');
    expect(inspector.buttons[2].surface.eventMode).toBe('none');
    for (let index = 3; index >= 0; index--) {
      tap(inspector, 1);
      expect(inspector.phaseLabel.text).toBe(phases[index]);
      expect(onSelect).toHaveBeenLastCalledWith(snapshots[index]);
    }
    expect(inspector.buttons[0].surface.eventMode).toBe('none');
    tap(inspector, 1);
    expect(onSelect).toHaveBeenCalledTimes(4);
    tap(inspector, 3);
    expect(inspector.phaseLabel.text).toBe('Final Grid');
    expect(onSelect).toHaveBeenLastCalledWith(snapshots[4]);
    tap(inspector, 0);
    expect(inspector.phaseLabel.text).toBe('Pre-Spin Grid');
  });

  it('does not navigate while replay or a spin disables the inspector', () => {
    const { inspector, onSelect } = toolbar();
    inspector.setEnabled(false);
    expect(inspector.visible).toBe(false);
    tap(inspector, 0);
    expect(onSelect).not.toHaveBeenCalled();
    inspector.setEnabled(true);
    inspector.setDevMode(false);
    tap(inspector, 0);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('restores Final Grid when inspection is reset, without mutating snapshots', () => {
    const { inspector, onSelect } = toolbar();
    tap(inspector, 0);
    inspector.reset();
    expect(onSelect).toHaveBeenLastCalledWith(snapshots[4]);
    expect(inspector.phaseLabel.text).toBe('Final Grid');
    expect(inspector.visible).toBe(false);
    inspector.setEnabled(true);
    expect(inspector.phaseLabel.text).toBe('Final Grid');
    expect(snapshots.map((snapshot) => snapshot.label)).toEqual(phases);
  });

  it('remains hidden with an empty history', () => {
    const { inspector, onSelect } = toolbar();
    inspector.setSnapshots([]);
    expect(inspector.visible).toBe(false);
    tap(inspector, 0);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
