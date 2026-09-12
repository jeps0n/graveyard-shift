import type { SymbolId } from '../game/types';
export interface SymbolPresentation {
  readonly main: number;
  readonly background: number;
}
export const SYMBOL_PRESENTATION: Record<SymbolId, SymbolPresentation> = {
  marge: { main: 0x36b8d4, background: 0xe5f5f8 },
  barkley: { main: 0xd99024, background: 0xfaf0de },
  zed: { main: 0xa8ad32, background: 0xf3f4df },
  gary: { main: 0xc84632, background: 0xf8e7e4 },
  victor: { main: 0x9b4bc4, background: 0xf2e7f7 },
  coffee: { main: 0xb98b5b, background: 0xf5eee7 },
  burger: { main: 0xe5a83b, background: 0xfbf1dd },
  gas: { main: 0xd65332, background: 0xf9e9e5 },
  chip: { main: 0xd94336, background: 0xfae7e5 },
  dice: { main: 0xe95b9d, background: 0xfbe8f1 },
  scatter: { main: 0x8b5cf6, background: 0xfaf6e3 },
};
