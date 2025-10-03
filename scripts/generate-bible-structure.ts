#!/usr/bin/env tsx

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

interface BookInfo {
  bookNumber: number;
  slug: string;
  title: string;
  testament: 'OT' | 'NT';
  chapters: number;
  verses: number;
  words: number;
}

interface BooksIndex {
  totalBooks: number;
  oldTestament: number;
  newTestament: number;
  totalChapters: number;
  totalVerses: number;
  totalWords: number;
  books: BookInfo[];
}

/**
 * Generate metadata.yaml for a Bible book
 */
function generateMetadataYaml(book: BookInfo): string {
  const testamentName = book.testament === 'OT' ? 'Old Testament' : 'New Testament';
  const description = `Experience ${book.title} from the ${testamentName} like never before. This Gen Z translation transforms the sacred text into modern language that hits different. ${book.chapters} ${book.chapters === 1 ? 'chapter' : 'chapters'} of pure theological fire, translated with maximum brainrot density while preserving every bit of the original meaning. No cap, this will change how you read scripture.`;

  return `# ${book.title} - Brainrot Edition Metadata
title: "${book.title} (Brainrot Edition)"
author: "Various (${testamentName})"
translator: "Brainrot Publishing House"
original_year: "${book.testament === 'OT' ? '~1000 BCE - 400 BCE' : '~50 CE - 100 CE'}"
translation_year: 2025
description: |
  ${description}

# Publishing formats and ISBNs (to be assigned)
formats:
  ebook:
    isbn: "TBD"
    price: ${book.chapters < 10 ? '2.99' : book.chapters < 30 ? '4.99' : '6.99'}
    currency: "USD"
  paperback:
    isbn: "TBD"
    price: ${book.chapters < 10 ? '9.99' : book.chapters < 30 ? '14.99' : '19.99'}
    currency: "USD"
    pages: ${Math.ceil(book.words / 250)} # Estimated at 250 words per page
    dimensions: "6x9 inches"
  hardcover:
    isbn: "TBD"
    price: ${book.chapters < 10 ? '19.99' : book.chapters < 30 ? '24.99' : '29.99'}
    currency: "USD"
    pages: ${Math.ceil(book.words / 250)}
    dimensions: "6x9 inches"

# Publishing platforms
publishing:
  kdp: true
  lulu: false
  ingram: false
  draft2digital: false

# Categorization for retailers
categories:
  - "Religion / Biblical Studies / General"
  - "Religion / Christian Life / Spiritual Growth"
  - "Humor / Topic / Religion"

# SEO and discovery keywords
keywords:
  - "${book.title.toLowerCase()}"
  - "bible gen z"
  - "brainrot bible"
  - "modern bible translation"
  - "${testamentName.toLowerCase()}"
  - "scripture for youth"
  - "bible study"
  - "contemporary bible"
  - "modernized scripture"
  - "bible for beginners"

# Book series information
series: "The Bible (Brainrot Edition)"
series_number: ${book.bookNumber}
testament: "${book.testament}"

# Language and market
language: "en-US"
markets:
  - "United States"
  - "United Kingdom"
  - "Canada"
  - "Australia"

# Additional metadata
bisac_codes:
  - "REL006000" # Religion / Biblical Studies / General
  - "REL012000" # Religion / Christian Life / Spiritual Growth
  - "HUM015000" # Humor / Topic / Religion

copyright: "Translation © 2025 Brainrot Publishing House"
rights: "All rights reserved. Original work in public domain (KJV)."

# Content structure
structure:
  testament: "${book.testament}"
  book_number: ${book.bookNumber}
  total_chapters: ${book.chapters}
  total_verses: ${book.verses}
  estimated_words: ${book.words}
  reading_level: "Young Adult / General Adult"
  content_warnings: "Religious content, theological discussions, some violence and mature themes in context"
`;
}

/**
 * Generate character-tracking.json template
 */
function generateCharacterTracking(): string {
  return JSON.stringify({
    characterVoices: {
      documented: [
        {
          name: "Example Character",
          signatureTerms: ["term1", "term2", "term3"],
          voiceNotes: "Voice description and consistency notes",
          firstAppearance: "Book:Chapter:Verse",
          totalMentions: 0
        }
      ]
    },
    termUsage: {
      brainrotDensity: {
        targetPerSentence: 3.5,
        actualPerSentence: 0,
        totalTerms: 0,
        totalSentences: 0
      },
      mostUsedTerms: []
    },
    consistencyNotes: [
      "Track voice consistency issues here",
      "Note any deviations from BIBLICAL_VOICES.md"
    ],
    translationDecisions: [
      {
        concept: "theological term or phrase",
        translation: "brainrot equivalent chosen",
        rationale: "why this choice was made",
        chapter: 0
      }
    ]
  }, null, 2);
}

/**
 * Scaffold directory structure for all Bible books
 */
async function generateBibleStructure(): Promise<void> {
  const bibleDir = join(process.cwd(), 'content', 'translations', 'books', 'the-bible');
  const booksIndexPath = join(bibleDir, 'books-index.json');

  if (!existsSync(booksIndexPath)) {
    console.error('❌ books-index.json not found. Run parse-bible-kjv.ts first.');
    process.exit(1);
  }

  // Read books index
  const booksIndexContent = readFileSync(booksIndexPath, 'utf-8');
  const booksIndex: BooksIndex = JSON.parse(booksIndexContent);

  console.log('📁 Generating directory structure for Bible books...\n');
  console.log('='.repeat(80));

  let dirsCreated = 0;
  let metadataGenerated = 0;
  let trackingGenerated = 0;

  for (const book of booksIndex.books) {
    const bookDir = join(bibleDir, book.slug);

    // Create required subdirectories
    const subdirs = ['source', 'brainrot', 'chapters', 'translation-memory'];
    for (const subdir of subdirs) {
      const subdirPath = join(bookDir, subdir);
      if (!existsSync(subdirPath)) {
        mkdirSync(subdirPath, { recursive: true });
        dirsCreated++;
      }
    }

    // Generate metadata.yaml
    const metadataPath = join(bookDir, 'metadata.yaml');
    if (!existsSync(metadataPath)) {
      const metadataContent = generateMetadataYaml(book);
      writeFileSync(metadataPath, metadataContent, 'utf-8');
      metadataGenerated++;
    }

    // Generate character-tracking.json
    const trackingPath = join(bookDir, 'translation-memory', 'character-tracking.json');
    if (!existsSync(trackingPath)) {
      const trackingContent = generateCharacterTracking();
      writeFileSync(trackingPath, trackingContent, 'utf-8');
      trackingGenerated++;
    }

    console.log(`✅ ${book.title.padEnd(20)} | ${book.slug.padEnd(20)} | ${String(book.chapters).padStart(3)} chapters`);
  }

  console.log('='.repeat(80));
  console.log(`\n📊 Summary:`);
  console.log(`   Books processed: ${booksIndex.totalBooks}`);
  console.log(`   Directories created: ${dirsCreated}`);
  console.log(`   Metadata files generated: ${metadataGenerated}`);
  console.log(`   Character tracking files generated: ${trackingGenerated}`);
  console.log('\n✨ Bible directory structure complete!\n');
}

generateBibleStructure().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
