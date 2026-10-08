import { Container, Text } from 'pixi.js';
import { gsap } from 'gsap';

export interface HudDisplay {
  balanceLabel: Text;
  wagerLabel: Text;
  winLabel: Text;
  balanceText: Text;
  betText: Text;
  winText: Text;
}
export interface HudHost extends HudDisplay {
  updateBetControls(balance: number, bet: number, increment: 1 | 5 | 25): void;
}

export function createGameHud(host: Container): HudDisplay {
    const balanceLabel = new Text({
      text: 'BALANCE',
      style: {
        fill: 0xf2c46d,
        stroke: {
          color: 0x1a1208,
          width: 1,
        },
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1.5,
      },
    });
    balanceLabel.anchor.set(0.5);
    balanceLabel.x = 262;
    balanceLabel.y = 546;
    host.addChild(balanceLabel);
    const balanceText = new Text({
      text: '$100.00',
      style: {
        fill: 0xffffff,
        fontSize: 20,
        fontWeight: 'bold',
      },
    });
    balanceText.anchor.set(0.5);
    balanceText.x = 262;
    balanceText.y = 569;
    host.addChild(balanceText);
    const wagerLabel = new Text({
      text: 'WAGER',
      style: {
        fill: 0xf2c46d,
        stroke: {
          color: 0x1a1208,
          width: 1,
        },
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1.5,
      },
    });
    wagerLabel.anchor.set(0.5);
    wagerLabel.x = 502;
    wagerLabel.y = 546;
    host.addChild(wagerLabel);
    const betText = new Text({
      text: '$0.00',
      style: {
        fill: 0xffffff,
        fontSize: 22,
        fontWeight: 'bold',
      },
    });
    betText.anchor.set(0.5);
    betText.x = 502;
    betText.y = 569;
    host.addChild(betText);
    const winLabel = new Text({
      text: 'WIN',
      style: {
        fill: 0xf2c46d,
        stroke: {
          color: 0x1a1208,
          width: 1,
        },
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1.5,
      },
    });
    winLabel.anchor.set(0.5);
    winLabel.x = 742;
    winLabel.y = 546;
    host.addChild(winLabel);
    const winText = new Text({
      text: '$0.00',
      style: {
        fill: 0xffffff,
        fontSize: 20,
        fontWeight: 'bold',
      },
    });
    winText.anchor.set(0.5);
    winText.x = 742;
    winText.y = 569;
    host.addChild(winText);
    return { balanceLabel, wagerLabel, winLabel, balanceText, betText, winText };
}


export function animateWagerBeat(host: HudHost, 
    peakScale = 1.06,
  ): void {
    gsap.killTweensOf(host.betText.scale);
    host.betText.scale.set(1);
    gsap.timeline()
      .to(host.betText.scale, {
        x: peakScale,
        y: peakScale,
        duration: 0.08,
        ease: 'power2.out',
      })
      .to(host.betText.scale, {
        x: 1,
        y: 1,
        duration: 0.1,
        ease: 'power2.inOut',
      });
  }

export async function animateBalanceDeductionBeat(host: HudHost, 
    balanceBeforeBet: number,
    balanceAfterBet: number,
  ): Promise<void> {
    gsap.killTweensOf(host.balanceText.scale);
    host.balanceText.scale.set(1);
    host.balanceText.style.fill = 0x63dbe8;
    host.balanceText.text = formatMoney(balanceBeforeBet);
    const displayedBalance = { value: balanceBeforeBet };
    await new Promise<void>((resolve) => {
      const timeline = gsap.timeline({
        onComplete: () => {
          host.balanceText.text = formatMoney(balanceAfterBet);
          host.balanceText.style.fill = 0xffffff;
          resolve();
        },
      });
      timeline
        .to(displayedBalance, {
          value: balanceAfterBet,
          duration: 0.2,
          ease: 'none',
          onUpdate: () => {
            host.balanceText.text = formatMoney(displayedBalance.value);
          },
        }, 0)
        .to(host.balanceText.scale, {
          x: 1.05,
          y: 1.05,
          duration: 0.08,
          ease: 'power2.out',
        }, 0)
        .to(host.balanceText.scale, {
          x: 1,
          y: 1,
          duration: 0.12,
          ease: 'power2.inOut',
        });
    });
  }

export async function animateWinCreditBeat(host: HudHost): Promise<void> {
    await animateMoneyBeat(host.winText, 0x62d98b, 1.07);
  }

export async function animateBalanceCreditBeat(host: HudHost): Promise<void> {
    await animateMoneyBeat(host.balanceText, 0x62d98b, 1.05);
  }

export async function animatePayoutBeat(host: HudHost, 
    balanceBeforePayout: number,
    finalBalance: number,
    totalWin: number,
  ): Promise<void> {
    gsap.killTweensOf(host.winText.scale);
    gsap.killTweensOf(host.balanceText.scale);
    host.winText.scale.set(1);
    host.balanceText.scale.set(1);
    host.winText.text = '$0.00';
    host.balanceText.text = formatMoney(balanceBeforePayout);
    host.winText.style.fill = 0x62d98b;
    host.balanceText.style.fill = 0xffffff;
    const displayedWin = { value: 0 };
    const displayedBalance = { value: balanceBeforePayout };
    await new Promise<void>((resolve) => {
      const timeline = gsap.timeline({
        onComplete: () => {
          host.winText.text = formatMoney(totalWin);
          host.balanceText.text = formatMoney(finalBalance);
          host.winText.style.fill = 0xffffff;
          host.balanceText.style.fill = 0xffffff;
          resolve();
        },
      });
      timeline
        .to(displayedWin, {
          value: totalWin,
          duration: 0.2,
          ease: 'none',
          onUpdate: () => {
            host.winText.text = formatMoney(displayedWin.value);
          },
        }, 0)
        .to(host.winText.scale, {
          x: 1.07,
          y: 1.07,
          duration: 0.08,
          ease: 'power2.out',
        }, 0)
        .to(host.winText.scale, {
          x: 1,
          y: 1,
          duration: 0.12,
          ease: 'power2.inOut',
          onComplete: () => {
            host.winText.style.fill = 0xffffff;
            host.balanceText.style.fill = 0x62d98b;
          },
        })
        .to(displayedBalance, {
          value: finalBalance,
          duration: 0.2,
          ease: 'none',
          onUpdate: () => {
            host.balanceText.text = formatMoney(displayedBalance.value);
          },
        })
        .to(host.balanceText.scale, {
          x: 1.05,
          y: 1.05,
          duration: 0.08,
          ease: 'power2.out',
        }, '<')
        .to(host.balanceText.scale, {
          x: 1,
          y: 1,
          duration: 0.12,
          ease: 'power2.inOut',
        });
    });
  }

export async function animateMoneyBeat(
    text: Text,
    accentColor: number,
    peakScale: number,
  ): Promise<void> {
    gsap.killTweensOf(text.scale);
    text.scale.set(1);
    text.style.fill = accentColor;
    await new Promise<void>((resolve) => {
      const timeline = gsap.timeline({
        onComplete: () => {
          text.style.fill = 0xffffff;
          resolve();
        },
      });
      timeline
        .to(text.scale, {
          x: peakScale,
          y: peakScale,
          duration: 0.08,
          ease: 'power2.out',
        }, 0)
        .to(text.scale, {
          x: 1,
          y: 1,
          duration: 0.12,
          ease: 'power2.inOut',
        });
    });
  }

export function formatMoney(value: number): string {
    return `$${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

export function updateReplayHud(host: HudHost, 
    balance: number,
    bet: number,
    win: number,
  ): void {
    host.balanceLabel.text = 'BALANCE (REPLAY)';
    host.wagerLabel.text = 'WAGER (REPLAY)';
    host.winLabel.text = 'WIN (REPLAY)';
    host.balanceText.text = formatMoney(balance);
    host.betText.text = formatMoney(bet);
    host.winText.text = formatMoney(win);
  }

export function updateHud(host: HudHost, 
    balance: number,
    bet: number,
    win: number,
    activeIncrement: 1 | 5 | 25,
  ): void {
    host.balanceLabel.text = 'BALANCE';
    host.wagerLabel.text = 'WAGER';
    host.winLabel.text = 'WIN';
    host.balanceText.text =
      formatMoney(balance);
    host.betText.text =
      formatMoney(bet);
    host.winText.text =
      formatMoney(win);
    host.updateBetControls(
      balance,
      bet,
      activeIncrement,
    );
  }
