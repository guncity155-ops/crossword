import { useState } from 'react';
import type { WordEntry, Grid, PlacedWord } from './types';
import { generateCrossword } from './lib/crosswordGenerator';
import WordInputForm from './components/WordInputForm';
import CrosswordView from './components/CrosswordView';

type State =
  | { step: 'input' }
  | { step: 'result'; grid: Grid; placed: PlacedWord[]; skipped: string[]; rows: number; cols: number; entries: WordEntry[] };

export default function App() {
  const [state, setState] = useState<State>({ step: 'input' });

  const handleGenerate = (entries: WordEntry[]) => {
    const result = generateCrossword(entries);
    setState({ step: 'result', ...result, entries });
  };

  const handleReset = () => setState({ step: 'input' });

  if (state.step === 'result') {
    return (
      <CrosswordView
        grid={state.grid}
        placed={state.placed}
        skipped={state.skipped}
        rows={state.rows}
        cols={state.cols}
        entries={state.entries}
        onReset={handleReset}
      />
    );
  }

  return <WordInputForm onGenerate={handleGenerate} />;
}
