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
  coverImage: 'https://82qos1wlxbd4iq1g.public.blob.vercel-storage.com/books/the-declaration-of-independence/images/america-02.png',
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
