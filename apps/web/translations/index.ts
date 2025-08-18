// Import all book translations
import bhagavadGita from './books/bhagavad-gita.js';
import bibleNewTestament from './books/bible-new-testament.js';
import bibleOldTestament from './books/bible-old-testament.js';
// Available books
import declarationOfIndependence from './books/declaration-of-independence.js';
import divineComedyInferno from './books/divine-comedy-inferno.js';
import divineComedyParadiso from './books/divine-comedy-paradiso.js';
import divineComedyPurgatorio from './books/divine-comedy-purgatorio.js';
import gilgamesh from './books/gilgamesh.js';
import greatGatsby from './books/great-gatsby.js';
import hamlet from './books/hamlet.js';
import huckleberryFinn from './books/huckleberry-finn.js';
import meditations from './books/meditations.js';
import midsummerNightsDream from './books/midsummer-nights-dream.js';
import paradiseLost from './books/paradise-lost.js';
import prideAndPrejudice from './books/pride-and-prejudice.js';
import quran from './books/quran.js';
import romeoAndJuliet from './books/romeo-and-juliet.js';
import theAeneid from './books/the-aeneid.js';
import theIliad from './books/the-iliad.js';
import theOdyssey from './books/the-odyssey.js';
// Coming soon books
import theRepublic from './books/the-republic.js';
/**
 * Translations index
 *
 * This file exports all translations and utility functions for accessing them.
 */

// Export types
export * from './types.js';

// Create and export the translations array
const translations = [
  // Available books
  theIliad,
  huckleberryFinn,
  theOdyssey,
  theAeneid,
  hamlet,
  greatGatsby,
  declarationOfIndependence,

  // Coming soon books
  theRepublic,
  prideAndPrejudice,
  paradiseLost,
  meditations,
  divineComedyInferno,
  divineComedyPurgatorio,
  divineComedyParadiso,
  bibleOldTestament,
  bibleNewTestament,
  quran,
  romeoAndJuliet,
  midsummerNightsDream,
  gilgamesh,
  bhagavadGita,
];

export default translations;

/**
 * Find a translation by its slug
 */
export function getTranslationBySlug(slug: string): import('./types.js').Translation | undefined {
  return translations.find((t) => t.slug === slug);
}
