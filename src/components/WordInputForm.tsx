import { useState, useCallback } from 'react';
import type { WordEntry } from '../types';
import { fetchDefinitions } from '../lib/dictionaryApi';

interface Props {
  onGenerate: (entries: WordEntry[]) => void;
}

const EMPTY_ENTRY = (): WordEntry => ({ word: '', clue: '' });
const MAX_WORDS = 20;
const API_KEY_STORAGE = 'krdict_api_key';

export default function WordInputForm({ onGenerate }: Props) {
  const [entries, setEntries] = useState<WordEntry[]>(Array.from({ length: MAX_WORDS }, EMPTY_ENTRY));
  const [pasteText, setPasteText] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE) ?? '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchProgress, setFetchProgress] = useState(0);

  const update = useCallback((i: number, field: keyof WordEntry, value: string) => {
    setEntries(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e));
  }, []);

  // 붙여넣기 텍스트 파싱 (공백·쉼표·줄바꿈 구분)
  const handleParse = () => {
    const words = pasteText
      .split(/[\s,，、\n]+/)
      .map(w => w.trim())
      .filter(w => w.length > 0)
      .slice(0, MAX_WORDS);

    if (words.length === 0) return;

    setEntries(prev => {
      const next = [...prev];
      words.forEach((w, i) => { next[i] = { word: w, clue: next[i]?.clue ?? '' }; });
      return next;
    });
    setPasteText('');
  };

  // krdict API로 뜻 자동 검색
  const handleFetchClues = async () => {
    const words = entries.map(e => e.word.trim()).filter(Boolean);
    if (words.length === 0) { alert('단어를 먼저 입력해주세요.'); return; }
    if (!apiKey.trim()) { alert('국립국어원 API 키를 입력해주세요.'); setShowApiKey(true); return; }

    localStorage.setItem(API_KEY_STORAGE, apiKey.trim());
    setFetching(true);
    setFetchProgress(0);

    try {
      const defs = await fetchDefinitions(words, apiKey, (done, total) => {
        setFetchProgress(Math.round((done / total) * 100));
      });

      setEntries(prev => prev.map(e => {
        const def = defs[e.word.trim()];
        return def ? { ...e, clue: def } : e;
      }));
    } finally {
      setFetching(false);
      setFetchProgress(0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valid = entries.filter(e => e.word.trim().length > 0);
    if (valid.length < 2) { alert('최소 2개 이상의 단어를 입력해주세요.'); return; }
    onGenerate(valid.map(e => ({ word: e.word.trim(), clue: e.clue.trim() || e.word.trim() })));
  };

  const wordCount = entries.filter(e => e.word.trim()).length;

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-1 tracking-tight">crossword</h1>
        <p className="text-center text-gray-400 mb-8 text-sm">단어를 입력하고 십자말풀이를 자동 생성하세요</p>

        {/* 붙여넣기 영역 */}
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 mb-4">
          <label className="block text-xs font-semibold text-sky-700 mb-2 uppercase tracking-wide">
            단어 일괄 입력 (공백·쉼표·줄바꿈 구분)
          </label>
          <div className="flex gap-2">
            <textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder="예) 민주주의 헌법 권리 의무&#10;또는: 민주주의, 헌법, 권리, 의무"
              rows={3}
              className="flex-1 border border-sky-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-400 bg-white resize-none"
            />
            <button
              type="button"
              onClick={handleParse}
              className="px-4 bg-sky-400 hover:bg-sky-500 text-white rounded-xl text-sm font-semibold transition-colors self-stretch"
            >
              파싱
            </button>
          </div>
        </div>

        {/* API 키 설정 */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowApiKey(v => !v)}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            <span>{showApiKey ? '▲' : '▼'}</span>
            국립국어원 API 키 {apiKey ? '(설정됨)' : '(설정 안 됨 — 뜻 자동 검색 불가)'}
          </button>
          {showApiKey && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="API 키 입력 (krdict.korean.go.kr에서 발급)"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
              />
              <button
                type="button"
                onClick={() => { localStorage.setItem(API_KEY_STORAGE, apiKey.trim()); alert('저장됨'); }}
                className="px-3 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors"
              >
                저장
              </button>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {/* 단어/힌트 테이블 */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="grid grid-cols-[2rem_1fr_1fr] gap-2 flex-1">
                <span />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">단어</span>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">힌트 (선택)</span>
              </div>
              <span className="text-xs text-gray-400 ml-2 shrink-0">{wordCount}/{MAX_WORDS}</span>
            </div>

            {entries.map((entry, i) => (
              <div key={i} className="grid grid-cols-[2rem_1fr_1fr] gap-2 mb-1.5 items-center">
                <span className={`text-xs text-right pr-1 ${entry.word.trim() ? 'text-sky-500 font-semibold' : 'text-gray-300'}`}>
                  {i + 1}
                </span>
                <input
                  type="text"
                  value={entry.word}
                  onChange={e => update(i, 'word', e.target.value)}
                  placeholder="단어"
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-sky-400 bg-white"
                />
                <input
                  type="text"
                  value={entry.clue}
                  onChange={e => update(i, 'clue', e.target.value)}
                  placeholder="힌트 (비워두면 자동)"
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-sky-400 bg-white"
                />
              </div>
            ))}
          </div>

          {/* 뜻 자동 검색 버튼 */}
          <button
            type="button"
            onClick={handleFetchClues}
            disabled={fetching}
            className="w-full mb-3 border border-gray-200 hover:border-sky-300 text-gray-600 hover:text-sky-600 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            {fetching
              ? `뜻 검색 중... ${fetchProgress}%`
              : '사전에서 뜻 자동 검색 (API 키 필요)'}
          </button>

          {/* 생성 버튼 */}
          <button
            type="submit"
            className="w-full bg-sky-400 hover:bg-sky-500 text-white font-semibold py-3 rounded-xl transition-colors text-base"
          >
            십자말풀이 생성 {wordCount > 0 && `(${wordCount}개 단어)`}
          </button>
        </form>
      </div>
    </div>
  );
}
