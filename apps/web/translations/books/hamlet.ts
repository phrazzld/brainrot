/**
 * Translation data for Hamlet
 */
import { Translation } from '../types.js';

const hamlet: Translation = {
  slug: 'hamlet',
  bookSlug: 'hamlet', // Added for simple blob client
  title: 'hamlet',
  shortDescription:
    "hamlet mad pressed, dad ghost drops the worst dm of all time, uncle sus af. whole kingdom in shambles cuz bro won't touch grass.",
  coverImage: 'https://82qos1wlxbd4iq1g.public.blob.vercel-storage.com/books/hamlet/images/hamlet-07.png',
  status: 'available',
  chapters: [
    {
      title: 'act i',
      text: 'act-01.txt',
      audioSrc: null,
    },
    {
      title: 'act ii',
      text: 'act-02.txt',
      audioSrc: null,
    },
    {
      title: 'act iii',
      text: 'act-03.txt',
      audioSrc: null,
    },
    {
      title: 'act iv',
      text: 'act-04.txt',
      audioSrc: null,
    },
    {
      title: 'act v',
      text: 'act-05.txt',
      audioSrc: null,
    },
  ],
};

export default hamlet;