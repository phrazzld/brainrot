import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { BlobService } from './BlobService';
import { BlobPathService } from './BlobPathService';
import { BlobBatchUploader } from './BlobBatchUploader';

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);
const writeFile = promisify(fs.writeFile);

export interface MigrationOptions {
  dryRun?: boolean;
  verbose?: boolean;
  logFile?: string;
}

export interface MigrationResult {
  migratedPaths: string[];
  errors: Array<{ path: string; error: string }>;
  skipped: string[];
  duration: number;
}

export interface PathMapping {
  oldPath: string;
  newPath: string;
}

/**
 * BlobMigrationService handles one-time migration tasks for blob storage
 * Such as moving from old path structures to new ones, or bulk operations
 */
export class BlobMigrationService {
  private readonly blobService: BlobService;
  private readonly pathService: BlobPathService;
  private readonly batchUploader: BlobBatchUploader;
  private migrationLog: string[] = [];

  constructor(
    blobService?: BlobService,
    pathService?: BlobPathService,
    batchUploader?: BlobBatchUploader
  ) {
    this.blobService = blobService || new BlobService();
    this.pathService = pathService || new BlobPathService();
    this.batchUploader = batchUploader || new BlobBatchUploader();
  }

  private log(message: string, options?: MigrationOptions): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    
    this.migrationLog.push(logEntry);
    
    if (options?.verbose) {
      console.log(logEntry);
    }
  }

  private async saveLogs(options?: MigrationOptions): Promise<void> {
    if (options?.logFile && this.migrationLog.length > 0) {
      const logContent = this.migrationLog.join('\n');
      await writeFile(options.logFile, logContent, 'utf8');
    }
  }

  /**
   * Migrate Great Gatsby markdown files to text format in blob storage
   * This is the critical migration needed to fix the 404 errors
   */
  public async migrateGreatGatsbyToText(
    markdownDir: string,
    options: MigrationOptions = {}
  ): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      migratedPaths: [],
      errors: [],
      skipped: [],
      duration: 0,
    };

    this.log('Starting Great Gatsby text migration', options);
    
    try {
      // Read all markdown files
      const files = await readdir(markdownDir);
      const markdownFiles = files.filter(f => f.endsWith('.md')).sort();
      
      this.log(`Found ${markdownFiles.length} markdown files to process`, options);

      for (const file of markdownFiles) {
        const filePath = path.join(markdownDir, file);
        
        try {
          // Read markdown content
          const content = await readFile(filePath, 'utf8');
          
          // Convert filename to appropriate text filename
          let textFilename: string;
          if (file.includes('introduction')) {
            textFilename = 'brainrot-introduction.txt';
          } else if (file.includes('chapter')) {
            const chapterMatch = file.match(/chapter[_-]?(\d+)/i);
            if (chapterMatch) {
              textFilename = `brainrot-chapter-${chapterMatch[1]}.txt`;
            } else {
              textFilename = file.replace('.md', '.txt');
            }
          } else {
            textFilename = file.replace('.md', '.txt');
          }

          // Generate blob path
          const blobPath = this.pathService.getTextPath('great-gatsby', textFilename);
          
          this.log(`Processing ${file} -> ${blobPath}`, options);

          if (!options.dryRun) {
            // Strip markdown formatting (simple version - you might want to use the converter package)
            let textContent = content;
            // Remove markdown headers
            textContent = textContent.replace(/^#{1,6}\s+/gm, '');
            // Remove bold/italic markers
            textContent = textContent.replace(/\*\*([^*]+)\*\*/g, '$1');
            textContent = textContent.replace(/\*([^*]+)\*/g, '$1');
            textContent = textContent.replace(/__([^_]+)__/g, '$1');
            textContent = textContent.replace(/_([^_]+)_/g, '$1');
            // Remove links
            textContent = textContent.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
            // Clean up extra whitespace
            textContent = textContent.replace(/\n{3,}/g, '\n\n');
            textContent = textContent.trim();

            // Upload to blob storage
            const uploadResult = await this.blobService.uploadText(
              textContent,
              blobPath,
              { 
                contentType: 'text/plain'
              } as any
            );
            
            if (uploadResult.checksum) {
              result.migratedPaths.push(blobPath);
              this.log(`✓ Uploaded ${blobPath}`, options);
            } else {
              result.skipped.push(blobPath);
              this.log(`⊙ Skipped ${blobPath} (unchanged)`, options);
            }
          } else {
            result.migratedPaths.push(blobPath);
            this.log(`[DRY RUN] Would upload ${blobPath}`, options);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          result.errors.push({ path: file, error: errorMsg });
          this.log(`✗ Error processing ${file}: ${errorMsg}`, options);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log(`Fatal error during migration: ${errorMsg}`, options);
      throw error;
    } finally {
      result.duration = Date.now() - startTime;
      this.log(`Migration completed in ${result.duration}ms`, options);
      this.log(`Migrated: ${result.migratedPaths.length}, Skipped: ${result.skipped.length}, Errors: ${result.errors.length}`, options);
      await this.saveLogs(options);
    }

    return result;
  }

  /**
   * Migrate files from old path structure to new path structure
   * @param mappings Array of path mappings
   * @param options Migration options
   */
  public async migratePaths(
    mappings: PathMapping[],
    options: MigrationOptions = {}
  ): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      migratedPaths: [],
      errors: [],
      skipped: [],
      duration: 0,
    };

    this.log(`Starting path migration for ${mappings.length} mappings`, options);

    for (const mapping of mappings) {
      try {
        this.log(`Migrating ${mapping.oldPath} -> ${mapping.newPath}`, options);
        
        if (!options.dryRun) {
          // Fetch content from old path
          const oldUrl = this.blobService.getUrlForPath(mapping.oldPath);
          const content = await this.blobService.fetchText(oldUrl);
          
          // Upload to new path
          await this.blobService.uploadText(content, mapping.newPath);
          
          // Delete old file
          await this.blobService.deleteFile(oldUrl);
          
          result.migratedPaths.push(mapping.newPath);
          this.log(`✓ Migrated ${mapping.oldPath} -> ${mapping.newPath}`, options);
        } else {
          result.migratedPaths.push(mapping.newPath);
          this.log(`[DRY RUN] Would migrate ${mapping.oldPath} -> ${mapping.newPath}`, options);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        result.errors.push({ path: mapping.oldPath, error: errorMsg });
        this.log(`✗ Error migrating ${mapping.oldPath}: ${errorMsg}`, options);
      }
    }

    result.duration = Date.now() - startTime;
    this.log(`Path migration completed in ${result.duration}ms`, options);
    await this.saveLogs(options);
    
    return result;
  }

  /**
   * Clean up duplicate or obsolete files in blob storage
   * @param options Cleanup options
   */
  public async cleanupObsoleteFiles(
    options: MigrationOptions & {
      patterns?: RegExp[];
      olderThan?: Date;
    } = {}
  ): Promise<{ deleted: string[]; kept: string[] }> {
    this.log('Starting cleanup of obsolete files', options);
    
    const result = await this.batchUploader.deleteOldAssets('', {
      dryRun: options.dryRun,
      exclude: options.patterns,
      olderThan: options.olderThan,
    });
    
    this.log(`Cleanup completed: ${result.deleted.length} deleted, ${result.kept.length} kept`, options);
    await this.saveLogs(options);
    
    return result;
  }

  /**
   * Verify that all expected book assets exist in blob storage
   * @param _bookSlug Book identifier (currently unused but kept for API consistency)
   * @param expectedFiles List of expected file paths
   */
  public async verifyBookAssets(
    _bookSlug: string,
    expectedFiles: string[]
  ): Promise<{
    existing: string[];
    missing: string[];
  }> {
    const result = {
      existing: [] as string[],
      missing: [] as string[],
    };

    for (const file of expectedFiles) {
      const url = this.blobService.getUrlForPath(file);
      
      try {
        await this.blobService.getFileInfo(url);
        result.existing.push(file);
      } catch {
        result.missing.push(file);
      }
    }

    return result;
  }

  /**
   * Generate a migration plan without executing it
   * @param sourceDir Source directory to analyze
   * @param bookSlug Book identifier for generating target paths
   */
  public async generateMigrationPlan(
    sourceDir: string,
    bookSlug: string
  ): Promise<PathMapping[]> {
    const mappings: PathMapping[] = [];
    
    const processDirectory = async (dir: string, assetType: string) => {
      try {
        const files = await readdir(dir);
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          const fileStat = await stat(filePath);
          
          if (fileStat.isFile()) {
            let newPath: string;
            
            switch (assetType) {
              case 'text':
                newPath = this.pathService.getTextPath(bookSlug, file);
                break;
              case 'images':
                newPath = this.pathService.getImagePath(bookSlug, file);
                break;
              case 'audio':
                newPath = this.pathService.getAudioPath(
                  bookSlug,
                  file.includes('full') ? 'full' : file.match(/\d+/)?.[0] || '1'
                );
                break;
              default:
                newPath = `${this.pathService.getBookBasePath(bookSlug)}/${assetType}/${file}`;
            }
            
            mappings.push({
              oldPath: filePath,
              newPath,
            });
          }
        }
      } catch (error) {
        console.error(`Error processing directory ${dir}:`, error);
      }
    };

    // Process different asset types
    await processDirectory(path.join(sourceDir, 'text'), 'text');
    await processDirectory(path.join(sourceDir, 'images'), 'images');
    await processDirectory(path.join(sourceDir, 'audio'), 'audio');
    
    return mappings;
  }
}

// Export a singleton instance
export const blobMigrationService = new BlobMigrationService();