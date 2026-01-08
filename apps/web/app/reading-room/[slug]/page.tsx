'use client';

import { useEffect, useRef, useState } from 'react';

// Components
import AudioPlayer from '@/components/reading-room/AudioPlayer';
import ChapterHeader from '@/components/reading-room/ChapterHeader';
import ChapterSidebar from '@/components/reading-room/ChapterSidebar';
import DownloadModal from '@/components/reading-room/DownloadModal';
import ShareModal from '@/components/reading-room/ShareModal';
import TextContent from '@/components/reading-room/TextContent';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useChapterNavigation } from '@/hooks/useChapterNavigation';
import { useShareModal } from '@/hooks/useShareModal';
import { useTextLoader } from '@/hooks/useTextLoader';
import { getProgress, saveProgress } from '@/lib/readingProgress';
// Custom hooks
import translations from '@/translations';

export default function ReadingRoom() {
  // Waveform container ref
  const waveformRef = useRef<HTMLDivElement>(null);

  // Download modal state
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);

  // Ref for content container to track scroll position
  const contentRef = useRef<HTMLDivElement>(null);

  // Set up chapter navigation
  const [
    { chapterIndex, slug, translation, chapterData, totalChapters },
    { handleChapterClick, goPrevChapter, goNextChapter, updateTimestamp },
  ] = useChapterNavigation(translations);

  // Load chapter text
  const { rawText, isTextLoading } = useTextLoader(slug, chapterData?.text);

  // Set up audio player
  const [
    { isPlaying, isAudioLoading, currentTime, totalTime, error },
    { togglePlayPause, formatTime },
  ] = useAudioPlayer(waveformRef, chapterData?.audioSrc, updateTimestamp);

  // Set up share modal
  const [
    { isShareOpen, shareFeedback, includeChapter, includeTimestamp },
    {
      openShareModal,
      closeShareModal,
      setIncludeChapter,
      setIncludeTimestamp,
      getShareUrl,
      copyShareUrl,
    },
  ] = useShareModal(slug, chapterIndex, currentTime);

  // Download modal handlers
  function openDownloadModal() {
    setIsDownloadOpen(true);
  }

  function closeDownloadModal() {
    setIsDownloadOpen(false);
  }

  // Load saved progress on mount and navigate to saved chapter
  useEffect(() => {
    if (!slug) return;

    const progress = getProgress(slug);
    if (progress && progress.chapterIndex !== chapterIndex) {
      // Navigate to saved chapter
      handleChapterClick(progress.chapterIndex);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save progress when chapter changes
  useEffect(() => {
    if (!slug) return;

    // Save immediately on chapter change
    saveProgress(slug, chapterIndex, 0);
  }, [slug, chapterIndex]);

  // Save progress on scroll (debounced)
  useEffect(() => {
    const contentElement = contentRef.current;
    if (!contentElement || !slug) return;

    let scrollTimeout: NodeJS.Timeout;

    function handleScroll() {
      // Debounce scroll save - only save 500ms after scrolling stops
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (!contentElement) return;
        const scrollPosition = contentElement.scrollTop;
        saveProgress(slug, chapterIndex, scrollPosition);
      }, 500);
    }

    contentElement.addEventListener('scroll', handleScroll);
    return () => {
      clearTimeout(scrollTimeout);
      contentElement.removeEventListener('scroll', handleScroll);
    };
  }, [slug, chapterIndex]);

  // Restore scroll position after content loads
  useEffect(() => {
    const contentElement = contentRef.current;
    if (!contentElement || !slug || isTextLoading) return;

    const progress = getProgress(slug);
    if (progress && progress.chapterIndex === chapterIndex && progress.scrollPosition > 0) {
      // Restore scroll position after a brief delay to ensure content is rendered
      setTimeout(() => {
        contentElement.scrollTop = progress.scrollPosition;
      }, 100);
    }
  }, [slug, chapterIndex, isTextLoading]);

  // If no translation found, show a simple message
  if (!translation) {
    return (
      <div className="p-8 text-white">
        <h1 className="text-xl">no translation found</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-midnight text-white">
      {/* Sidebar with chapter navigation */}
      <ChapterSidebar
        translation={translation}
        chapterIndex={chapterIndex}
        onChapterClick={handleChapterClick}
      />

      {/* Main content area */}
      <div ref={contentRef} className="flex-1 flex flex-col overflow-y-auto">
        {/* Header with title and navigation */}
        <ChapterHeader
          translation={translation}
          chapterIndex={chapterIndex}
          totalChapters={totalChapters}
          onPrevChapter={goPrevChapter}
          onNextChapter={goNextChapter}
          onOpenShareModal={openShareModal}
        />

        {/* Audio player (conditional) */}
        {chapterData?.audioSrc && (
          <AudioPlayer
            isPlaying={isPlaying}
            isAudioLoading={isAudioLoading}
            currentTime={currentTime}
            totalTime={totalTime}
            error={error}
            onTogglePlayPause={togglePlayPause}
            onOpenDownloadModal={openDownloadModal}
            waveformRef={waveformRef}
            formatTime={formatTime}
          />
        )}

        {/* Text content */}
        <TextContent isLoading={isTextLoading} content={rawText} />
      </div>

      {/* Modals */}
      <ShareModal
        isOpen={isShareOpen}
        onClose={closeShareModal}
        includeChapter={includeChapter}
        onIncludeChapterChange={setIncludeChapter}
        includeTimestamp={includeTimestamp}
        onIncludeTimestampChange={setIncludeTimestamp}
        getShareUrl={getShareUrl}
        onCopyUrl={copyShareUrl}
        shareFeedback={shareFeedback}
      />

      <DownloadModal
        isOpen={isDownloadOpen}
        onClose={closeDownloadModal}
        slug={slug}
        chapterIndex={chapterIndex}
      />
    </div>
  );
}
