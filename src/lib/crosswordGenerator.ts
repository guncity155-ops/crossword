import { type PlacedWord, type Grid } from '../types';
import { BRIDGE_WORDS } from './bridgeWords';

const GRID_SIZE = 30;

// 교차 가능한 쌍 정보
interface Crossing {
  otherWord: string;
  myIdx: number;    // 내 단어의 몇 번째 음절
  theirIdx: number; // 상대 단어의 몇 번째 음절
}

// 단어 전체에 대한 교차 쌍 맵
type CrossingMap = Map<string, Crossing[]>;

// ─── 교차 쌍 사전 인덱싱 ──────────────────────────────────────────────

function buildCrossingMap(words: string[]): CrossingMap {
  const map: CrossingMap = new Map(words.map(w => [w, []]));

  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j < words.length; j++) {
      const w1 = words[i];
      const w2 = words[j];
      for (let ci = 0; ci < w1.length; ci++) {
        for (let cj = 0; cj < w2.length; cj++) {
          if (w1[ci] === w2[cj]) {
            map.get(w1)!.push({ otherWord: w2, myIdx: ci, theirIdx: cj });
            map.get(w2)!.push({ otherWord: w1, myIdx: cj, theirIdx: ci });
          }
        }
      }
    }
  }

  return map;
}

// ─── 그리드 유틸 ─────────────────────────────────────────────────────

function emptyGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
}

// ─── 배치 가능성 검사 ─────────────────────────────────────────────────

function canPlace(
  grid: Grid,
  word: string,
  row: number,
  col: number,
  dir: 'across' | 'down'
): boolean {
  const dr = dir === 'down' ? 1 : 0;
  const dc = dir === 'across' ? 1 : 0;
  const len = word.length;

  if (row < 0 || col < 0) return false;
  if (row + dr * (len - 1) >= GRID_SIZE) return false;
  if (col + dc * (len - 1) >= GRID_SIZE) return false;

  // 단어 앞뒤로 막힌 칸 없어야 함
  const pr = row - dr; const pc = col - dc;
  if (pr >= 0 && pc >= 0 && grid[pr]?.[pc] !== null) return false;
  const nr = row + dr * len; const nc = col + dc * len;
  if (nr < GRID_SIZE && nc < GRID_SIZE && grid[nr]?.[nc] !== null) return false;

  let intersections = 0;

  for (let i = 0; i < len; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    const cell = grid[r][c];

    if (cell !== null) {
      // 교차점: 글자가 같아야 함
      if (cell.letter !== word[i]) return false;
      intersections++;
    } else {
      // 빈 칸: 수직 방향 양옆에 다른 단어가 있으면 안 됨
      const s1r = r + dc; const s1c = c + dr;
      const s2r = r - dc; const s2c = c - dr;
      if (grid[s1r]?.[s1c] !== null && grid[s1r]?.[s1c] !== undefined) return false;
      if (grid[s2r]?.[s2c] !== null && grid[s2r]?.[s2c] !== undefined) return false;
    }
  }

  // 첫 번째 단어가 아닌 이상 반드시 교차점 있어야 함
  return intersections > 0;
}

// ─── 단어 실제 배치 ───────────────────────────────────────────────────

function doPlace(
  grid: Grid,
  word: string,
  row: number,
  col: number,
  dir: 'across' | 'down',
  clue: string
): PlacedWord {
  const dr = dir === 'down' ? 1 : 0;
  const dc = dir === 'across' ? 1 : 0;

  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (grid[r][c] === null) {
      grid[r][c] = { letter: word[i], across: null, down: null, isStart: false };
    }
    if (dir === 'across') grid[r][c]!.across = 0;
    else grid[r][c]!.down = 0;
  }

  return { word, clue, row, col, direction: dir, number: 0 };
}

// ─── 교차점 기반 위치 계산 후 배치 시도 ─────────────────────────────

function tryPlaceViaCrossing(
  grid: Grid,
  word: string,
  clue: string,
  wordIdx: number,    // 내 단어에서 교차할 음절 인덱스
  crossR: number,     // 교차점 행
  crossC: number,     // 교차점 열
  dir: 'across' | 'down'
): PlacedWord | null {
  const dr = dir === 'down' ? 1 : 0;
  const dc = dir === 'across' ? 1 : 0;
  const startR = crossR - dr * wordIdx;
  const startC = crossC - dc * wordIdx;

  if (canPlace(grid, word, startR, startC, dir)) {
    return doPlace(grid, word, startR, startC, dir, clue);
  }
  return null;
}

// ─── 트리밍 & 번호 부여 ───────────────────────────────────────────────

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
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const numGrid: (number | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      if (!cell) continue;
      const isAcrossStart = (c === 0 || !grid[r][c - 1]) && c + 1 < cols && grid[r][c + 1];
      const isDownStart = (r === 0 || !grid[r - 1]?.[c]) && r + 1 < rows && grid[r + 1]?.[c];
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

// ─── 메인 생성 함수 ───────────────────────────────────────────────────

export interface GenerateResult {
  grid: Grid;
  placed: PlacedWord[];
  skipped: string[];   // 교차점 없어 배치 못한 단어
  rows: number;
  cols: number;
}

export function generateCrossword(entries: { word: string; clue: string }[]): GenerateResult {
  const clueMap = new Map(entries.map(e => [e.word, e.clue || e.word]));
  const words = entries.map(e => e.word);

  // 브릿지 후보: 입력 단어와 교차 가능한 것만 추려서 풀에 추가
  const bridgeCandidates = BRIDGE_WORDS.filter(b =>
    !clueMap.has(b.word) &&
    words.some(w => [...w].some(ch => b.word.includes(ch)))
  );

  const allWords = [...words, ...bridgeCandidates.map(b => b.word)];
  bridgeCandidates.forEach(b => clueMap.set(b.word, b.clue));

  // 교차 쌍 인덱싱
  const crossingMap = buildCrossingMap(allWords);

  // 앵커: 입력 단어 중 교차 가능 쌍이 가장 많은 단어
  const anchor = [...words].sort(
    (a, b) => (crossingMap.get(b)?.length ?? 0) - (crossingMap.get(a)?.length ?? 0)
  )[0];

  const grid = emptyGrid();
  const placed: PlacedWord[] = [];
  const placedSet = new Set<string>();

  // 앵커 배치 (중앙 가로)
  const anchorRow = Math.floor(GRID_SIZE / 2);
  const anchorCol = Math.floor((GRID_SIZE - anchor.length) / 2);
  placed.push(doPlace(grid, anchor, anchorRow, anchorCol, 'across', clueMap.get(anchor)!));
  placedSet.add(anchor);

  // 배치 대기열: 입력 단어 우선, 그 다음 브릿지
  const queue = [
    ...words.filter(w => w !== anchor),
    ...bridgeCandidates.map(b => b.word),
  ];

  // 교차 가능 쌍 수 기준으로 정렬 (연결성 높은 단어 먼저)
  queue.sort((a, b) => (crossingMap.get(b)?.length ?? 0) - (crossingMap.get(a)?.length ?? 0));

  // 여러 패스 시도 (이전 패스에서 새로 배치된 단어가 다음 단어의 앵커가 될 수 있음)
  for (let pass = 0; pass < 4; pass++) {
    let progress = false;

    for (let qi = queue.length - 1; qi >= 0; qi--) {
      const word = queue[qi];
      if (placedSet.has(word)) { queue.splice(qi, 1); continue; }

      const crossings = crossingMap.get(word) ?? [];
      let placed_ = false;

      for (const cx of crossings) {
        if (!placedSet.has(cx.otherWord)) continue;

        // 상대 단어의 theirIdx 번째 음절의 실제 그리드 좌표 계산
        const partner = placed.find(p => p.word === cx.otherWord)!;
        const crossR = partner.direction === 'down'
          ? partner.row + cx.theirIdx
          : partner.row;
        const crossC = partner.direction === 'across'
          ? partner.col + cx.theirIdx
          : partner.col;

        // 상대와 수직 방향으로 배치 시도
        const dir = partner.direction === 'across' ? 'down' : 'across';
        const result = tryPlaceViaCrossing(grid, word, clueMap.get(word)!, cx.myIdx, crossR, crossC, dir);

        if (result) {
          placed.push(result);
          placedSet.add(word);
          queue.splice(qi, 1);
          placed_ = true;
          progress = true;
          break;
        }
      }

      // 같은 방향 교차도 시도 (다른 위치에서 만나는 경우)
      if (!placed_) {
        for (const cx of crossings) {
          if (!placedSet.has(cx.otherWord)) continue;
          const partner = placed.find(p => p.word === cx.otherWord)!;
          const crossR = partner.direction === 'down'
            ? partner.row + cx.theirIdx
            : partner.row;
          const crossC = partner.direction === 'across'
            ? partner.col + cx.theirIdx
            : partner.col;

          // 같은 방향도 시도 (T자 배치가 아닌 ㄱ자 이어붙임 방지를 위해 검사 통과해야)
          const result = tryPlaceViaCrossing(
            grid, word, clueMap.get(word)!, cx.myIdx, crossR, crossC, partner.direction
          );
          if (result) {
            placed.push(result);
            placedSet.add(word);
            queue.splice(qi, 1);
            progress = true;
            break;
          }
        }
      }
    }

    if (!progress) break;
  }

  // 배치 실패한 입력 단어 목록
  const skipped = words.filter(w => !placedSet.has(w));

  // 브릿지 단어는 placed에서 제외하지 않음 (힌트로 활용)
  const { grid: trimmed, placed: trimmedPlaced } = trimGrid(grid, placed);
  const numberedPlaced = assignNumbers(trimmed, trimmedPlaced);

  return {
    grid: trimmed,
    placed: numberedPlaced,
    skipped,
    rows: trimmed.length,
    cols: trimmed[0]?.length ?? 0,
  };
}

// 디버그: 교차 가능 쌍 목록 반환 (UI에서 활용 가능)
export function debugCrossings(words: string[]): { w1: string; w1Idx: number; w2: string; w2Idx: number }[] {
  const results: { w1: string; w1Idx: number; w2: string; w2Idx: number }[] = [];
  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j < words.length; j++) {
      const w1 = words[i]; const w2 = words[j];
      for (let ci = 0; ci < w1.length; ci++) {
        for (let cj = 0; cj < w2.length; cj++) {
          if (w1[ci] === w2[cj]) results.push({ w1, w1Idx: ci, w2, w2Idx: cj });
        }
      }
    }
  }
  return results;
}
