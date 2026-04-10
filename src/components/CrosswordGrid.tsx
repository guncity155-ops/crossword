import { useRef, useState, useCallback } from 'react';
import type { Grid, PlacedWord } from '../types';

interface Props {
  grid: Grid;
  placed?: PlacedWord[];
  showAnswers: boolean;
}

// 셀 색상 결정
function getCellBg(across: number | null, down: number | null): string {
  const hasAcross = across !== null;
  const hasDown = down !== null;
  if (hasAcross && hasDown) return 'bg-[#B8E8A0]'; // 교차점 — 연두
  if (hasAcross) return 'bg-[#87CEEB]';             // 가로 — 하늘
  if (hasDown) return 'bg-[#FFF44F]';               // 세로 — 레몬
  return 'bg-white';
}

export default function CrosswordGrid({ grid, showAnswers }: Props) {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  const [userInput, setUserInput] = useState<Record<string, string>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const key = (r: number, c: number) => `${r}-${c}`;

  const handleInput = useCallback((r: number, c: number, val: string) => {
    const char = val.slice(-1);
    setUserInput(prev => ({ ...prev, [key(r, c)]: char }));

    // 다음 칸으로 포커스 이동 (가로 우선)
    const cell = grid[r][c];
    if (cell?.across !== null) {
      inputRefs.current[key(r, c + 1)]?.focus();
    } else if (cell?.down !== null) {
      inputRefs.current[key(r + 1, c)]?.focus();
    }
  }, [grid]);

  return (
    <div className="overflow-auto">
      <div
        className="inline-grid border border-gray-300"
        style={{ gridTemplateColumns: `repeat(${cols}, 2rem)` }}
      >
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => {
            const cell = grid[r][c];
            if (cell === null) {
              return (
                <div
                  key={key(r, c)}
                  className="w-8 h-8 bg-gray-800 border border-gray-700"
                />
              );
            }

            const bg = getCellBg(cell.across, cell.down);

            return (
              <div key={key(r, c)} className={`w-8 h-8 relative border border-gray-300 ${bg}`}>
                {cell.isStart && cell.startNumber && (
                  <span className="absolute top-0 left-0 text-[8px] leading-none text-gray-600 pl-[2px] pt-[1px] font-semibold z-10">
                    {cell.startNumber}
                  </span>
                )}
                {showAnswers ? (
                  <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-800">
                    {cell.letter}
                  </div>
                ) : (
                  <input
                    ref={el => { inputRefs.current[key(r, c)] = el; }}
                    type="text"
                    maxLength={2}
                    value={userInput[key(r, c)] ?? ''}
                    onChange={e => handleInput(r, c, e.target.value)}
                    className={`w-full h-full text-center text-sm font-bold bg-transparent focus:outline-none focus:ring-1 focus:ring-sky-400 uppercase caret-transparent ${
                      userInput[key(r, c)] !== undefined
                        ? userInput[key(r, c)] === cell.letter
                          ? 'text-green-600'
                          : 'text-red-500'
                        : 'text-gray-800'
                    }`}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
