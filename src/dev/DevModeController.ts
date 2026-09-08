interface DevModeControllerOptions {
  readonly rightPresentation: HTMLElement;
  readonly receiptHost: HTMLElement;
  readonly onModeChange: (enabled: boolean) => void;
  readonly onTriggerAfterMidnight: () => boolean;
  readonly onReplayLastSpin: () => Promise<boolean>;
}

export class DevModeController {
  private readonly devConsole: HTMLElement;
  private readonly triggerButton: HTMLButtonElement;
  private readonly replayButton: HTMLButtonElement;
  private enabled = false;
  private dKeyHeld = false;

  constructor(options: DevModeControllerOptions) {
    const { rightPresentation, receiptHost } = options;

    this.devConsole = document.createElement('section');
    this.devConsole.className = 'dev-console';
    this.devConsole.hidden = true;

    receiptHost.className = 'dev-console__receipt';

    const controls = document.createElement('div');
    controls.className = 'dev-console__controls';

    const replayGroup = document.createElement('div');
    replayGroup.className = 'dev-console__group';

    const replayLabel = document.createElement('div');
    replayLabel.className = 'dev-console__label';
    replayLabel.textContent = 'LAST SPIN';

    this.replayButton = document.createElement('button');
    this.replayButton.className = 'dev-console__button';
    this.replayButton.type = 'button';
    this.replayButton.disabled = true;
    this.replayButton.textContent = '▶ REPLAY LAST SPIN';
    this.replayButton.title = 'Replay the last completed spin';

    this.replayButton.addEventListener('click', async () => {
      this.replayButton.disabled = true;
      this.replayButton.textContent = 'REPLAYING…';
      try {
        await options.onReplayLastSpin();
      } finally {
        this.replayButton.textContent = '▶ REPLAY LAST SPIN';
        this.replayButton.disabled = false;
      }
    });

    replayGroup.append(replayLabel, this.replayButton);

    const featureGroup = document.createElement('div');
    featureGroup.className = 'dev-console__group';

    const featureLabel = document.createElement('div');
    featureLabel.className = 'dev-console__label';
    featureLabel.textContent = 'FEATURE TESTING';

    this.triggerButton = document.createElement('button');
    this.triggerButton.className = 'dev-console__button';
    this.triggerButton.type = 'button';
    this.setTriggerButtonContent(false);
    this.triggerButton.addEventListener('click', () => {
      if (!options.onTriggerAfterMidnight()) {
        return;
      }
      this.triggerButton.disabled = true;
      this.setTriggerButtonContent(true);
    });

    featureGroup.append(featureLabel, this.triggerButton);
    controls.append(replayGroup, featureGroup);
    this.devConsole.append(receiptHost, controls);
    rightPresentation.appendChild(this.devConsole);

    window.addEventListener('keydown', (event) => {
      if (event.code === 'KeyD' && !event.repeat) {
        this.dKeyHeld = true;
      }
    });

    window.addEventListener('keyup', (event) => {
      if (event.code === 'KeyD') {
        this.dKeyHeld = false;
      }
    });

    window.addEventListener('blur', () => {
      this.dKeyHeld = false;
    });

    rightPresentation.addEventListener('pointerdown', () => {
      if (this.dKeyHeld) {
        this.setEnabled(!this.enabled, rightPresentation, options.onModeChange);
      }
    });

    this.setEnabled(false, rightPresentation, options.onModeChange);
  }

  setReplayAvailable(available: boolean): void {
    this.replayButton.disabled = !available;
  }

  markAfterMidnightConsumed(): void {
    this.triggerButton.disabled = false;
    this.setTriggerButtonContent(false);
  }

  private setTriggerButtonContent(armed: boolean): void {
    this.triggerButton.replaceChildren();
    const primary = document.createElement('span');
    primary.className = 'dev-console__button-primary';
    primary.textContent = armed ? 'AFTER MIDNIGHT ARMED' : 'TRIGGER AFTER MIDNIGHT';
    const secondary = document.createElement('span');
    secondary.className = 'dev-console__button-secondary';
    secondary.textContent = 'on next live spin';
    this.triggerButton.append(primary, secondary);
  }

  private setEnabled(
    enabled: boolean,
    rightPresentation: HTMLElement,
    onModeChange: (enabled: boolean) => void,
  ): void {
    this.enabled = enabled;
    rightPresentation.dataset.mode = enabled ? 'dev' : 'portfolio';
    this.devConsole.hidden = !enabled;
    onModeChange(enabled);
  }
}
