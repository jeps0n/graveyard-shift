interface DevModeControllerOptions {
  readonly rightPresentation: HTMLElement;
  readonly receiptHost: HTMLElement;
  readonly onModeChange: (enabled: boolean) => void;
  readonly onTriggerAfterMidnight: () => boolean;
}

export class DevModeController {
  private readonly devConsole: HTMLElement;
  private readonly triggerButton: HTMLButtonElement;
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

    const replayButton = document.createElement('button');
    replayButton.className = 'dev-console__button';
    replayButton.type = 'button';
    replayButton.disabled = true;
    replayButton.textContent = '▶ REPLAY';
    replayButton.title = 'Replay is added in Pass B';

    replayGroup.append(replayLabel, replayButton);

    const featureGroup = document.createElement('div');
    featureGroup.className = 'dev-console__group';

    const featureLabel = document.createElement('div');
    featureLabel.className = 'dev-console__label';
    featureLabel.textContent = 'FEATURE TESTING';

    this.triggerButton = document.createElement('button');
    this.triggerButton.className = 'dev-console__button';
    this.triggerButton.type = 'button';
    this.triggerButton.textContent = 'TRIGGER AFTER MIDNIGHT';
    this.triggerButton.addEventListener('click', () => {
      if (!options.onTriggerAfterMidnight()) {
        return;
      }
      this.triggerButton.disabled = true;
      this.triggerButton.textContent = 'AFTER MIDNIGHT ARMED';
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

  markAfterMidnightConsumed(): void {
    this.triggerButton.disabled = false;
    this.triggerButton.textContent = 'TRIGGER AFTER MIDNIGHT';
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
