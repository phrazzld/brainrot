#!/usr/bin/env tsx
import fs from 'fs/promises';
import yaml from 'js-yaml';
import path from 'path';

interface Chapter {
  title: string;
  text: string;
  audioSrc?: string;
}

interface Translation {
  slug: string;
  title: string;
  shortDescription: string;
  coverImage: string;
  status: 'available' | 'coming soon';
  purchaseUrl?: string;
  chapters: Chapter[];
}

interface BookMetadata {
  slug: string;
  title: string;
  author: string;
  translator?: string;
  description: string;
  original_year?: number;
  translation_year?: number;
  purchaseUrl?: string;
}

interface TranslationsManifest {
  timestamp: string;
  version: string;
  translations: Translation[];
}

/**
 * Parse existing metadata.yaml format
 * Custom parser for the current YAML structure
 */
async function parseExistingMetadata(
  metadataPath: string,
  slug: string,
): Promise<BookMetadata | null> {
  try {
    const content = await fs.readFile(metadataPath, 'utf8');
    const yamlData = yaml.load(content) as any;

    if (!yamlData || !yamlData.title) {
      console.warn(`Invalid metadata in ${metadataPath}`);
      return null;
    }

    return {
      slug,
      title: yamlData.title,
      author: yamlData.author || 'Unknown Author',
      translator: yamlData.translator,
      description: yamlData.description || `A Gen Z retelling of ${yamlData.title}`,
      original_year: yamlData.original_year,
      translation_year: yamlData.translation_year,
      purchaseUrl: yamlData.purchaseUrl,
    };
  } catch (error) {
    console.warn(`Failed to parse metadata ${metadataPath}:`, error);
    return null;
  }
}

/**
 * Scan directories and parse existing metadata format
 * Following pattern from @brainrot/metadata but using existing format
 */
async function getBookListFromExistingFormat(rootDir: string): Promise<BookMetadata[]> {
  const books: BookMetadata[] = [];

  try {
    const entries = await fs.readdir(rootDir);

    for (const entry of entries) {
      const entryPath = path.join(rootDir, entry);
      const entryStat = await fs.stat(entryPath);

      if (entryStat.isDirectory()) {
        const metadataPath = path.join(entryPath, 'metadata.yaml');

        try {
          const metadataStat = await fs.stat(metadataPath);
          if (metadataStat.isFile()) {
            const metadata = await parseExistingMetadata(metadataPath, entry);
            if (metadata) {
              books.push(metadata);
            }
          }
        } catch {
          // No metadata.yaml file, skip
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning for books in ${rootDir}:`, error);
  }

  // Sort by title
  books.sort((a, b) => a.title.localeCompare(b.title));

  return books;
}

/**
 * Extract chapter title from filename or content
 * Following pattern from batchConverter.ts:131-160
 */
function extractChapterTitle(filename: string, content: string): string {
  // Try to extract from filename first
  const match = filename.match(/^(\d+[-._])?(.+)\.txt$/);
  if (match) {
    return match[2].replace(/[-_]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  // Fallback to first line if it looks like a title
  const firstLine = content.split('\n')[0].trim();
  if (firstLine.length > 0 && firstLine.length < 100) {
    return firstLine.replace(/^#+\s*/, ''); // Remove markdown headers
  }

  return filename.replace('.txt', '');
}

/**
 * Discover and parse text chapters for a book
 * Following pattern from batchConverter.ts:46-69
 */
async function discoverChapters(slug: string): Promise<Chapter[]> {
  const chapters: Chapter[] = [];

  // Primary path: generated/text/*.txt (preferred)
  const generatedTextPath = path.join(process.cwd(), '../../generated', slug);

  try {
    const files = await fs.readdir(generatedTextPath);
    const textFiles = files
      .filter((file) => file.endsWith('.txt'))
      .filter((file) => !file.includes('legal') && !file.includes('metadata'))
      .sort();

    for (const file of textFiles) {
      const filePath = path.join(generatedTextPath, file);
      const content = await fs.readFile(filePath, 'utf8');

      chapters.push({
        title: extractChapterTitle(file, content),
        text: content,
        // audioSrc will be populated later if audio files exist
      });
    }

    return chapters;
  } catch (error) {
    // Fallback: content/translations/books/{slug}/brainrot/
    console.warn(`Generated text not found for ${slug}, checking brainrot folder...`);

    const brainrotPath = path.join(
      process.cwd(),
      '../../content/translations/books',
      slug,
      'brainrot',
    );

    try {
      const files = await fs.readdir(brainrotPath);
      const textFiles = files.filter((file) => file.endsWith('.md')).sort();

      for (const file of textFiles) {
        const filePath = path.join(brainrotPath, file);
        const content = await fs.readFile(filePath, 'utf8');

        chapters.push({
          title: extractChapterTitle(file.replace('.md', '.txt'), content),
          text: content,
        });
      }

      return chapters;
    } catch (fallbackError) {
      console.warn(`No chapters found for ${slug} in either generated or brainrot folders`);
      return [];
    }
  }
}

/**
 * Generate blob storage URL for cover image
 */
function generateCoverImageUrl(slug: string): string {
  const blobBaseUrl =
    process.env.NEXT_PUBLIC_BLOB_BASE_URL ||
    'https://82qos1wlxbd4iq1g.public.blob.vercel-storage.com';
  return `${blobBaseUrl}/books/${slug}/images/cover.jpg`;
}

/**
 * Determine book status based on available content
 */
function determineBookStatus(chapters: Chapter[]): 'available' | 'coming soon' {
  return chapters.length > 0 ? 'available' : 'coming soon';
}

/**
 * Generate translations manifest
 * Following pattern from checkMissingAudio.ts:247-264
 */
async function generateTranslationsManifest(): Promise<void> {
  console.log('🔍 Scanning for book metadata...');

  const contentPath = path.join(process.cwd(), '../../content/translations/books');
  console.log(`📁 Scanning path: ${contentPath}`);

  // Check if the path exists
  try {
    const stat = await fs.stat(contentPath);
    console.log(`✓ Path exists and is ${stat.isDirectory() ? 'directory' : 'file'}`);
  } catch (error) {
    console.error(`❌ Path does not exist: ${error}`);
    process.exit(1);
  }

  const books = await getBookListFromExistingFormat(contentPath);

  console.log(`📚 Found ${books.length} books with metadata`);

  const translations: Translation[] = [];

  for (const book of books) {
    console.log(`📖 Processing ${book.slug}...`);

    const chapters = await discoverChapters(book.slug);
    const status = determineBookStatus(chapters);

    translations.push({
      slug: book.slug,
      title: book.title,
      shortDescription: book.description || `A Gen Z retelling of ${book.title}`,
      coverImage: generateCoverImageUrl(book.slug),
      status,
      purchaseUrl: book.purchaseUrl,
      chapters,
    });

    console.log(`  ✓ ${chapters.length} chapters, status: ${status}`);
  }

  const manifest: TranslationsManifest = {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    translations,
  };

  // Ensure .generated directory exists
  const outputDir = path.join(process.cwd(), '.generated');
  await fs.mkdir(outputDir, { recursive: true });

  // Write manifest file
  const outputPath = path.join(outputDir, 'translations.json');
  await fs.writeFile(outputPath, JSON.stringify(manifest, null, 2));

  console.log(`✅ Generated translations manifest at ${outputPath}`);
  console.log(
    `📊 ${translations.length} translations, ${translations.reduce((acc, t) => acc + t.chapters.length, 0)} total chapters`,
  );

  // Validate that all required fields are present
  const invalid = translations.filter((t) => !t.slug || !t.title || !t.coverImage);
  if (invalid.length > 0) {
    console.error(
      '❌ Build failed: Invalid metadata for books:',
      invalid.map((t) => t.slug),
    );
    process.exit(1);
  }

  console.log('🎉 Manifest generation completed successfully');
}

// Run the script (ES module equivalent of require.main === module)
if (import.meta.url === `file://${process.argv[1]}`) {
  generateTranslationsManifest().catch((error) => {
    console.error('❌ Manifest generation failed:', error);
    process.exit(1);
  });
}

export { generateTranslationsManifest };
