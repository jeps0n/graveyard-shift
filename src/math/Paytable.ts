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
  coffee: {
    label: 'COFFEE',
    payoutMultipliers: { 3: 1, 4: 2, 5: 5 },
  },
  burger: {
    label: 'BURGER',
    payoutMultipliers: { 3: 1.5, 4: 3, 5: 8 },
  },
  gas: {
    label: 'GAS',
    payoutMultipliers: { 3: 2, 4: 4, 5: 10 },
  },
  chip: {
    label: 'CHIP',
    payoutMultipliers: { 3: 2.5, 4: 5, 5: 12 },
  },
  dice: {
    label: 'DICE',
    payoutMultipliers: { 3: 3, 4: 7, 5: 15 },
  },
  zed: {
    label: 'ZED',
    payoutMultipliers: { 3: 5, 4: 12, 5: 30 },
  },
  gary: {
    label: 'GARY',
    payoutMultipliers: { 3: 5, 4: 12, 5: 30 },
  },
  barkley: {
    label: 'BARKLEY',
    payoutMultipliers: { 3: 8, 4: 20, 5: 40 },
  },
  victor: {
    label: 'VICTOR',
    payoutMultipliers: { 3: 10, 4: 25, 5: 50 },
  },
  marge: {
    label: 'MARGE',
    payoutMultipliers: { 3: 5, 4: 12, 5: 30 },
  },
  scatter: {
    label: 'MIDNIGHT',
    payoutMultipliers: { 3: 0, 4: 0, 5: 0 },
  },
};