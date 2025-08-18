/**
 * Translation data for The Declaration of Independence
 */
import { Translation } from '../types.js';

const declarationOfIndependence: Translation = {
  slug: 'declaration-of-independence',
  bookSlug: 'declaration-of-independence', // Added for simple blob client
  title: 'the declaration of independence',
  shortDescription:
    'colonies went no cap on king george, dropped the hardest breakup letter in history. life, liberty, and vibes only.',
  coverImage: '/assets/declaration-of-independence/images/the-declaration-01.png', // Keep cover as is for now
  status: 'available',
  chapters: [
    {
      title: 'the declaration',
      text: 'declaration.txt',
      audioSrc: null,
    },
  ],
};

export default declarationOfIndependence;
