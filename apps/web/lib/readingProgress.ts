/**
 * Reading progress utility for persisting user's reading position
 * Handles localStorage with graceful error handling for incognito mode and quota exceeded
 */

const STORAGE_PREFIX = 'brainrot_reading_progress_';

export interface ReadingProgress {
  chapterIndex: number;
  scrollPosition: number;
}

/**
 * Save reading progress for a book
 * @param slug - Book slug identifier
 * @param chapterIndex - Current chapter index (0-based)
 * @param scrollPosition - Current scroll position in pixels
 */
export function saveProgress(slug: string, chapterIndex: number, scrollPosition: number): void {
  try {
    const progress: ReadingProgress = { chapterIndex, scrollPosition };
    const key = STORAGE_PREFIX + slug;
    localStorage.setItem(key, JSON.stringify(progress));
  } catch (error) {
    // Handle localStorage errors gracefully:
    // - Incognito mode (localStorage disabled)
    // - Quota exceeded (storage full)
    // - Other localStorage exceptions
    console.warn(`Failed to save reading progress for ${slug}:`, error);
  }
}

/**
 * Get saved reading progress for a book
 * @param slug - Book slug identifier
 * @returns Reading progress object or null if not found
 */
export function getProgress(slug: string): ReadingProgress | null {
  try {
    const key = STORAGE_PREFIX + slug;
    const stored = localStorage.getItem(key);

    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored);

    // Validate parsed data has expected shape
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.chapterIndex === 'number' &&
      typeof parsed.scrollPosition === 'number'
    ) {
      return parsed as ReadingProgress;
    }

    // Invalid data shape - clear it
    clearProgress(slug);
    return null;
  } catch (error) {
    // Handle localStorage errors and JSON parse errors
    console.warn(`Failed to get reading progress for ${slug}:`, error);
    return null;
  }
}

/**
 * Clear saved reading progress for a book
 * @param slug - Book slug identifier
 */
export function clearProgress(slug: string): void {
  try {
    const key = STORAGE_PREFIX + slug;
    localStorage.removeItem(key);
  } catch (error) {
    // Handle localStorage errors gracefully
    console.warn(`Failed to clear reading progress for ${slug}:`, error);
  }
}
