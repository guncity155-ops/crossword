import { type PlacedWord, type Grid } from '../types';
import { ELEMENTARY_WORDS } from './elementaryWords';

const GRID_SIZE = 25;

function emptyGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
}

function canPlace(
  grid: Grid,
  word: string,
  row: number,
  col: number,
  direction: 'across' | 'down'
): boolean {
  const dr = direction === 'down' ? 1 : 0;
  const dc = direction === 'across' ? 1 : 0;
  const len = word.length;

  // 범위 체크
  if (row + dr * (len - 1) >= GRID_SIZE) return false;
  if (col + dc * (len - 1) >= GRID_SIZE) return false;
  if (row < 0 || col < 0) return false;

  // 앞쪽 막힘 체크
  const prevR = row - dr;
  const prevC = col - dc;
  if (prevR >= 0 && prevC >= 0 && grid[prevR][prevC] !== null) return false;

  // 뒤쪽 막힘 체크
  const nextR = row + dr * len;
  const nextC = col + dc * len;
  if (nextR < GRID_SIZE && nextC < GRID_SIZE && grid[nextR][nextC] !== null) return false;

  let hasIntersection = false;

  for (let i = 0; i < len; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    const cell = grid[r][c];

    if (cell !== null) {
      // 이미 채워진 칸 — 같은 글자여야 교차 가능
      if (cell.letter !== word[i]) return false;
      hasIntersection = true;
    } else {
      // 빈 칸 — 옆에 다른 단어가 있으면 안 됨 (같은 방향 기준)
      const sideR1 = r + dc; // across면 위아래, down이면 좌우
      const sideC1 = c + dr;
      const sideR2 = r - dc;
      const sideC2 = c - dr;
      if (sideR1 >= 0 && sideR1 < GRID_SIZE && sideC1 >= 0 && sideC1 < GRID_SIZE && grid[sideR1][sideC1] !== null) return false;
      if (sideR2 >= 0 && sideR2 < GRID_SIZE && sideC2 >= 0 && sideC2 < GRID_SIZE && grid[sideR2][sideC2] !== null) return false;
    }
  }

  return hasIntersection;
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
      grid[r][c] = {
        letter: word[i],
        across: direction === 'across' ? 0 : null,
        down: direction === 'down' ? 0 : null,
        isStart: false,
      };
    } else {
      // 교차점 — 두 방향 모두 표시
      if (direction === 'across') grid[r][c]!.across = 0;
      if (direction === 'down') grid[r][c]!.down = 0;
    }
  }

  return { word, clue, row, col, direction, number: 0 };
}

function findIntersections(
  grid: Grid,
  word: string,
  direction: 'across' | 'down'
): { row: number; col: number }[] {
  const results: { row: number; col: number }[] = [];
  const dr = direction === 'down' ? 1 : 0;
  const dc = direction === 'across' ? 1 : 0;

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = grid[r][c];
      if (cell === null) continue;
      // 이미 배치된 단어와 교차 가능한 지점 찾기
      const letter = cell.letter;
      for (let i = 0; i < word.length; i++) {
        if (word[i] === letter) {
          const startR = r - dr * i;
          const startC = c - dc * i;
          if (canPlace(grid, word, startR, startC, direction)) {
            results.push({ row: startR, col: startC });
          }
        }
      }
    }
  }

  return results;
}

function trimGrid(grid: Grid, placed: PlacedWord[]): { grid: Grid; placed: PlacedWord[] } {
  let minR = GRID_SIZE, maxR = 0, minC = GRID_SIZE, maxC = 0;

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] !== null) {
        minR = Math.min(minR, r);
        maxR = Math.max(maxR, r);
        minC = Math.min(minC, c);
        maxC = Math.max(maxC, c);
      }
    }
  }

  const newGrid: Grid = Array.from(
    { length: maxR - minR + 1 },
    (_, r) => Array.from({ length: maxC - minC + 1 }, (_, c) => grid[r + minR][c + minC])
  );

  const newPlaced = placed.map(p => ({
    ...p,
    row: p.row - minR,
    col: p.col - minC,
  }));

  return { grid: newGrid, placed: newPlaced };
}

function assignNumbers(grid: Grid, placed: PlacedWord[]): PlacedWord[] {
  let num = 1;
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  const numberedGrid: (number | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      if (cell === null) continue;

      const isAcrossStart =
        (c === 0 || grid[r][c - 1] === null) &&
        c + 1 < cols && grid[r][c + 1] !== null;

      const isDownStart =
        (r === 0 || grid[r - 1][c] === null) &&
        r + 1 < rows && grid[r + 1][c] !== null;

      if (isAcrossStart || isDownStart) {
        numberedGrid[r][c] = num;
        cell.startNumber = num;
        cell.isStart = true;
        num++;
      }
    }
  }

  return placed.map(p => ({
    ...p,
    number: numberedGrid[p.row][p.col] ?? 0,
  }));
}

export function generateCrossword(entries: { word: string; clue: string }[]): {
  grid: Grid;
  placed: PlacedWord[];
  rows: number;
  cols: number;
} {
  const sortedEntries = [...entries].sort((a, b) => b.word.length - a.word.length);

  const grid = emptyGrid();
  const placed: PlacedWord[] = [];

  // 첫 단어를 중앙에 가로로 배치
  const first = sortedEntries[0];
  const startRow = Math.floor(GRID_SIZE / 2);
  const startCol = Math.floor((GRID_SIZE - first.word.length) / 2);
  placed.push(placeWord(grid, first.word, startRow, startCol, 'across', first.clue));

  const unplaced: typeof sortedEntries = [];

  // 나머지 단어들 배치 시도
  for (let i = 1; i < sortedEntries.length; i++) {
    const entry = sortedEntries[i];
    const directions: ('across' | 'down')[] = i % 2 === 0 ? ['across', 'down'] : ['down', 'across'];

    let success = false;
    for (const dir of directions) {
      const candidates = findIntersections(grid, entry.word, dir);
      if (candidates.length > 0) {
        // 중앙에 가까운 후보 선택
        const center = GRID_SIZE / 2;
        candidates.sort((a, b) =>
          Math.abs(a.row - center) + Math.abs(a.col - center) -
          (Math.abs(b.row - center) + Math.abs(b.col - center))
        );
        placed.push(placeWord(grid, entry.word, candidates[0].row, candidates[0].col, dir, entry.clue));
        success = true;
        break;
      }
    }

    if (!success) {
      unplaced.push(entry);
    }
  }

  // 연결 안 된 단어들 → 초등 어휘로 브릿지 시도
  const bridgeAttempts = [...ELEMENTARY_WORDS];
  for (const entry of unplaced) {
    let placed_ = false;

    // 브릿지 단어 중에 현재 단어와 공유 글자 있는 것 찾기
    for (const bridge of bridgeAttempts) {
      if (placed.some(p => p.word === bridge.word)) continue;

      // 브릿지를 먼저 배치하고, 그 다음 원래 단어 배치 시도
      for (const bridgeDir of ['across', 'down'] as const) {
        const bridgeCandidates = findIntersections(grid, bridge.word, bridgeDir);
        if (bridgeCandidates.length === 0) continue;

        // 임시로 브릿지 배치
        const tempGrid = grid.map(row => row.map(cell => cell ? { ...cell } : null));
        placeWord(tempGrid as Grid, bridge.word, bridgeCandidates[0].row, bridgeCandidates[0].col, bridgeDir, bridge.clue);

        const targetDir = bridgeDir === 'across' ? 'down' : 'across';
        const targetCandidates = findIntersections(tempGrid as Grid, entry.word, targetDir);
        if (targetCandidates.length > 0) {
          // 브릿지 확정 배치
          placed.push(placeWord(grid, bridge.word, bridgeCandidates[0].row, bridgeCandidates[0].col, bridgeDir, bridge.clue));
          placed.push(placeWord(grid, entry.word, targetCandidates[0].row, targetCandidates[0].col, targetDir, entry.clue));
          placed_ = true;
          break;
        }
      }
      if (placed_) break;
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
