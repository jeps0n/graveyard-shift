import type { SymbolId } from '../game/types';
export interface SymbolPaytable {
  label: string;
  payoutMultipliers: {
    3: number;
    4: number;
    5: number;
  };
}
export const PAYTABLE: Record<SymbolId, SymbolPaytable> = {
  coffee: { label: 'COFFEE', payoutMultipliers: { 3: 1, 4: 2, 5: 4 } },
  burger: { label: 'BURGER', payoutMultipliers: { 3: 1.5, 4: 3, 5: 6 } },
  gas: { label: 'GAS', payoutMultipliers: { 3: 2, 4: 4, 5: 8 } },
  chip: { label: 'CHIP', payoutMultipliers: { 3: 3, 4: 6, 5: 12 } },
  dice: { label: 'DICE', payoutMultipliers: { 3: 4, 4: 8, 5: 16 } },
  zed: { label: 'ZED', payoutMultipliers: { 3: 7.5, 4: 15, 5: 30 } },
  gary: { label: 'GARY', payoutMultipliers: { 3: 8.5, 4: 17, 5: 34 } },
  barkley: { label: 'BARKLEY', payoutMultipliers: { 3: 10, 4: 20, 5: 40 } },
  victor: { label: 'VICTOR', payoutMultipliers: { 3: 12, 4: 24, 5: 48 } },
  marge: { label: 'MARGE', payoutMultipliers: { 3: 25, 4: 50, 5: 100 } },
  scatter: { label: 'MIDNIGHT', payoutMultipliers: { 3: 0, 4: 0, 5: 0 } },
};
