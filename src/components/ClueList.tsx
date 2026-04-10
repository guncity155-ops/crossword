import type { PlacedWord } from '../types';

interface Props {
  placed: PlacedWord[];
}

export default function ClueList({ placed }: Props) {
  const across = placed.filter(p => p.direction === 'across' && p.number > 0).sort((a, b) => a.number - b.number);
  const down = placed.filter(p => p.direction === 'down' && p.number > 0).sort((a, b) => a.number - b.number);

  return (
    <div className="grid grid-cols-2 gap-6 text-sm">
      <div>
        <h3 className="font-bold text-[#3AAFDB] mb-2 uppercase tracking-wide text-xs">가로 (Across)</h3>
        <ul className="space-y-1">
          {across.map(p => (
            <li key={`across-${p.number}`} className="flex gap-2">
              <span className="font-semibold text-sky-500 w-5 shrink-0">{p.number}.</span>
              <span className="text-gray-700">{p.clue}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="font-bold text-[#D4C800] mb-2 uppercase tracking-wide text-xs">세로 (Down)</h3>
        <ul className="space-y-1">
          {down.map(p => (
            <li key={`down-${p.number}`} className="flex gap-2">
              <span className="font-semibold text-yellow-500 w-5 shrink-0">{p.number}.</span>
              <span className="text-gray-700">{p.clue}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
