export type Direction = 'across' | 'down';

export interface WordEntry {
  word: string;
  clue: string;
}

export interface PlacedWord {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: Direction;
  number: number;
}

export interface Cell {
  letter: string;
  across: number | null;  // clue number for across word
  down: number | null;    // clue number for down word
  isStart: boolean;
  startNumber?: number;
}

export type Grid = (Cell | null)[][];
