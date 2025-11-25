'use client';

import { useState } from 'react';

import { Translation } from '@/utils/types';

interface ChapterSidebarProps {
  translation: Translation;
  chapterIndex: number;
  onChapterClick: (index: number) => void;
}

export default function ChapterSidebar({
  translation,
  chapterIndex,
  onChapterClick,
}: ChapterSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const totalChapters = translation.chapters.length;
  const chaptersArray = Array.from({ length: totalChapters }, (_, i) => i);

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/50 z-20"
          aria-hidden="true"
        />
      )}

      {/* Mobile toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-black/80 rounded border border-white/20 hover:bg-black/90"
        aria-label={isOpen ? 'Close chapter menu' : 'Open chapter menu'}
      >
        <svg
          className="w-6 h-6 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      <aside
        className={`
          w-48 bg-black/30 p-4 h-screen overflow-y-auto
          fixed lg:sticky top-0 left-0 z-30
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
      <h2 className="text-lg font-display mb-4 text-peachy">chapters</h2>
      <nav className="flex flex-col space-y-2">
        {chaptersArray.map((cNum) => {
          const isActive = cNum === chapterIndex;
          return (
            <button
              key={cNum}
              onClick={() => onChapterClick(cNum)}
              className={`px-3 py-2 rounded border text-sm font-body text-left ${
                isActive
                  ? 'bg-peachy text-midnight border-peachy'
                  : 'bg-black/30 text-white/80 border-white/20 hover:bg-black/50'
              }`}
            >
              {isActive && <span className="mr-2" aria-hidden="true">▶</span>}
              {translation.chapters[cNum].title}
            </button>
          );
        })}
      </nav>
    </aside>
    </>
  );
}
