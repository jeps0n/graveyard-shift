import { Assets } from 'pixi.js';
import type { SymbolId } from '../game/types';

export const SYMBOL_ASSET_URLS: Record<SymbolId, string> = {
  coffee: new URL('./symbols/coffee.png', import.meta.url).href,
  burger: new URL('./symbols/burger.png', import.meta.url).href,
  gas: new URL('./symbols/gas.png', import.meta.url).href,
  chip: new URL('./symbols/chip.png', import.meta.url).href,
  dice: new URL('./symbols/dice.png', import.meta.url).href,
  zed: new URL('./symbols/zed.png', import.meta.url).href,
  gary: new URL('./symbols/gary.png', import.meta.url).href,
  barkley: new URL('./symbols/barkley.png', import.meta.url).href,
  victor: new URL('./symbols/victor.png', import.meta.url).href,
  marge: new URL('./symbols/marge.png', import.meta.url).href,
  scatter: new URL('./symbols/scatter.png', import.meta.url).href,
};

export const REEL_CABINET_FRONT_URL =
  new URL('./cabinet/reelCabinetFront.png', import.meta.url).href;

export const CONTROL_DECK_FRONT_URL =
  new URL('./cabinet/controlDeckFront.png', import.meta.url).href;

export async function loadSymbolAssets(): Promise<void> {
  await Assets.load([
    ...Object.values(SYMBOL_ASSET_URLS),
    REEL_CABINET_FRONT_URL,
    CONTROL_DECK_FRONT_URL,
  ]);
}
