/**
 * Translation manifest loader for build-time generated translations
 *
 * This module loads the generated translations.json manifest created at build-time
 * by the generateTranslationsManifest script, replacing the hand-authored translation files.
 */
import translationsManifest from '@/.generated/translations.json';
// Use existing types for compatibility
import type { Chapter, Translation } from '@/utils/types.js';

/**
 * All translations loaded from the generated manifest
 * Contains full chapter content inline (no file references)
 */
export const translations: Translation[] = translationsManifest.translations;

/**
 * Find a translation by its slug
 * @param slug - The book slug to find
 * @returns The translation object or undefined if not found
 */
export const getTranslationBySlug = (slug: string): Translation | undefined =>
  translations.find((t) => t.slug === slug);

/**
 * Get translations filtered by status
 * @param status - Filter by availability status
 * @returns Array of translations with matching status
 */
export const getTranslationsByStatus = (status: 'available' | 'coming soon'): Translation[] =>
  translations.filter((t) => t.status === status);

/**
 * Get count of available translations
 * @returns Number of translations with 'available' status
 */
export const getAvailableCount = (): number =>
  translations.filter((t) => t.status === 'available').length;

/**
 * Get total chapter count across all translations
 * @returns Total number of chapters
 */
export const getTotalChapterCount = (): number =>
  translations.reduce((count, t) => count + t.chapters.length, 0);

// Default export for backward compatibility
export default translations;
