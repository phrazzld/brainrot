#!/usr/bin/env tsx

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ChapterInfo {
  chapterNumber: number;
  verseCount: number;
  wordCount: number;
}

interface ChapterProgress {
  chapterNumber: number;
  status: 'not-started' | 'in-progress' | 'completed';
  lastUpdated?: string;
  wordCount?: number;
}

interface ProgressState {
  bookSlug: string;
  bookTitle: string;
  totalChapters: number;
  totalVerses: number;
  totalWords: number;
  chapters: ChapterProgress[];
  lastUpdated: string;
}

interface BookMetadata {
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
  books: BookMetadata[];
}

/**
 * Load or initialize progress state for a book
 */
function loadProgress(bookSlug: string, bookDir: string): ProgressState | null {
  const progressPath = join(bookDir, 'translation-memory', 'progress.json');

  if (existsSync(progressPath)) {
    const content = readFileSync(progressPath, 'utf-8');
    return JSON.parse(content);
  }

  return null;
}

/**
 * Initialize progress state from chapter-index.json
 */
function initializeProgress(bookSlug: string, bookDir: string, bookInfo: BookMetadata): ProgressState {
  const chapterIndexPath = join(bookDir, 'chapter-index.json');

  if (!existsSync(chapterIndexPath)) {
    throw new Error(`Chapter index not found for ${bookSlug}`);
  }

  const chapterIndexContent = readFileSync(chapterIndexPath, 'utf-8');
  const chapterIndex: { totalChapters: number; chapters: ChapterInfo[] } = JSON.parse(chapterIndexContent);

  const chapters: ChapterProgress[] = chapterIndex.chapters.map(ch => ({
    chapterNumber: ch.chapterNumber,
    status: 'not-started' as const,
    wordCount: ch.wordCount
  }));

  return {
    bookSlug,
    bookTitle: bookInfo.title,
    totalChapters: bookInfo.chapters,
    totalVerses: bookInfo.verses,
    totalWords: bookInfo.words,
    chapters,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Save progress state
 */
function saveProgress(progress: ProgressState, bookDir: string): void {
  const progressPath = join(bookDir, 'translation-memory', 'progress.json');
  progress.lastUpdated = new Date().toISOString();
  writeFileSync(progressPath, JSON.stringify(progress, null, 2), 'utf-8');
}

/**
 * Check if a chapter has been translated
 */
function checkChapterTranslated(bookSlug: string, chapterNum: number, bookDir: string): boolean {
  const padding = chapterNum >= 100 ? 3 : 2;
  const paddedNum = String(chapterNum).padStart(padding, '0');
  const brainrotPath = join(bookDir, 'brainrot', `chapter-${paddedNum}.md`);

  if (!existsSync(brainrotPath)) {
    return false;
  }

  // Check if file has substantial content (more than just a header)
  const content = readFileSync(brainrotPath, 'utf-8').trim();
  return content.length > 50; // Arbitrary threshold for "translated"
}

/**
 * Update progress based on actual file state
 */
function updateProgressFromFiles(progress: ProgressState, bookDir: string): void {
  for (const chapter of progress.chapters) {
    const isTranslated = checkChapterTranslated(progress.bookSlug, chapter.chapterNumber, bookDir);

    if (isTranslated && chapter.status === 'not-started') {
      chapter.status = 'completed';
      chapter.lastUpdated = new Date().toISOString();
    } else if (!isTranslated && chapter.status === 'completed') {
      chapter.status = 'not-started';
      chapter.lastUpdated = undefined;
    }
  }
}

/**
 * Calculate statistics
 */
function calculateStats(progress: ProgressState) {
  const completed = progress.chapters.filter(ch => ch.status === 'completed').length;
  const inProgress = progress.chapters.filter(ch => ch.status === 'in-progress').length;
  const notStarted = progress.chapters.filter(ch => ch.status === 'not-started').length;

  const completedWords = progress.chapters
    .filter(ch => ch.status === 'completed')
    .reduce((sum, ch) => sum + (ch.wordCount || 0), 0);

  const completionPercentage = ((completed / progress.totalChapters) * 100).toFixed(1);
  const remainingWords = progress.totalWords - completedWords;

  return {
    completed,
    inProgress,
    notStarted,
    completedWords,
    remainingWords,
    completionPercentage
  };
}

/**
 * Display progress for a book
 */
function displayProgress(progress: ProgressState): void {
  const stats = calculateStats(progress);

  console.log('\n' + '='.repeat(80));
  console.log(`📖 ${progress.bookTitle} Translation Progress`);
  console.log('='.repeat(80));
  console.log();
  console.log(`Testament: ${progress.bookTitle.includes('Genesis') ? 'Old Testament' : 'Check books-index.json'}`);
  console.log(`Total Chapters: ${progress.totalChapters}`);
  console.log(`Total Verses: ${progress.totalVerses.toLocaleString()}`);
  console.log(`Total Words: ${progress.totalWords.toLocaleString()}`);
  console.log();
  console.log('📊 Progress:');
  console.log(`   ✅ Completed: ${stats.completed}/${progress.totalChapters} chapters (${stats.completionPercentage}%)`);
  console.log(`   🔄 In Progress: ${stats.inProgress} chapters`);
  console.log(`   ⬜ Not Started: ${stats.notStarted} chapters`);
  console.log();
  console.log('📝 Word Count:');
  console.log(`   ✅ Translated: ${stats.completedWords.toLocaleString()} words`);
  console.log(`   ⏳ Remaining: ${stats.remainingWords.toLocaleString()} words`);
  console.log();

  // Progress bar
  const barLength = 50;
  const filledLength = Math.round((stats.completed / progress.totalChapters) * barLength);
  const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
  console.log(`Progress: [${bar}] ${stats.completionPercentage}%`);
  console.log();

  // Chapter list
  console.log('📑 Chapter Status:');
  console.log();

  const statusSymbol = {
    'completed': '✅',
    'in-progress': '🔄',
    'not-started': '⬜'
  };

  // Group chapters into rows of 10 for compact display
  for (let i = 0; i < progress.chapters.length; i += 10) {
    const rowChapters = progress.chapters.slice(i, i + 10);
    const chapterNums = rowChapters.map(ch =>
      String(ch.chapterNumber).padStart(3, ' ')
    ).join('  ');
    const statusSymbols = rowChapters.map(ch =>
      statusSymbol[ch.status]
    ).join('  ');

    console.log(`   ${chapterNums}`);
    console.log(`   ${statusSymbols}`);
    console.log();
  }

  console.log('='.repeat(80));
  console.log();
  console.log('Legend: ✅ Completed | 🔄 In Progress | ⬜ Not Started');
  console.log();
  console.log(`Last Updated: ${new Date(progress.lastUpdated).toLocaleString()}`);
  console.log();
}

/**
 * Mark a chapter with a specific status
 */
function markChapter(
  progress: ProgressState,
  chapterNumber: number,
  status: 'in-progress' | 'completed' | 'not-started'
): void {
  const chapter = progress.chapters.find(ch => ch.chapterNumber === chapterNumber);

  if (!chapter) {
    throw new Error(`Chapter ${chapterNumber} not found`);
  }

  chapter.status = status;
  chapter.lastUpdated = new Date().toISOString();
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: pnpm tsx scripts/bible-translation-helper.ts <book-slug> [options]');
    console.log();
    console.log('Options:');
    console.log('  --mark <chapter> <status>   Mark a chapter as in-progress, completed, or not-started');
    console.log('  --refresh                    Refresh status from actual files');
    console.log();
    console.log('Examples:');
    console.log('  pnpm tsx scripts/bible-translation-helper.ts genesis');
    console.log('  pnpm tsx scripts/bible-translation-helper.ts genesis --mark 1 in-progress');
    console.log('  pnpm tsx scripts/bible-translation-helper.ts genesis --mark 1 completed');
    console.log('  pnpm tsx scripts/bible-translation-helper.ts genesis --refresh');
    process.exit(0);
  }

  const bookSlug = args[0];
  const bibleDir = join(process.cwd(), 'content', 'translations', 'books', 'the-bible');
  const bookDir = join(bibleDir, bookSlug);

  if (!existsSync(bookDir)) {
    console.error(`❌ Book directory not found: ${bookSlug}`);
    console.error(`   Expected: ${bookDir}`);
    process.exit(1);
  }

  // Load books index to get book info
  const booksIndexPath = join(bibleDir, 'books-index.json');
  const booksIndexContent = readFileSync(booksIndexPath, 'utf-8');
  const booksIndex: BooksIndex = JSON.parse(booksIndexContent);

  const bookInfo = booksIndex.books.find(b => b.slug === bookSlug);
  if (!bookInfo) {
    console.error(`❌ Book not found in index: ${bookSlug}`);
    process.exit(1);
  }

  // Load or initialize progress
  let progress = loadProgress(bookSlug, bookDir);
  if (!progress) {
    console.log(`📝 Initializing progress tracking for ${bookInfo.title}...`);
    progress = initializeProgress(bookSlug, bookDir, bookInfo);
    saveProgress(progress, bookDir);
  }

  // Handle options
  if (args.includes('--refresh')) {
    console.log('🔄 Refreshing progress from files...');
    updateProgressFromFiles(progress, bookDir);
    saveProgress(progress, bookDir);
    console.log('✅ Progress refreshed');
  }

  if (args.includes('--mark')) {
    const markIndex = args.indexOf('--mark');
    const chapterNum = parseInt(args[markIndex + 1], 10);
    const status = args[markIndex + 2] as 'in-progress' | 'completed' | 'not-started';

    if (!chapterNum || !status) {
      console.error('❌ Usage: --mark <chapter> <status>');
      process.exit(1);
    }

    if (!['in-progress', 'completed', 'not-started'].includes(status)) {
      console.error('❌ Status must be: in-progress, completed, or not-started');
      process.exit(1);
    }

    markChapter(progress, chapterNum, status);
    saveProgress(progress, bookDir);
    console.log(`✅ Chapter ${chapterNum} marked as ${status}`);
  }

  // Display progress
  displayProgress(progress);
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
