export type SymbolId =
  | 'coffee'
  | 'burger'
  | 'gas'
  | 'chip'
  | 'dice'
  | 'zed'
  | 'gary'
  | 'barkley'
  | 'victor'
  | 'marge'
  | 'scatter';

export type ReelGrid = SymbolId[][];

export interface WinResult {
  symbol: SymbolId;
  count: 3 | 4 | 5;
  amount: number;
  payline: number;
}

export interface GameResult {
  grid: ReelGrid;
  wins: WinResult[];
  totalWin: number;
}