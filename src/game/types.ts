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
export type GameState =
  | 'IDLE'
  | 'SPINNING'
  | 'EVALUATING'
  | 'WIN_PRESENTATION'
  | 'CASCADING';
export interface WinPosition {
  reel: number;
  row: number;
}
export interface WinResult {
  symbol: SymbolId;
  count: 3 | 4 | 5;
  amount: number;
  payline: number;
  positions: WinPosition[];
}
export interface GameResult {
  grid: ReelGrid;
  wins: WinResult[];
  totalWin: number;
}