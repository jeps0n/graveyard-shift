interface DevModeControllerOptions {
  readonly rightPresentation: HTMLElement;
  readonly receiptHost: HTMLElement;
  readonly onModeChange: (enabled: boolean) => void;
  readonly onSetAfterMidnightArmed: (armed: boolean) => boolean;
  readonly onReplayLastSpin: () => Promise<boolean>;
  readonly onCoordinatesVisibleChange: (visible: boolean) => void;
  readonly onPaylinesVisibleChange: (visible: boolean) => void;
}

type ActiveTone = 'replay' | 'bonus' | 'coordinates' | 'paylines';

export class DevModeController {
  private readonly devConsole: HTMLElement;
  private readonly triggerButton: HTMLButtonElement;
  private readonly replayButton: HTMLButtonElement;
  private readonly coordinatesButton: HTMLButtonElement;
  private readonly paylinesButton: HTMLButtonElement;
  private enabled = false;
  private dKeyHeld = false;
  private afterMidnightArmed = false;
  private coordinatesVisible = true;
  private paylinesVisible = true;

  constructor(options: DevModeControllerOptions) {
    const { rightPresentation, receiptHost } = options;

    this.devConsole = document.createElement('section');
    this.devConsole.className = 'dev-console';
    this.devConsole.hidden = true;
    receiptHost.className = 'dev-console__receipt';

    const controls = document.createElement('div');
    controls.className = 'dev-console__controls';

    this.replayButton = this.createButton('REPLAY');
    this.replayButton.disabled = true;
    this.replayButton.title = 'Replay the last completed spin';
    this.replayButton.addEventListener('click', async () => {
      this.replayButton.disabled = true;
      this.setButtonActive(this.replayButton, 'replay', true);
      this.replayButton.textContent = 'REPLAYING';
      try {
        await options.onReplayLastSpin();
      } finally {
        this.replayButton.textContent = 'REPLAY';
        this.setButtonActive(this.replayButton, 'replay', false);
        this.replayButton.disabled = false;
      }
    });

    this.triggerButton = this.createButton('TRIGGER BONUS');
    this.triggerButton.addEventListener('click', () => {
      const nextArmed = !this.afterMidnightArmed;
      if (!options.onSetAfterMidnightArmed(nextArmed)) {
        return;
      }
      this.afterMidnightArmed = nextArmed;
      this.updateTriggerButton();
    });

    this.coordinatesButton = this.createButton('VISIBLE');
    this.coordinatesButton.addEventListener('click', () => {
      this.coordinatesVisible = !this.coordinatesVisible;
      options.onCoordinatesVisibleChange(this.coordinatesVisible);
      this.updateVisibilityButton(this.coordinatesButton, this.coordinatesVisible, 'coordinates');
    });

    this.paylinesButton = this.createButton('VISIBLE');
    this.paylinesButton.addEventListener('click', () => {
      this.paylinesVisible = !this.paylinesVisible;
      options.onPaylinesVisibleChange(this.paylinesVisible);
      this.updateVisibilityButton(this.paylinesButton, this.paylinesVisible, 'paylines');
    });

    controls.append(
      this.createGroup('LAST SPIN', this.replayButton, 'PRESENTATION ONLY'),
      this.createGroup('AFTER MIDNIGHT', this.triggerButton, 'NEXT LIVE SPIN'),
      this.createGroup('COORDINATES', this.coordinatesButton, 'REEL POSITIONS'),
      this.createGroup('PAYLINES', this.paylinesButton, 'WIN PATHS'),
    );

    this.updateVisibilityButton(this.coordinatesButton, true, 'coordinates');
    this.updateVisibilityButton(this.paylinesButton, true, 'paylines');

    this.devConsole.append(receiptHost, controls);
    rightPresentation.appendChild(this.devConsole);

    window.addEventListener('keydown', (event) => {
      if (event.code === 'KeyD' && !event.repeat) this.dKeyHeld = true;
    });
    window.addEventListener('keyup', (event) => {
      if (event.code === 'KeyD') this.dKeyHeld = false;
    });
    window.addEventListener('blur', () => { this.dKeyHeld = false; });
    rightPresentation.addEventListener('pointerdown', () => {
      if (this.dKeyHeld) this.setEnabled(!this.enabled, rightPresentation, options.onModeChange);
    });

    this.setEnabled(false, rightPresentation, options.onModeChange);
  }

  setReplayAvailable(available: boolean): void {
    this.replayButton.disabled = !available;
  }

  markAfterMidnightConsumed(): void {
    this.afterMidnightArmed = false;
    this.updateTriggerButton();
  }

  private createButton(text: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'dev-console__button';
    button.type = 'button';
    button.textContent = text;
    return button;
  }

  private createGroup(label: string, button: HTMLButtonElement, scope: string): HTMLElement {
    const group = document.createElement('div');
    group.className = 'dev-console__group';
    const heading = document.createElement('div');
    heading.className = 'dev-console__label';
    heading.textContent = label;
    const secondary = document.createElement('div');
    secondary.className = 'dev-console__scope';
    secondary.textContent = scope;
    group.append(heading, button, secondary);
    return group;
  }

  private updateTriggerButton(): void {
    this.triggerButton.textContent = this.afterMidnightArmed ? 'BONUS ARMED' : 'TRIGGER BONUS';
    this.setButtonActive(this.triggerButton, 'bonus', this.afterMidnightArmed);
  }

  private updateVisibilityButton(button: HTMLButtonElement, visible: boolean, tone: 'coordinates' | 'paylines'): void {
    button.textContent = visible ? 'VISIBLE' : 'SHOW';
    this.setButtonActive(button, tone, visible);
  }

  private setButtonActive(button: HTMLButtonElement, tone: ActiveTone, active: boolean): void {
    delete button.dataset.activeTone;
    if (active) button.dataset.activeTone = tone;
  }

  private setEnabled(enabled: boolean, rightPresentation: HTMLElement, onModeChange: (enabled: boolean) => void): void {
    this.enabled = enabled;
    rightPresentation.dataset.mode = enabled ? 'dev' : 'portfolio';
    this.devConsole.hidden = !enabled;
    onModeChange(enabled);
  }
}
