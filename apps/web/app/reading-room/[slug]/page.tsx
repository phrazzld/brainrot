'use client';

import { useState } from 'react';

// Components
import ChapterHeader from '@/components/reading-room/ChapterHeader';
import ChapterSidebar from '@/components/reading-room/ChapterSidebar';
import DownloadModal from '@/components/reading-room/DownloadModal';
import ShareModal from '@/components/reading-room/ShareModal';
import TextContent from '@/components/reading-room/TextContent';
import { useChapterNavigation } from '@/hooks/useChapterNavigation';
import { useShareModal } from '@/hooks/useShareModal';
// Custom hooks
import { translations } from '@/utils/translationsLoader';

export default function ReadingRoom() {
  // Download modal state
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);

  // Set up chapter navigation
  const [
    { chapterIndex, slug, translation, chapterData, totalChapters },
    { handleChapterClick, goPrevChapter, goNextChapter },
  ] = useChapterNavigation(translations);

  // Get chapter text directly from manifest (no longer needs loading)
  const rawText = chapterData?.content || '';
  const isTextLoading = false; // Text is inline in manifest, no loading needed

  // Set up share modal (no audio timing)
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
  ] = useShareModal(slug, chapterIndex, 0);

  // Download modal handlers
  function closeDownloadModal() {
    setIsDownloadOpen(false);
  }

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
      <div className="flex-1 flex flex-col">
        {/* Header with title and navigation */}
        <ChapterHeader
          translation={translation}
          chapterIndex={chapterIndex}
          totalChapters={totalChapters}
          onPrevChapter={goPrevChapter}
          onNextChapter={goNextChapter}
          onOpenShareModal={openShareModal}
        />

        {/* Audio player removed - audioSrc not available in modern interface */}

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
