'use client';

import { KeyboardEvent, useEffect, useRef } from 'react';

import { handleKeyboardInteraction } from '@/utils';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  includeChapter: boolean;
  onIncludeChapterChange: (value: boolean) => void;
  includeTimestamp: boolean;
  onIncludeTimestampChange: (value: boolean) => void;
  getShareUrl: () => string;
  onCopyUrl: () => void;
  shareFeedback: string;
}

/**
 * Modal component for generating and copying shareable URLs.
 * @param props - The component props.
 */
export default function ShareModal(props: ShareModalProps) {
  // Destructure props inside the function body
  const {
    isOpen,
    onClose,
    includeChapter,
    onIncludeChapterChange,
    includeTimestamp,
    onIncludeTimestampChange,
    getShareUrl,
    onCopyUrl,
    shareFeedback,
  } = props;

  // Ref for modal container to track focusable elements
  const modalRef = useRef<HTMLDivElement>(null);

  // Add Escape key handler for accessibility (WCAG 2.1 Level A)
  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Implement focus trap for accessibility (WCAG 2.1 Level A)
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    // Get all focusable elements within modal
    const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Set initial focus to first element
    firstElement?.focus();

    // Handle Tab key to trap focus
    function handleTab(e: globalThis.KeyboardEvent) {
      if (e.key !== 'Tab') return;

      // Shift+Tab on first element → focus last element
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
      // Tab on last element → focus first element
      else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }

    document.addEventListener('keydown', handleTab);
    return () => {
      document.removeEventListener('keydown', handleTab);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="button"
      tabIndex={0}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-20"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
          handleKeyboardInteraction(e, onClose);
        }
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-sm bg-[#2c2c3a] p-4 rounded-md relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
      >
        <button
          className="absolute top-2 right-2 text-lavender text-sm"
          onClick={onClose}
          aria-label="Close share modal"
        >
          ✕
        </button>
        <h2 id="share-modal-title" className="text-xl mb-3 font-display">
          share the vibe
        </h2>
        <div className="space-y-2 mb-4">
          <label className="flex items-center gap-2" htmlFor="include-chapter">
            <input
              id="include-chapter"
              type="checkbox"
              checked={includeChapter}
              onChange={() => onIncludeChapterChange(!includeChapter)}
            />
            <span>include chapter</span>
          </label>
          <label className="flex items-center gap-2" htmlFor="include-timestamp">
            <input
              id="include-timestamp"
              type="checkbox"
              checked={includeTimestamp}
              onChange={() => onIncludeTimestampChange(!includeTimestamp)}
            />
            <span>include timestamp</span>
          </label>
        </div>
        <div className="space-y-2">
          <label className="text-sm" htmlFor="share-url">
            your link
          </label>
          <input
            id="share-url"
            type="text"
            className="w-full p-2 rounded bg-[#1f1f29] text-gray-100"
            readOnly
            value={getShareUrl()}
          />
        </div>
        <button onClick={onCopyUrl} className="btn btn-primary mt-3 block w-full">
          copy link
        </button>
        {shareFeedback && <div className="mt-2 text-sm text-peachy">{shareFeedback}</div>}
      </div>
    </div>
  );
}
