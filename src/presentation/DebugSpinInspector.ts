import { Container, Graphics, Text } from 'pixi.js';
import type { DebugSpinSnapshot } from '../dev/DebugSpinSnapshots';

/** Debug-only, manually paged history. Navigation never touches authoritative state. */
export class DebugSpinInspector extends Container {
  private snapshots: DebugSpinSnapshot[] = [];
  private index = 0;
  private enabled = false;
  private devMode = false;
  private readonly phaseLabel: Text;
  private readonly buttons: Array<{ surface: Graphics; text: Text }> = [];

  private readonly onSelect: (snapshot: DebugSpinSnapshot) => void;

  constructor(onSelect: (snapshot: DebugSpinSnapshot) => void) {
    super();
    this.onSelect = onSelect;
    // The entire toolbar, including its fixed label region, is centered over
    // the reel grid (reel origin 180, reel width 640, center 500).
    const buttonWidth = 49;
    const buttonHeight = 24;
    const gap = 6;
    const labelWidth = 172;
    const labelGap = 22;
    const panelPadding = 12;
    const contentWidth = buttonWidth * 4 + gap * 2 + labelGap * 2 + labelWidth;
    const panelWidth = contentWidth + panelPadding * 2;
    const panelHeight = 38;
    this.x = 500 - panelWidth / 2;
    // Clear the multiplier recess (y=5..37) and the reel viewport (y>=100).
    // Cabinet artwork is decorative and does not constrain this floating overlay.
    this.y = 43;
    const panel = new Graphics()
      .roundRect(0, 0, panelWidth, panelHeight, 7)
      .fill({ color: 0x15191f, alpha: 0.96 })
      .stroke({ color: 0x606a76, width: 1 });
    this.addChild(panel);
    const left = panelPadding;
    const right = panelWidth - panelPadding - buttonWidth;
    const positions = [left, left + buttonWidth + gap, right - buttonWidth - gap, right];
    const captions = ['|◀', '◀', '▶', '▶|'];
    captions.forEach((caption, buttonIndex) => {
      const surface = new Graphics()
        .roundRect(0, 0, buttonWidth, buttonHeight, 5)
        .fill({ color: 0x22272c })
        .stroke({ color: 0x606a76, width: 1 });
      surface.x = positions[buttonIndex];
      surface.y = (panelHeight - buttonHeight) / 2;
      surface.eventMode = 'static';
      surface.cursor = 'pointer';
      const text = new Text({ text: caption, style: { fill: 0xe2e6eb, fontSize: 13, fontWeight: 'bold' } });
      text.anchor.set(0.5);
      text.x = surface.x + buttonWidth / 2;
      text.y = panelHeight / 2;
      surface.on('pointertap', () => this.navigate(buttonIndex));
      this.addChild(surface, text);
      this.buttons.push({ surface, text });
    });
    this.phaseLabel = new Text({ text: '', style: { fill: 0xe2e6eb, fontSize: 14, fontWeight: 'bold' } });
    this.phaseLabel.anchor.set(0.5);
    this.phaseLabel.x = panelWidth / 2;
    this.phaseLabel.y = panelHeight / 2;
    this.addChild(this.phaseLabel);
    this.refresh();
  }

  setSnapshots(snapshots: DebugSpinSnapshot[]): void {
    this.snapshots = snapshots;
    this.index = Math.max(0, snapshots.length - 1);
    this.refresh();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.refresh();
  }

  setDevMode(enabled: boolean): void {
    this.devMode = enabled;
    this.refresh();
  }

  /** Restores the actual final grid before removing historical inspection. */
  reset(): void {
    if (this.snapshots.length && this.index !== this.snapshots.length - 1) {
      this.onSelect(this.snapshots[this.snapshots.length - 1]);
    }
    this.index = Math.max(0, this.snapshots.length - 1);
    this.enabled = false;
    this.refresh();
  }

  private navigate(buttonIndex: number): void {
    if (!this.enabled || !this.devMode || !this.snapshots.length) return;
    const last = this.snapshots.length - 1;
    const next = [0, this.index - 1, this.index + 1, last][buttonIndex];
    if (next === this.index || next < 0 || next > last) return;
    this.index = next;
    this.onSelect(this.snapshots[this.index]);
    this.refresh();
  }

  private refresh(): void {
    this.visible = this.enabled && this.devMode && this.snapshots.length > 0;
    this.phaseLabel.text = this.snapshots[this.index]?.label ?? '';
    this.buttons.forEach(({ surface, text }, i) => {
      const disabled = i < 2 ? this.index === 0 : this.index === this.snapshots.length - 1;
      surface.alpha = disabled ? 0.35 : 1;
      text.alpha = disabled ? 0.35 : 1;
      surface.eventMode = disabled ? 'none' : 'static';
    });
  }
}
