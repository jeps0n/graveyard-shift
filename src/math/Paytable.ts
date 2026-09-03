import type { SymbolId } from '../game/types';
export interface SymbolPaytable {
  label: string;
  payouts: {
    3: number;
    4: number;
    5: number;
  };
}
export const PAYTABLE: Record<SymbolId, SymbolPaytable> = {
  coffee: {
    label: 'COFFEE',
    payouts: { 3: 1, 4: 2, 5: 5 },
  },
  burger: {
    label: 'BURGER',
    payouts: { 3: 1.5, 4: 3, 5: 8 },
  },
  gas: {
    label: 'GAS',
    payouts: { 3: 2, 4: 4, 5: 10 },
  },
  chip: {
    label: 'CHIP',
    payouts: { 3: 2.5, 4: 5, 5: 12 },
  },
  dice: {
    label: 'DICE',
    payouts: { 3: 3, 4: 7, 5: 15 },
  },
  zed: {
    label: 'ZED',
    payouts: { 3: 5, 4: 12, 5: 30 },
  },
  gary: {
    label: 'GARY',
    payouts: { 3: 5, 4: 12, 5: 30 },
  },
  barkley: {
    label: 'BARKLEY',
    payouts: { 3: 8, 4: 20, 5: 40 },
  },
  victor: {
    label: 'VICTOR',
    payouts: { 3: 10, 4: 25, 5: 50 },
  },
  marge: {
    label: 'MARGE',
    payouts: { 3: 5, 4: 12, 5: 30 },
  },
  scatter: {
    label: 'MIDNIGHT',
    payouts: { 3: 0, 4: 0, 5: 0 },
  },
};