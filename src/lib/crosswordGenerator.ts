import { type PlacedWord, type Grid } from '../types';
import { BRIDGE_WORDS } from './bridgeWords';

const GRID_SIZE = 30;

function emptyGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
}

function cloneGrid(grid: Grid): Grid {
  return grid.map(row => row.map(cell => (cell ? { ...cell } : null)));
}

// 단어를 격자에 놓을 수 있는지 검사 (intersect 필요 여부 옵션)
function canPlace(
  grid: Grid,
  word: string,
  row: number,
  col: number,
  direction: 'across' | 'down',
  requireIntersect = true
): boolean {
  const dr = direction === 'down' ? 1 : 0;
  const dc = direction === 'across' ? 1 : 0;
  const len = word.length;

  if (row < 0 || col < 0) return false;
  if (row + dr * (len - 1) >= GRID_SIZE) return false;
  if (col + dc * (len - 1) >= GRID_SIZE) return false;

  // 앞뒤 막힘 체크
  const pr = row - dr; const pc = col - dc;
  if (pr >= 0 && pc >= 0 && grid[pr][pc] !== null) return false;
  const nr = row + dr * len; const nc = col + dc * len;
  if (nr < GRID_SIZE && nc < GRID_SIZE && grid[nr][nc] !== null) return false;

  let intersections = 0;

  for (let i = 0; i < len; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    const cell = grid[r][c];

    if (cell !== null) {
      if (cell.letter !== word[i]) return false;
      intersections++;
    } else {
      // 수직 방향으로 인접한 칸에 다른 단어가 있으면 안 됨
      const s1r = r + dc; const s1c = c + dr;
      const s2r = r - dc; const s2c = c - dr;
      if (s1r >= 0 && s1r < GRID_SIZE && s1c >= 0 && s1c < GRID_SIZE && grid[s1r][s1c] !== null) return false;
      if (s2r >= 0 && s2r < GRID_SIZE && s2c >= 0 && s2c < GRID_SIZE && grid[s2r][s2c] !== null) return false;
    }
  }

  if (requireIntersect && intersections === 0) return false;
  return true;
}

function placeWord(
  grid: Grid,
  word: string,
  row: number,
  col: number,
  direction: 'across' | 'down',
  clue: string
): PlacedWord {
  const dr = direction === 'down' ? 1 : 0;
  const dc = direction === 'across' ? 1 : 0;

  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (grid[r][c] === null) {
      grid[r][c] = { letter: word[i], across: null, down: null, isStart: false };
    }
    if (direction === 'across') grid[r][c]!.across = 0;
    else grid[r][c]!.down = 0;
  }

  return { word, clue, row, col, direction, number: 0 };
}

// 격자 내 특정 단어와 교차 가능한 위치 목록 반환
function findIntersections(
  grid: Grid,
  word: string,
  direction: 'across' | 'down'
): { row: number; col: number }[] {
  const dr = direction === 'down' ? 1 : 0;
  const dc = direction === 'across' ? 1 : 0;
  const results: { row: number; col: number }[] = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === null) continue;
      const letter = grid[r][c]!.letter;
      for (let i = 0; i < word.length; i++) {
        if (word[i] === letter) {
          const sr = r - dr * i;
          const sc = c - dc * i;
          if (canPlace(grid, word, sr, sc, direction)) {
            results.push({ row: sr, col: sc });
          }
        }
      }
    }
  }

  return results;
}

// 중앙에 가까운 순서로 정렬
function sortByCenter(candidates: { row: number; col: number }[]): { row: number; col: number }[] {
  const c = GRID_SIZE / 2;
  return [...candidates].sort((a, b) =>
    Math.abs(a.row - c) + Math.abs(a.col - c) - (Math.abs(b.row - c) + Math.abs(b.col - c))
  );
}

// 단어를 격자에 배치 시도 (양방향). 성공하면 PlacedWord 반환
function tryPlaceWord(
  grid: Grid,
  word: string,
  clue: string,
  preferDir?: 'across' | 'down'
): PlacedWord | null {
  const dirs: ('across' | 'down')[] = preferDir
    ? [preferDir, preferDir === 'across' ? 'down' : 'across']
    : ['across', 'down'];

  for (const dir of dirs) {
    const candidates = sortByCenter(findIntersections(grid, word, dir));
    if (candidates.length > 0) {
      return placeWord(grid, word, candidates[0].row, candidates[0].col, dir, clue);
    }
  }
  return null;
}

// 브릿지 단어를 사용해 타겟 단어를 격자에 연결
function tryWithBridge(
  grid: Grid,
  target: string,
  targetClue: string,
  usedWords: Set<string>
): { bridgePlaced: PlacedWord; targetPlaced: PlacedWord } | null {
  // 브릿지 단어를 셔플 (다양성)
  const pool = [...BRIDGE_WORDS].sort(() => Math.random() - 0.5);

  for (const bridge of pool) {
    if (usedWords.has(bridge.word)) continue;
    // 브릿지가 타겟 단어와 공유 음절을 가지는지 확인
    const shares = [...bridge.word].some(ch => target.includes(ch));
    if (!shares) continue;

    // 브릿지를 기존 격자에 배치 시도
    for (const bDir of ['across', 'down'] as const) {
      const bCandidates = sortByCenter(findIntersections(grid, bridge.word, bDir));
      if (bCandidates.length === 0) continue;

      const tempGrid = cloneGrid(grid);
      const bridgePlaced = placeWord(tempGrid, bridge.word, bCandidates[0].row, bCandidates[0].col, bDir, bridge.clue);

      const tDir = bDir === 'across' ? 'down' : 'across';
      const tCandidates = sortByCenter(findIntersections(tempGrid, target, tDir));
      if (tCandidates.length > 0) {
        // 성공 — 실제 격자에 반영
        placeWord(grid, bridge.word, bCandidates[0].row, bCandidates[0].col, bDir, bridge.clue);
        const targetPlaced = placeWord(grid, target, tCandidates[0].row, tCandidates[0].col, tDir, targetClue);
        return { bridgePlaced, targetPlaced };
      }
    }
  }
  return null;
}

// 격자 내 빈 공간 찾기 (격리된 영역에 강제 배치용)
function findForcedPosition(
  grid: Grid,
  word: string,
  direction: 'across' | 'down'
): { row: number; col: number } | null {
  // 현재 격자 사용 범위 파악
  let maxR = 0; let maxC = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] !== null) { maxR = Math.max(maxR, r); maxC = Math.max(maxC, c); }
    }
  }

  // 기존 격자 아래 2칸 여백 두고 배치
  const startRow = direction === 'down' ? Math.min(maxR + 3, GRID_SIZE - word.length) : Math.min(maxR + 3, GRID_SIZE - 1);
  const startCol = direction === 'across' ? 1 : 1;

  if (startRow < 0 || startCol < 0) return null;
  if (!canPlace(grid, word, startRow, startCol, direction, false)) return null;
  return { row: startRow, col: startCol };
}

function trimGrid(grid: Grid, placed: PlacedWord[]): { grid: Grid; placed: PlacedWord[] } {
  let minR = GRID_SIZE, maxR = 0, minC = GRID_SIZE, maxC = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] !== null) {
        minR = Math.min(minR, r); maxR = Math.max(maxR, r);
        minC = Math.min(minC, c); maxC = Math.max(maxC, c);
      }
    }
  }
  const newGrid: Grid = Array.from(
    { length: maxR - minR + 1 },
    (_, r) => Array.from({ length: maxC - minC + 1 }, (_, c) => grid[r + minR][c + minC])
  );
  return {
    grid: newGrid,
    placed: placed.map(p => ({ ...p, row: p.row - minR, col: p.col - minC })),
  };
}

function assignNumbers(grid: Grid, placed: PlacedWord[]): PlacedWord[] {
  let num = 1;
  const rows = grid.length; const cols = grid[0]?.length ?? 0;
  const numGrid: (number | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      if (!cell) continue;
      const isAcrossStart = (c === 0 || !grid[r][c - 1]) && c + 1 < cols && grid[r][c + 1];
      const isDownStart = (r === 0 || !grid[r - 1][c]) && r + 1 < rows && grid[r + 1][c];
      if (isAcrossStart || isDownStart) {
        numGrid[r][c] = num;
        cell.startNumber = num;
        cell.isStart = true;
        num++;
      }
    }
  }

  return placed.map(p => ({ ...p, number: numGrid[p.row]?.[p.col] ?? 0 }));
}

export function generateCrossword(entries: { word: string; clue: string }[]): {
  grid: Grid;
  placed: PlacedWord[];
  rows: number;
  cols: number;
} {
  // 긴 단어 먼저
  const required = [...entries].sort((a, b) => b.word.length - a.word.length);
  const grid = emptyGrid();
  const placed: PlacedWord[] = [];
  const usedWords = new Set<string>();

  // 1. 첫 단어: 중앙 가로 배치
  const first = required[0];
  const startRow = Math.floor(GRID_SIZE / 2);
  const startCol = Math.floor((GRID_SIZE - first.word.length) / 2);
  placed.push(placeWord(grid, first.word, startRow, startCol, 'across', first.clue));
  usedWords.add(first.word);

  const unplaced: typeof required = [];

  // 2. 나머지 단어: 교차 배치 시도
  for (let i = 1; i < required.length; i++) {
    const entry = required[i];
    const preferDir: 'across' | 'down' = i % 2 === 0 ? 'across' : 'down';
    const result = tryPlaceWord(grid, entry.word, entry.clue, preferDir);
    if (result) {
      placed.push(result);
      usedWords.add(entry.word);
    } else {
      unplaced.push(entry);
    }
  }

  // 3. 미배치 단어: 브릿지 단어로 연결 시도
  const stillUnplaced: typeof required = [];
  for (const entry of unplaced) {
    const bridgeResult = tryWithBridge(grid, entry.word, entry.clue, usedWords);
    if (bridgeResult) {
      placed.push(bridgeResult.bridgePlaced);
      placed.push(bridgeResult.targetPlaced);
      usedWords.add(bridgeResult.bridgePlaced.word);
      usedWords.add(entry.word);
    } else {
      stillUnplaced.push(entry);
    }
  }

  // 4. 그래도 못 배치된 단어: 2차 브릿지 시도 (교차 후 재시도)
  const finalUnplaced: typeof required = [];
  for (const entry of stillUnplaced) {
    // 기존에 배치된 단어가 늘어났으므로 다시 직접 배치 시도
    const retry = tryPlaceWord(grid, entry.word, entry.clue);
    if (retry) {
      placed.push(retry);
      usedWords.add(entry.word);
    } else {
      const bridgeResult = tryWithBridge(grid, entry.word, entry.clue, usedWords);
      if (bridgeResult) {
        placed.push(bridgeResult.bridgePlaced);
        placed.push(bridgeResult.targetPlaced);
        usedWords.add(bridgeResult.bridgePlaced.word);
        usedWords.add(entry.word);
      } else {
        finalUnplaced.push(entry);
      }
    }
  }

  // 5. 최후 수단: 격자 아래 강제 배치 (고립되어도 배치)
  for (const entry of finalUnplaced) {
    for (const dir of ['across', 'down'] as const) {
      const pos = findForcedPosition(grid, entry.word, dir);
      if (pos) {
        placed.push(placeWord(grid, entry.word, pos.row, pos.col, dir, entry.clue));
        usedWords.add(entry.word);
        break;
      }
    }
  }

  const { grid: trimmed, placed: trimmedPlaced } = trimGrid(grid, placed);
  const numberedPlaced = assignNumbers(trimmed, trimmedPlaced);

  return {
    grid: trimmed,
    placed: numberedPlaced,
    rows: trimmed.length,
    cols: trimmed[0]?.length ?? 0,
  };
}
