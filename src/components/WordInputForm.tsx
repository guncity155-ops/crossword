import { useState } from 'react';
import type { WordEntry } from '../types';

interface Props {
  onGenerate: (entries: WordEntry[]) => void;
}

const EMPTY_ENTRY = (): WordEntry => ({ word: '', clue: '' });

export default function WordInputForm({ onGenerate }: Props) {
  const [entries, setEntries] = useState<WordEntry[]>(
    Array.from({ length: 20 }, EMPTY_ENTRY)
  );

  const update = (index: number, field: keyof WordEntry, value: string) => {
    setEntries(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valid = entries.filter(e => e.word.trim().length > 0);
    if (valid.length < 2) {
      alert('최소 2개 이상의 단어를 입력해주세요.');
      return;
    }
    onGenerate(valid.map(e => ({ word: e.word.trim(), clue: e.clue.trim() || e.word.trim() })));
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-2 tracking-tight">
          crossword
        </h1>
        <p className="text-center text-gray-500 mb-8 text-sm">단어와 힌트를 입력하고 십자말풀이를 생성하세요</p>

        <form onSubmit={handleSubmit}>
          <div className="bg-gray-50 rounded-2xl p-4 mb-6">
            <div className="grid grid-cols-[2rem_1fr_1fr] gap-2 mb-2 px-2">
              <span />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">단어</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">힌트 (선택)</span>
            </div>
            {entries.map((entry, i) => (
              <div key={i} className="grid grid-cols-[2rem_1fr_1fr] gap-2 mb-2 items-center">
                <span className="text-xs text-gray-400 text-right pr-1">{i + 1}</span>
                <input
                  type="text"
                  value={entry.word}
                  onChange={e => update(i, 'word', e.target.value)}
                  placeholder="단어"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400 bg-white"
                />
                <input
                  type="text"
                  value={entry.clue}
                  onChange={e => update(i, 'clue', e.target.value)}
                  placeholder="힌트 (비워두면 단어 그대로)"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400 bg-white"
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="w-full bg-sky-400 hover:bg-sky-500 text-white font-semibold py-3 rounded-xl transition-colors text-base"
          >
            십자말풀이 생성
          </button>
        </form>
      </div>
    </div>
  );
}
