#!/usr/bin/env tsx

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

interface BookBoundary {
  slug: string;
  title: string;
  startLine: number;
  endLine: number;
  testament: 'OT' | 'NT';
  bookNumber: number;
}

// Canonical book order with slugs
const BOOK_REGISTRY: Array<{ title: string; slug: string; testament: 'OT' | 'NT' }> = [
  // Old Testament (39 books)
  { title: 'Genesis', slug: 'genesis', testament: 'OT' },
  { title: 'Exodus', slug: 'exodus', testament: 'OT' },
  { title: 'Leviticus', slug: 'leviticus', testament: 'OT' },
  { title: 'Numbers', slug: 'numbers', testament: 'OT' },
  { title: 'Deuteronomy', slug: 'deuteronomy', testament: 'OT' },
  { title: 'Joshua', slug: 'joshua', testament: 'OT' },
  { title: 'Judges', slug: 'judges', testament: 'OT' },
  { title: 'Ruth', slug: 'ruth', testament: 'OT' },
  { title: '1 Samuel', slug: '1-samuel', testament: 'OT' },
  { title: '2 Samuel', slug: '2-samuel', testament: 'OT' },
  { title: '1 Kings', slug: '1-kings', testament: 'OT' },
  { title: '2 Kings', slug: '2-kings', testament: 'OT' },
  { title: '1 Chronicles', slug: '1-chronicles', testament: 'OT' },
  { title: '2 Chronicles', slug: '2-chronicles', testament: 'OT' },
  { title: 'Ezra', slug: 'ezra', testament: 'OT' },
  { title: 'Nehemiah', slug: 'nehemiah', testament: 'OT' },
  { title: 'Esther', slug: 'esther', testament: 'OT' },
  { title: 'Job', slug: 'job', testament: 'OT' },
  { title: 'Psalms', slug: 'psalms', testament: 'OT' },
  { title: 'Proverbs', slug: 'proverbs', testament: 'OT' },
  { title: 'Ecclesiastes', slug: 'ecclesiastes', testament: 'OT' },
  { title: 'Song of Solomon', slug: 'song-of-solomon', testament: 'OT' },
  { title: 'Isaiah', slug: 'isaiah', testament: 'OT' },
  { title: 'Jeremiah', slug: 'jeremiah', testament: 'OT' },
  { title: 'Lamentations', slug: 'lamentations', testament: 'OT' },
  { title: 'Ezekiel', slug: 'ezekiel', testament: 'OT' },
  { title: 'Daniel', slug: 'daniel', testament: 'OT' },
  { title: 'Hosea', slug: 'hosea', testament: 'OT' },
  { title: 'Joel', slug: 'joel', testament: 'OT' },
  { title: 'Amos', slug: 'amos', testament: 'OT' },
  { title: 'Obadiah', slug: 'obadiah', testament: 'OT' },
  { title: 'Jonah', slug: 'jonah', testament: 'OT' },
  { title: 'Micah', slug: 'micah', testament: 'OT' },
  { title: 'Nahum', slug: 'nahum', testament: 'OT' },
  { title: 'Habakkuk', slug: 'habakkuk', testament: 'OT' },
  { title: 'Zephaniah', slug: 'zephaniah', testament: 'OT' },
  { title: 'Haggai', slug: 'haggai', testament: 'OT' },
  { title: 'Zechariah', slug: 'zechariah', testament: 'OT' },
  { title: 'Malachi', slug: 'malachi', testament: 'OT' },
  // New Testament (27 books)
  { title: 'Matthew', slug: 'matthew', testament: 'NT' },
  { title: 'Mark', slug: 'mark', testament: 'NT' },
  { title: 'Luke', slug: 'luke', testament: 'NT' },
  { title: 'John', slug: 'john', testament: 'NT' },
  { title: 'Acts', slug: 'acts', testament: 'NT' },
  { title: 'Romans', slug: 'romans', testament: 'NT' },
  { title: '1 Corinthians', slug: '1-corinthians', testament: 'NT' },
  { title: '2 Corinthians', slug: '2-corinthians', testament: 'NT' },
  { title: 'Galatians', slug: 'galatians', testament: 'NT' },
  { title: 'Ephesians', slug: 'ephesians', testament: 'NT' },
  { title: 'Philippians', slug: 'philippians', testament: 'NT' },
  { title: 'Colossians', slug: 'colossians', testament: 'NT' },
  { title: '1 Thessalonians', slug: '1-thessalonians', testament: 'NT' },
  { title: '2 Thessalonians', slug: '2-thessalonians', testament: 'NT' },
  { title: '1 Timothy', slug: '1-timothy', testament: 'NT' },
  { title: '2 Timothy', slug: '2-timothy', testament: 'NT' },
  { title: 'Titus', slug: 'titus', testament: 'NT' },
  { title: 'Philemon', slug: 'philemon', testament: 'NT' },
  { title: 'Hebrews', slug: 'hebrews', testament: 'NT' },
  { title: 'James', slug: 'james', testament: 'NT' },
  { title: '1 Peter', slug: '1-peter', testament: 'NT' },
  { title: '2 Peter', slug: '2-peter', testament: 'NT' },
  { title: '1 John', slug: '1-john', testament: 'NT' },
  { title: '2 John', slug: '2-john', testament: 'NT' },
  { title: '3 John', slug: '3-john', testament: 'NT' },
  { title: 'Jude', slug: 'jude', testament: 'NT' },
  { title: 'Revelation', slug: 'revelation', testament: 'NT' }
];

/**
 * Normalize book title from KJV format to canonical name
 */
function normalizeBookTitle(line: string): string | null {
  const trimmed = line.trim();

  // Handle "The First Book of Moses: Called Genesis" format
  const mosesMatch = trimmed.match(/^The (First|Second|Third|Fourth|Fifth) Book of Moses: Called (\w+)$/);
  if (mosesMatch) {
    return mosesMatch[2]; // Returns Genesis, Exodus, etc.
  }

  // Handle "The Book of X" format
  const bookOfMatch = trimmed.match(/^The Book of (?:the )?(.*?)$/);
  if (bookOfMatch) {
    const title = bookOfMatch[1];
    // Handle "Prophet X" format
    if (title.startsWith('Prophet ')) {
      return title.replace('Prophet ', '');
    }
    return title;
  }

  // Handle "The First/Second Book of X" format
  const numberedBookMatch = trimmed.match(/^The (First|Second) Book of (?:the )?(.*?)$/);
  if (numberedBookMatch) {
    const num = numberedBookMatch[1] === 'First' ? '1' : '2';
    const name = numberedBookMatch[2];
    return `${num} ${name}`;
  }

  // Handle "The Gospel According to Saint X" format
  const gospelMatch = trimmed.match(/^The Gospel According to Saint (\w+)$/);
  if (gospelMatch) {
    return gospelMatch[1];
  }

  // Handle "The Acts of the Apostles"
  if (trimmed === 'The Acts of the Apostles') {
    return 'Acts';
  }

  // Handle "The Epistle of Paul the Apostle to the X"
  const paulineMatch = trimmed.match(/^The (?:First|Second)? ?Epistle of Paul the Apostle to (?:the )?(.*)$/);
  if (paulineMatch) {
    const title = trimmed;
    if (title.includes('First Epistle of Paul the Apostle to the Corinthians')) return '1 Corinthians';
    if (title.includes('Second Epistle of Paul the Apostle to the Corinthians')) return '2 Corinthians';
    if (title.includes('First Epistle of Paul the Apostle to the Thessalonians')) return '1 Thessalonians';
    if (title.includes('Second Epistle of Paul the Apostle to the Thessalonians')) return '2 Thessalonians';
    if (title.includes('First Epistle of Paul the Apostle to Timothy')) return '1 Timothy';
    if (title.includes('Second Epistle of Paul the Apostle to Timothy')) return '2 Timothy';
    if (title.includes('Epistle of Paul the Apostle to the Romans')) return 'Romans';
    if (title.includes('Epistle of Paul the Apostle to the Galatians')) return 'Galatians';
    if (title.includes('Epistle of Paul the Apostle to the Ephesians')) return 'Ephesians';
    if (title.includes('Epistle of Paul the Apostle to the Philippians')) return 'Philippians';
    if (title.includes('Epistle of Paul the Apostle to the Colossians')) return 'Colossians';
    if (title.includes('Epistle of Paul the Apostle to Titus')) return 'Titus';
    if (title.includes('Epistle of Paul the Apostle to Philemon')) return 'Philemon';
    if (title.includes('Epistle of Paul the Apostle to the Hebrews')) return 'Hebrews';
  }

  // Handle "The General Epistle of X" and variations
  if (trimmed.includes('Epistle')) {
    if (trimmed.includes('General Epistle of James')) return 'James';
    if (trimmed.includes('First Epistle General of Peter')) return '1 Peter';
    if (trimmed.includes('Second General Epistle of Peter')) return '2 Peter';
    if (trimmed.includes('First Epistle General of John')) return '1 John';
    if (trimmed.includes('Second Epistle General of John')) return '2 John';
    if (trimmed.includes('Third Epistle General of John')) return '3 John';
    if (trimmed.includes('General Epistle of Jude')) return 'Jude';
  }

  // Handle "The Revelation of Saint John the Divine"
  if (trimmed.includes('Revelation')) {
    return 'Revelation';
  }

  // Handle wisdom books
  if (trimmed === 'The Proverbs') return 'Proverbs';
  if (trimmed === 'Ecclesiastes') return 'Ecclesiastes';
  if (trimmed === 'The Song of Solomon') return 'Song of Solomon';
  if (trimmed === 'The Lamentations of Jeremiah') return 'Lamentations';

  // Handle single-word books (minor prophets + Ezra)
  const singleWordBooks = ['Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah',
                            'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Ezra'];
  if (singleWordBooks.includes(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Check if this line should be skipped (alternative title)
 */
function shouldSkipAlternativeTitle(lines: string[], index: number): boolean {
  if (index < 2) return false;

  // Check if there's an "Otherwise Called:" marker within the previous 3 lines
  for (let i = Math.max(0, index - 3); i < index; i++) {
    const line = lines[i]?.trim() || '';
    if (line.includes('Otherwise Called:') || line.includes('Commonly Called:')) {
      return true;
    }
  }

  return false;
}

/**
 * Find all book boundaries in the KJV source file
 */
function findBookBoundaries(lines: string[]): BookBoundary[] {
  const boundaries: BookBoundary[] = [];
  let currentBookStart: number | null = null;
  let currentBookTitle: string | null = null;

  // Build a lookup map from canonical names to registry entries
  const registryMap = new Map(BOOK_REGISTRY.map(entry => [entry.title, entry]));

  for (let i = 98; i < Math.min(lines.length, 99618); i++) { // Skip header, stop at footer
    const line = lines[i];
    const trimmed = line.trim();

    // Skip alternative titles
    if (shouldSkipAlternativeTitle(lines, i)) {
      console.log(`⏭️  Skipping alternative title at line ${i + 1}: ${trimmed}`);
      continue;
    }

    // Skip empty lines
    if (!trimmed) continue;

    // Skip verse lines (starts with digits followed by colon)
    if (/^\d+:\d+/.test(trimmed)) continue;

    const normalized = normalizeBookTitle(line);

    if (normalized && registryMap.has(normalized)) {
      // If we have a previous book, save its end boundary
      if (currentBookStart !== null && currentBookTitle !== null) {
        const registryEntry = registryMap.get(currentBookTitle)!;
        boundaries.push({
          slug: registryEntry.slug,
          title: currentBookTitle,
          startLine: currentBookStart,
          endLine: i - 1,
          testament: registryEntry.testament,
          bookNumber: boundaries.length + 1
        });
      }

      // Start tracking new book
      currentBookStart = i + 1; // Content starts on next line
      currentBookTitle = normalized;
    }
  }

  // Handle the last book (Revelation)
  if (currentBookStart !== null && currentBookTitle !== null) {
    const registryEntry = registryMap.get(currentBookTitle)!;
    boundaries.push({
      slug: registryEntry.slug,
      title: currentBookTitle,
      startLine: currentBookStart,
      endLine: 99617, // Known end of Revelation
      testament: registryEntry.testament,
      bookNumber: boundaries.length + 1
    });
  }

  return boundaries;
}

/**
 * Extract and write individual book files
 */
function extractBooks(sourcePath: string, outputDir: string): BookBoundary[] {
  console.log('📖 Parsing KJV Bible into 66 individual books...\n');

  // Read source file
  const fullText = readFileSync(sourcePath, 'utf-8');
  const lines = fullText.split('\n').map(line => line.replace(/\r$/, '')); // Handle CRLF

  console.log(`📄 Source file: ${lines.length.toLocaleString()} lines\n`);

  // Find all book boundaries
  const boundaries = findBookBoundaries(lines);

  console.log(`📚 Found ${boundaries.length} books\n`);
  console.log('='.repeat(80));

  // Extract each book
  for (const book of boundaries) {
    const bookDir = join(outputDir, book.slug, 'source');
    mkdirSync(bookDir, { recursive: true });

    // Extract book text (skip title line, get content)
    const bookLines = lines.slice(book.startLine, book.endLine + 1);

    // Skip empty lines at the start
    let contentStart = 0;
    while (contentStart < bookLines.length && !bookLines[contentStart].trim()) {
      contentStart++;
    }

    const bookText = bookLines.slice(contentStart).join('\n').trim();

    // Write to file
    const outputPath = join(bookDir, 'raw.txt');
    writeFileSync(outputPath, bookText, 'utf-8');

    const lineCount = bookLines.length - contentStart;
    const wordCount = bookText.split(/\s+/).length;

    console.log(`✅ ${book.title.padEnd(20)} | ${book.slug.padEnd(20)} | ${String(lineCount).padStart(6)} lines | ${String(wordCount).padStart(8)} words`);
  }

  console.log('='.repeat(80));
  console.log(`\n📊 Summary:`);
  console.log(`   Total books: ${boundaries.length}`);
  console.log(`   Old Testament: ${boundaries.filter(b => b.testament === 'OT').length}`);
  console.log(`   New Testament: ${boundaries.filter(b => b.testament === 'NT').length}`);

  return boundaries;
}

/**
 * Generate books-index.json with metadata
 */
function generateIndex(boundaries: BookBoundary[], outputDir: string): void {
  const indexPath = join(outputDir, 'books-index.json');

  const index = {
    totalBooks: boundaries.length,
    oldTestament: boundaries.filter(b => b.testament === 'OT').length,
    newTestament: boundaries.filter(b => b.testament === 'NT').length,
    books: boundaries.map(b => ({
      bookNumber: b.bookNumber,
      slug: b.slug,
      title: b.title,
      testament: b.testament,
      sourceLineRange: {
        start: b.startLine,
        end: b.endLine
      }
    }))
  };

  writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  console.log(`\n📋 Generated books index: ${indexPath}`);
}

// Main execution
async function main() {
  const sourcePath = join(process.cwd(), 'content', 'translations', 'books', 'the-bible', 'source-kjv.txt');
  const outputDir = join(process.cwd(), 'content', 'translations', 'books', 'the-bible');

  if (!existsSync(sourcePath)) {
    console.error(`❌ Source file not found: ${sourcePath}`);
    process.exit(1);
  }

  const boundaries = extractBooks(sourcePath, outputDir);
  generateIndex(boundaries, outputDir);

  console.log('\n✨ Done! All 66 books extracted successfully.\n');
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
