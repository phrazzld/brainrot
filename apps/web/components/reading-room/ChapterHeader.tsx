'use client';

import Link from 'next/link';

import { Translation } from '@/utils/types';

interface ChapterHeaderProps {
  translation: Translation;
  chapterIndex: number;
  totalChapters: number;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  onOpenShareModal: () => void;
}

/**
 * Header component for displaying chapter title and navigation controls.
 * @param props - The component props.
 */
export default function ChapterHeader(props: ChapterHeaderProps) {
  const {
    translation,
    chapterIndex,
    totalChapters,
    onPrevChapter,
    onNextChapter,
    onOpenShareModal,
  } = props;

  // Calculate reading progress percentage
  const progressPercent = ((chapterIndex + 1) / totalChapters) * 100;

  return (
    <header className="bg-black/40 backdrop-blur-md">
      <div className="px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">{translation.title}</h1>
          <p className="text-sm font-body text-lavender">{translation.chapters[chapterIndex].title}</p>
          <p className="text-xs font-body text-white/60 mt-1">
            Chapter {chapterIndex + 1} of {totalChapters}
          </p>
        </div>
      <div className="flex items-center gap-2">
        {translation.purchaseUrl && (
          <Link
            href={translation.purchaseUrl}
            className="btn btn-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            buy now
          </Link>
        )}
        <button
          onClick={onPrevChapter}
          className={`btn btn-secondary ${
            chapterIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={chapterIndex === 0}
        >
          ← prev
        </button>
        <button
          onClick={onNextChapter}
          className={`btn btn-secondary ${
            chapterIndex === totalChapters - 1 ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={chapterIndex === totalChapters - 1}
        >
          next →
        </button>
        <button onClick={onOpenShareModal} className="btn btn-secondary">
          share
        </button>
      </div>
      </div>

      {/* Reading progress bar */}
      <div className="w-full h-1 bg-white/10">
        <div
          className="h-full bg-lavender transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
          role="progressbar"
          aria-valuenow={chapterIndex + 1}
          aria-valuemin={1}
          aria-valuemax={totalChapters}
          aria-label={`Reading progress: chapter ${chapterIndex + 1} of ${totalChapters}`}
        />
      </div>
    </header>
  );
}
