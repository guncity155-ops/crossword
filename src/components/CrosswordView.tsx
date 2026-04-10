import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { Grid, PlacedWord, WordEntry } from '../types';
import CrosswordGrid from './CrosswordGrid';
import ClueList from './ClueList';

interface Props {
  grid: Grid;
  placed: PlacedWord[];
  skipped: string[];
  rows: number;
  cols: number;
  onReset: () => void;
  entries: WordEntry[];
}

export default function CrosswordView({ grid, placed, skipped, onReset }: Props) {
  const [showAnswers, setShowAnswers] = useState(false);
  const puzzleRef = useRef<HTMLDivElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);

  const exportImage = async (format: 'png' | 'jpg') => {
    const target = showAnswers ? answerRef.current : puzzleRef.current;
    if (!target) return;
    const canvas = await html2canvas(target, { backgroundColor: '#ffffff', scale: 2 });
    const link = document.createElement('a');
    link.download = `crossword.${format}`;
    link.href = canvas.toDataURL(format === 'png' ? 'image/png' : 'image/jpeg', 0.95);
    link.click();
  };

  const exportPdf = async () => {
    const puzzleCanvas = await html2canvas(puzzleRef.current!, { backgroundColor: '#ffffff', scale: 2 });
    const answerCanvas = await html2canvas(answerRef.current!, { backgroundColor: '#ffffff', scale: 2 });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    const addCanvasToPdf = (canvas: HTMLCanvasElement) => {
      const ratio = canvas.width / canvas.height;
      let w = pageW - 20;
      let h = w / ratio;
      if (h > pageH - 20) { h = pageH - 20; w = h * ratio; }
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (pageW - w) / 2, 10, w, h);
    };

    addCanvasToPdf(puzzleCanvas);
    pdf.addPage();
    pdf.text('답지', pageW / 2, 8, { align: 'center' });
    addCanvasToPdf(answerCanvas);
    pdf.save('crossword.pdf');
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">crossword</h1>
          <button onClick={onReset} className="text-sm text-gray-400 hover:text-gray-600 underline">
            다시 만들기
          </button>
        </div>

        {/* 퍼즐 (내보내기용 숨김 포함) */}
        <div className="mb-6">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setShowAnswers(false)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                !showAnswers ? 'bg-sky-400 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              퍼즐
            </button>
            <button
              onClick={() => setShowAnswers(true)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                showAnswers ? 'bg-[#B8E8A0] text-gray-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              답지
            </button>
          </div>

          {/* 화면에 표시되는 뷰 */}
          <div className="flex flex-col gap-6">
            <CrosswordGrid grid={grid} placed={placed} showAnswers={showAnswers} />
            <ClueList placed={placed} />
          </div>
        </div>

        {/* 내보내기용 숨겨진 렌더링 (항상 렌더링, 화면엔 안 보임) */}
        <div className="absolute -left-[9999px] -top-[9999px]">
          <div ref={puzzleRef} className="p-6 bg-white w-[700px]">
            <h2 className="text-2xl font-bold text-center mb-4 text-gray-800">crossword</h2>
            <div className="flex flex-col items-center gap-6">
              <CrosswordGrid grid={grid} placed={placed} showAnswers={false} />
              <ClueList placed={placed} />
            </div>
          </div>
          <div ref={answerRef} className="p-6 bg-white w-[700px]">
            <h2 className="text-2xl font-bold text-center mb-4 text-gray-800">crossword — 답지</h2>
            <div className="flex flex-col items-center gap-6">
              <CrosswordGrid grid={grid} placed={placed} showAnswers={true} />
              <ClueList placed={placed} />
            </div>
          </div>
        </div>

        {/* 배치 실패 단어 안내 */}
        {skipped.length > 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
            <p className="font-semibold text-amber-700 mb-1">
              교차점 없어 배치 못한 단어 ({skipped.length}개)
            </p>
            <p className="text-amber-600 text-xs">
              {skipped.join(' · ')}
            </p>
            <p className="text-amber-500 text-xs mt-1">
              다른 입력 단어와 공유하는 음절이 없어요. 단어를 바꾸거나 추가해보세요.
            </p>
          </div>
        )}

        {/* 내보내기 버튼 */}
        <div className="flex flex-wrap gap-3 mt-4">
          <button
            onClick={() => exportImage('png')}
            className="flex-1 min-w-[100px] bg-gray-800 hover:bg-gray-900 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            PNG 저장
          </button>
          <button
            onClick={() => exportImage('jpg')}
            className="flex-1 min-w-[100px] bg-gray-600 hover:bg-gray-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            JPG 저장
          </button>
          <button
            onClick={exportPdf}
            className="flex-1 min-w-[100px] bg-sky-500 hover:bg-sky-600 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            PDF 저장 (퍼즐+답지)
          </button>
        </div>
      </div>
    </div>
  );
}
