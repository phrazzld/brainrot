/**
 * Utility functions for working with translations
 */
import { Translation } from './types.js';

/**
 * Find a translation by its slug
 */
export function getTranslationBySlug(
  translations: Translation[],
  slug: string,
): Translation | undefined {
  return translations.find((t) => t.slug === slug);
}
