'use client';

import { useEffect, useState } from 'react';
import { fetchBookText } from '@/utils/simple-blob.js';

interface TextLoaderState {
  rawText: string;
  isTextLoading: boolean;
}

export function useTextLoader(bookSlug: string, filename: string | undefined): TextLoaderState {
  const [rawText, setRawText] = useState('');
  const [isTextLoading, setIsTextLoading] = useState(false);

  useEffect(() => {
    if (!filename || !bookSlug) {
      setRawText('');
      return;
    }

    // Create an AbortController for cleanup
    const abortController = new AbortController();
    const signal = abortController.signal;

    // Load text with simple fetch
    setIsTextLoading(true);
    fetchBookText(bookSlug, filename)
      .then((txt) => {
        if (signal.aborted) return; // Don't update state if aborted
        setRawText(txt);
      })
      .catch((_error) => {
        if (signal.aborted) return; // Don't update state if aborted
        // Set fallback error message
        setRawText('Error loading text. Please try again later.');
      })
      .finally(() => {
        if (signal.aborted) return; // Don't update state if aborted
        setIsTextLoading(false);
      });

    return () => {
      abortController.abort();
    };
  }, [bookSlug, filename]);

  return { rawText, isTextLoading };
}