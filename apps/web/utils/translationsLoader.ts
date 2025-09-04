/**
 * Translation manifest loader for build-time generated translations
 *
 * This module loads the generated translations.json manifest created at build-time
 * by the generateTranslationsManifest script, replacing the hand-authored translation files.
 */
// Use modern monorepo types
import type { Translation } from '@brainrot/types';

// Graceful fallback for missing manifest during development
let translationsManifest: { translations: Translation[] };
try {
  translationsManifest = await import('@/.generated/translations.json');
} catch (error) {
  console.warn('⚠️  Generated translations manifest not found. Run `pnpm generate:manifest` to create it.');
  console.warn('Using empty translations list as fallback.');
  translationsManifest = { translations: [] };
}

/**
 * All translations loaded from the generated manifest
 * Contains full chapter content inline (no file references)
 */
export const translations: Translation[] = translationsManifest.translations as Translation[];

/**
 * Find a translation by its slug
 * @param slug - The book slug to find
 * @returns The translation object or undefined if not found
 */
export const getTranslationBySlug = (slug: string): Translation | undefined =>
  translations.find((t) => t.slug === slug);

/**
 * Get translations filtered by availability
 * @param isAvailable - Filter by availability status
 * @returns Array of translations with matching availability
 */
export const getTranslationsByAvailability = (isAvailable: boolean): Translation[] =>
  translations.filter((t) => t.available === isAvailable);

/**
 * @deprecated Use getTranslationsByAvailability instead
 * Get translations filtered by status (legacy)
 */
export const getTranslationsByStatus = (status: 'available' | 'coming soon'): Translation[] =>
  getTranslationsByAvailability(status === 'available');

/**
 * Get count of available translations
 * @returns Number of translations with 'available' status
 */
export const getAvailableCount = (): number =>
  translations.filter((t) => t.available === true).length;

/**
 * Get total chapter count across all translations
 * @returns Total number of chapters
 */
export const getTotalChapterCount = (): number =>
  translations.reduce((count, t) => count + t.chapters.length, 0);

// Default export for backward compatibility
export default translations;
