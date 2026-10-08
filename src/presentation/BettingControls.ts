import { Graphics, Text } from 'pixi.js';
import { gsap } from 'gsap';

// Operates on the original GameView display objects. No extra container or
// reparenting: positions, z-order, event listeners and public buttons stay intact.
export interface BettingHost {
  spinButton: Graphics;
  spinText: Text;
  spinEnabledRequested: boolean;
  spinBusy: boolean;
  betDownButton: Graphics;
  clearBetButton: Graphics;
  betUpButton: Graphics;
  maxBetButton: Graphics;
  bet1Button: Graphics;
  bet5Button: Graphics;
  bet25Button: Graphics;
  setSpinEnabled(enabled: boolean): void;
  applySpinControlState(): void;
}

export function createBetButton(
    label: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ): Graphics {
    const button = new Graphics();
    const text = new Text({
      text: label,
      style: {
        fill: 0xffffff,
        fontSize: label === 'MAX BET' || label === 'CLEAR' ? 13 : 20,
        fontWeight: 'bold',
      },
    });
    text.anchor.set(0.5);
    text.x = width / 2;
    text.y = height / 2;
    button.addChild(text);
    // Center the transform origin so the press beat does not shift the button.
    button.pivot.set(width / 2, height / 2);
    button.x = x + width / 2;
    button.y = y + height / 2;
    button.eventMode = 'static';
    button.cursor = 'pointer';
    button.clear()
      .roundRect(
        0,
        0,
        width,
        height,
        10,
      )
      .fill({
        color: 0x15191f,
        alpha: 0.96,
      })
      .stroke({
        width: 2,
        color: 0x444b55,
      });
    button.on('pointerover', () => {
      if (button.eventMode !== 'static') {
        return;
      }
      gsap.to(button, {
        alpha: 0.9,
        duration: 0.1,
        overwrite: true,
      });
    });
    button.on('pointerout', () => {
      gsap.to(button, {
        alpha: button.eventMode === 'static' ? 1 : 0.12,
        duration: 0.1,
        overwrite: true,
      });
      gsap.to(button.scale, {
        x: 1,
        y: 1,
        duration: 0.1,
        overwrite: true,
      });
    });
    button.on('pointerdown', () => {
      if (button.eventMode !== 'static') {
        return;
      }
      gsap.to(button.scale, {
        x: 0.96,
        y: 0.96,
        duration: 0.07,
        overwrite: true,
      });
    });
    button.on('pointerup', () => {
      gsap.to(button.scale, {
        x: 1,
        y: 1,
        duration: 0.12,
        ease: 'back.out(2)',
        overwrite: true,
      });
    });
    button.on('pointerupoutside', () => {
      gsap.to(button.scale, {
        x: 1,
        y: 1,
        duration: 0.1,
        overwrite: true,
      });
    });
    return button;
  }

export function updateBetControls(host: BettingHost, 
    balance: number,
    bet: number,
    activeIncrement: 1 | 5 | 25,
  ): void {
    const incrementButtons: Array<{
      button: Graphics;
      value: 1 | 5 | 25;
      width: number;
    }> = [
        { button: host.bet1Button, value: 1, width: 60 },
        { button: host.bet5Button, value: 5, width: 60 },
        { button: host.bet25Button, value: 25, width: 60 },
      ];
    incrementButtons.forEach(({
      button,
      value,
      width,
    }) => {
      const selected = value === activeIncrement;
      button.clear()
        .roundRect(0, 0, width, 34, 10)
        .fill({
          color: selected
            ? 0x8b1e2d
            : 0x15191f,
          alpha: 0.96,
        })
        .stroke({
          width: selected ? 3 : 2,
          color: selected
            ? 0xd9dde3
            : 0x444b55,
        });
      button.alpha = balance > 0 ? 1 : 0.12;
      button.eventMode = balance > 0
        ? 'static'
        : 'none';
      button.cursor = balance > 0
        ? 'pointer'
        : 'default';
    });
    const maxBet = Math.min(balance, 100);
    const canClear = bet > 0;
    const canDecrease = bet > 0;
    const canIncrease = bet < maxBet;
    const canMaxBet = balance > 0 && bet < maxBet;
    host.clearBetButton.alpha = canClear ? 1 : 0.12;
    host.betDownButton.alpha = canDecrease ? 1 : 0.12;
    host.betUpButton.alpha = canIncrease ? 1 : 0.12;
    host.maxBetButton.alpha = canMaxBet ? 1 : 0.12;
    host.clearBetButton.eventMode =
      canClear ? 'static' : 'none';
    host.betDownButton.eventMode =
      canDecrease ? 'static' : 'none';
    host.betUpButton.eventMode =
      canIncrease ? 'static' : 'none';
    host.maxBetButton.eventMode =
      canMaxBet ? 'static' : 'none';
    host.clearBetButton.cursor =
      canClear ? 'pointer' : 'default';
    host.betDownButton.cursor =
      canDecrease ? 'pointer' : 'default';
    host.betUpButton.cursor =
      canIncrease ? 'pointer' : 'default';
    host.maxBetButton.cursor =
      canMaxBet ? 'pointer' : 'default';
    host.setSpinEnabled(bet > 0);
  }

export function setSpinEnabled(host: BettingHost, 
    enabled: boolean,
  ): void {
    host.spinEnabledRequested = enabled;
    host.applySpinControlState();
  }

export function setSpinBusy(host: BettingHost, busy: boolean): void {
    host.spinBusy = busy;
    host.spinText.text = busy ? 'SPINNING…' : 'SPIN';
    host.spinText.style.fontSize = busy ? 20 : 26;
    host.applySpinControlState();
  }

export function applySpinControlState(host: BettingHost): void {
    const interactive = host.spinEnabledRequested && !host.spinBusy;
    host.spinButton.eventMode = interactive ? 'static' : 'none';
    host.spinButton.cursor = interactive ? 'pointer' : 'default';
    const alpha = host.spinBusy ? 0.48 : (host.spinEnabledRequested ? 1 : 0.12);
    host.spinButton.alpha = alpha;
    host.spinText.alpha = alpha;
  }
