#!/usr/bin/env tsx

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface BookInfo {
  bookNumber: number;
  startLine: number;
  endLine: number;
  chapters: ChapterInfo[];
}

interface ChapterInfo {
  bookNumber: number;
  chapterNumber: number;
  startLine: number;
  endLine: number;
  title: string;
  firstLine: string;
  wordCount: number;
}

// Book boundaries from the actual dialogue section
const BOOK_STARTS = {
  1: 8636,   // "I went down yesterday to the Piraeus"
  2: 10340,  // Book II actual text start
  3: 11780,  // Book III actual text start
  4: 13635,  // Book IV actual text start
  5: 15235,  // Book V actual text start
  6: 17197,  // Book VI actual text start
  7: 18769,  // Book VII actual text start
  8: 20249,  // Book VIII actual text start
  9: 21834,  // Book IX actual text start
  10: 23162  // Book X actual text start
};

const END_LINE = 24569; // Before "*** END OF THE PROJECT GUTENBERG EBOOK"

// Chapter divisions based on natural dialogue breaks and topic shifts
const CHAPTER_DIVISIONS = {
  1: [
    { start: 8636, title: "The Piraeus Festival & Cephalus on Old Age", end: 9100 },
    { start: 9100, title: "Polemarchus on Justice as Helping Friends", end: 9800 },
    { start: 9800, title: "Thrasymachus: Might Makes Right", end: 10337 }
  ],
  2: [
    { start: 10340, title: "Glaucon's Challenge & Ring of Gyges", end: 10900 },
    { start: 10900, title: "Building the Just City", end: 11300 },
    { start: 11300, title: "Guardian Class & Early Education", end: 11777 }
  ],
  3: [
    { start: 11780, title: "Censorship of Poetry & Stories", end: 12400 },
    { start: 12400, title: "Musical & Physical Education", end: 13000 },
    { start: 13000, title: "Selection of Guardians", end: 13300 },
    { start: 13300, title: "The Noble Lie", end: 13632 }
  ],
  4: [
    { start: 13635, title: "Guardian Lifestyle & Common Property", end: 14200 },
    { start: 14200, title: "City's Virtues: Wisdom, Courage, Moderation", end: 14800 },
    { start: 14800, title: "The Tripartite Soul", end: 15232 }
  ],
  5: [
    { start: 15235, title: "Women Guardians & Gender Equality", end: 15900 },
    { start: 15900, title: "Communal Marriage & Children", end: 16600 },
    { start: 16600, title: "War & Unity Among Greeks", end: 16900 },
    { start: 16900, title: "Philosopher Kings Revealed", end: 17194 }
  ],
  6: [
    { start: 17197, title: "The Philosopher's Nature", end: 17700 },
    { start: 17700, title: "Corruption of Philosophy", end: 18100 },
    { start: 18100, title: "The Form of the Good & Sun Analogy", end: 18400 },
    { start: 18400, title: "The Divided Line", end: 18766 }
  ],
  7: [
    { start: 18769, title: "The Cave Allegory", end: 19300 },
    { start: 19300, title: "Return to the Cave", end: 19700 },
    { start: 19700, title: "Mathematical Education", end: 20000 },
    { start: 20000, title: "Dialectic & Philosopher Training", end: 20246 }
  ],
  8: [
    { start: 20249, title: "Review & The Decline of States", end: 20600 },
    { start: 20600, title: "Timocracy: Rule by Honor", end: 21000 },
    { start: 21000, title: "Oligarchy: Rule by Wealth", end: 21400 },
    { start: 21400, title: "Democracy & Tyranny", end: 21831 }
  ],
  9: [
    { start: 21834, title: "The Tyrannical Man", end: 22200 },
    { start: 22200, title: "Comparing Lives: Just vs Unjust", end: 22600 },
    { start: 22600, title: "Three Proofs of Justice's Superiority", end: 23159 }
  ],
  10: [
    { start: 23162, title: "Poetry & Imitation Critique", end: 23500 },
    { start: 23500, title: "Immortality of the Soul", end: 23900 },
    { start: 23900, title: "The Myth of Er", end: 24569 }
  ]
};

async function parseChapters() {
  console.log('📖 Parsing Plato\'s Republic into logical chapters...\n');
  
  // Read the source file
  const sourcePath = join(process.cwd(), 'content/translations/books/platos-republic/source/fulltext.txt');
  const fullText = readFileSync(sourcePath, 'utf-8');
  const lines = fullText.split('\n');
  
  // Create output directory
  const outputDir = join(process.cwd(), 'content/translations/books/platos-republic/chapters');
  mkdirSync(outputDir, { recursive: true });
  
  const books: BookInfo[] = [];
  let totalChapters = 0;
  let totalWords = 0;
  
  // Process each book
  for (const [bookNumStr, chapters] of Object.entries(CHAPTER_DIVISIONS)) {
    const bookNumber = parseInt(bookNumStr);
    const bookInfo: BookInfo = {
      bookNumber,
      startLine: BOOK_STARTS[bookNumber],
      endLine: bookNumber === 10 ? END_LINE : BOOK_STARTS[bookNumber + 1] - 1,
      chapters: []
    };
    
    console.log(`\n📚 Book ${bookNumber} (${chapters.length} chapters):`);
    
    // Process each chapter in the book
    chapters.forEach((chapter, idx) => {
      const chapterNumber = idx + 1;
      const startLine = chapter.start;
      const endLine = chapter.end;
      
      // Extract chapter text
      const chapterLines = lines.slice(startLine - 1, endLine);
      const chapterText = chapterLines.join('\n').trim();
      
      // Calculate word count
      const wordCount = chapterText.split(/\s+/).filter(word => word.length > 0).length;
      totalWords += wordCount;
      
      const chapterInfo: ChapterInfo = {
        bookNumber,
        chapterNumber,
        startLine,
        endLine,
        title: chapter.title,
        firstLine: chapterLines[0]?.substring(0, 60) + '...',
        wordCount
      };
      
      bookInfo.chapters.push(chapterInfo);
      totalChapters++;
      
      // Write chapter file
      const chapterFilename = `book-${String(bookNumber).padStart(2, '0')}-chapter-${chapterNumber}.txt`;
      const chapterPath = join(outputDir, chapterFilename);
      
      const chapterHeader = `BOOK ${bookNumber}, CHAPTER ${chapterNumber}\n${chapter.title}\n${'='.repeat(60)}\n\n`;
      writeFileSync(chapterPath, chapterHeader + chapterText);
      
      console.log(`  Chapter ${chapterNumber}: "${chapter.title}"`);
      console.log(`    Lines ${startLine}-${endLine} (${wordCount.toLocaleString()} words)`);
    });
    
    books.push(bookInfo);
  }
  
  // Generate summary report
  const summaryPath = join(outputDir, 'chapter-mapping.json');
  const summary = {
    totalBooks: 10,
    totalChapters,
    totalWords,
    averageWordsPerChapter: Math.round(totalWords / totalChapters),
    books: books.map(book => ({
      book: book.bookNumber,
      chapters: book.chapters.length,
      totalWords: book.chapters.reduce((sum, ch) => sum + ch.wordCount, 0),
      startLine: book.startLine,
      endLine: book.endLine,
      chapterDetails: book.chapters.map(ch => ({
        chapter: ch.chapterNumber,
        title: ch.title,
        lines: `${ch.startLine}-${ch.endLine}`,
        words: ch.wordCount
      }))
    }))
  };
  
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 PARSING COMPLETE:');
  console.log('='.repeat(60));
  console.log(`✅ Total chapters created: ${totalChapters}`);
  console.log(`📝 Total words: ${totalWords.toLocaleString()}`);
  console.log(`📏 Average words per chapter: ${Math.round(totalWords / totalChapters).toLocaleString()}`);
  console.log(`💾 Chapter files saved to: ${outputDir}`);
  console.log(`📋 Mapping saved to: ${summaryPath}`);
  
  // Validation check
  console.log('\n🔍 Validation:');
  const targetChapters = 34;
  if (totalChapters === targetChapters) {
    console.log(`✅ Successfully divided into ${targetChapters} logical chapters as planned`);
  } else {
    console.log(`⚠️  Created ${totalChapters} chapters (target was ${targetChapters})`);
  }
  
  const targetWords = 220000;
  const percentOfTarget = (totalWords / targetWords * 100).toFixed(1);
  console.log(`📊 Word count: ${totalWords.toLocaleString()} (${percentOfTarget}% of estimated ${targetWords.toLocaleString()})`);
}

// Run the parser
parseChapters().catch(console.error);