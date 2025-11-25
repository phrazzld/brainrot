'use client';

import { KeyboardEvent, useEffect, useRef } from 'react';

import DownloadButton from '@/components/DownloadButton';
import { handleKeyboardInteraction } from '@/utils';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  chapterIndex: number;
}

export default function DownloadModal({ isOpen, onClose, slug, chapterIndex }: DownloadModalProps) {
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
        className="w-full max-w-sm bg-cardbg p-4 rounded-sm relative border border-white/10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="download-modal-title"
      >
        <button
          className="absolute top-2 right-2 text-lavender text-sm"
          onClick={onClose}
          aria-label="Close download modal"
        >
          ✕
        </button>
        <h2 id="download-modal-title" className="text-xl mb-3 font-display font-bold">
          download options
        </h2>
        <div className="flex flex-col space-y-2">
          <DownloadButton
            slug={slug}
            type="chapter"
            chapter={chapterIndex + 1}
            classNames="btn btn-primary"
          />
        </div>
      </div>
    </div>
  );
}
