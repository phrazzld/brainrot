/**
 * Cover auto-processing capabilities for KDP publishing
 * Auto-converts format, corrects DPI, and normalizes cover images
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { createImageProcessor } from './imageProcessor';
import { validateCover, type CoverValidationSummary } from './coverValidation';

export interface CoverProcessingOptions {
  /** Target DPI for output image (default: 300 for print quality) */
  dpi?: number;
  /** Target format for output image (default: 'jpeg') */
  format?: 'jpeg' | 'png';
  /** Quality for JPEG compression (1-100, default: 90) */
  quality?: number;
  /** Whether to overwrite existing processed cover */
  force?: boolean;
  /** Whether to show detailed processing information */
  verbose?: boolean;
}

export interface ProcessingResult {
  success: boolean;
  inputPath: string;
  outputPath: string;
  processingSteps: string[];
  validation: CoverValidationSummary;
  error?: string;
}

export interface CoverProcessingReport {
  timestamp: string;
  bookSlug: string;
  originalFile: {
    path: string;
    exists: boolean;
    format?: string;
    width?: number;
    height?: number;
    size?: number;
    dpi?: number;
  };
  processedFile: {
    path: string;
    created: boolean;
    format: string;
    width?: number;
    height?: number;
    size?: number;
    dpi: number;
  };
  processing: ProcessingResult;
  validation: CoverValidationSummary;
}

/**
 * Auto-process cover image for KDP publishing
 * Converts to JPEG, sets 300 DPI, optimizes quality, normalizes filename
 */
export async function processCover(
  inputPath: string,
  outputDir: string,
  options: CoverProcessingOptions = {}
): Promise<ProcessingResult> {
  const {
    dpi = 300,
    format = 'jpeg',
    quality = 90,
    force = false,
    verbose = false
  } = options;

  const outputPath = path.join(outputDir, 'cover.jpg');
  const processingSteps: string[] = [];
  
  try {
    // Create image processor
    const processor = await createImageProcessor();
    if (verbose) {
      processingSteps.push(`Using image processor: ${processor.getName()}`);
    }

    // Get original metadata
    const originalMetadata = await processor.getMetadata(inputPath);
    processingSteps.push(`Original: ${originalMetadata.width}×${originalMetadata.height} ${originalMetadata.format.toUpperCase()}`);

    // Check if output already exists
    if (!force) {
      try {
        await fs.access(outputPath);
        processingSteps.push(`Output exists, skipping (use --force to overwrite)`);
        
        // Still validate the existing output
        const validation = await validateCover(outputPath);
        return {
          success: true,
          inputPath,
          outputPath,
          processingSteps,
          validation
        };
      } catch {
        // File doesn't exist, continue processing
      }
    }

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Process image based on available library
    if (processor.getName() === 'Sharp.js') {
      await processWithSharp(inputPath, outputPath, { dpi, format, quality, processingSteps });
    } else {
      await processWithJimp(inputPath, outputPath, { dpi, format, quality, processingSteps });
    }

    // Validate the processed cover
    const validation = await validateCover(outputPath, { verbose: true });
    
    processingSteps.push(`Processed cover saved to: ${outputPath}`);
    processingSteps.push(`Validation: ${validation.isValid ? 'PASSED' : 'FAILED'} (${validation.errors.length} errors, ${validation.warnings.length} warnings)`);

    return {
      success: true,
      inputPath,
      outputPath,
      processingSteps,
      validation
    };

  } catch (error) {
    processingSteps.push(`Processing failed: ${(error as Error).message}`);
    
    // Return failed validation if we can't process
    const validation: CoverValidationSummary = {
      isValid: false,
      hasWarnings: false,
      checks: [{
        name: "Cover Processing",
        status: "fail",
        message: `Failed to process cover: ${(error as Error).message}`
      }],
      errors: [{
        name: "Cover Processing", 
        status: "fail",
        message: `Failed to process cover: ${(error as Error).message}`
      }],
      warnings: [],
      suggestions: ["Check input file exists and is a valid image", "Ensure sufficient disk space for processing"]
    };

    return {
      success: false,
      inputPath,
      outputPath,
      processingSteps,
      validation,
      error: (error as Error).message
    };
  }
}

/**
 * Process image using Sharp.js (preferred)
 */
async function processWithSharp(
  inputPath: string,
  outputPath: string,
  options: { dpi: number; format: string; quality: number; processingSteps: string[] }
) {
  const sharp = (await import('sharp')).default;
  const { dpi, format, quality, processingSteps } = options;

  let pipeline = sharp(inputPath);

  // Get original metadata to determine processing steps
  const metadata = await pipeline.metadata();
  const originalWidth = metadata.width || 0;
  const originalHeight = metadata.height || 0;

  // Set DPI/density
  pipeline = pipeline.withMetadata({
    density: dpi
  });
  processingSteps.push(`Set DPI to ${dpi}`);

  // Convert format if needed
  if (format === 'jpeg') {
    pipeline = pipeline.jpeg({ 
      quality,
      mozjpeg: true // Use mozjpeg for better compression
    });
    processingSteps.push(`Converted to JPEG (quality: ${quality}%)`);
  } else if (format === 'png') {
    pipeline = pipeline.png({
      quality,
      compressionLevel: 6
    });
    processingSteps.push(`Converted to PNG (quality: ${quality}%)`);
  }

  // Check if dimensions meet KDP minimums, resize if needed
  if (originalWidth < 1000 || originalHeight < 1000) {
    // Scale to minimum 1600x2560 for good quality
    const aspectRatio = originalWidth / originalHeight;
    const targetHeight = Math.max(2560, Math.round(1600 / aspectRatio));
    const targetWidth = Math.max(1600, Math.round(targetHeight * aspectRatio));
    
    pipeline = pipeline.resize(targetWidth, targetHeight, {
      fit: 'fill',
      withoutEnlargement: false
    });
    processingSteps.push(`Upscaled to ${targetWidth}×${targetHeight} (minimum KDP requirements)`);
  }

  // Save processed image
  await pipeline.toFile(outputPath);
}

/**
 * Process image using Jimp (fallback)
 */
async function processWithJimp(
  inputPath: string,
  outputPath: string,
  options: { dpi: number; format: string; quality: number; processingSteps: string[] }
) {
  const { processingSteps } = options;
  
  // Simplified Jimp fallback - basic functionality only
  processingSteps.push(`Using Jimp fallback (limited processing capabilities)`);
  processingSteps.push(`Copying image with basic format validation`);
  
  // For now, just copy the file and report that advanced processing requires Sharp.js
  const fs = await import('fs/promises');
  try {
    await fs.copyFile(inputPath, outputPath);
    processingSteps.push(`Image copied to: ${outputPath}`);
    processingSteps.push(`Note: Advanced DPI, resizing, and format conversion require Sharp.js`);
    processingSteps.push(`Recommendation: Install Sharp.js for full processing capabilities`);
  } catch (error) {
    processingSteps.push(`File copy failed: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Process cover for a specific book and generate comprehensive report
 */
export async function processCoverForBook(
  bookSlug: string,
  inputCoverPath: string,
  generatedDir: string = './generated',
  options: CoverProcessingOptions = {}
): Promise<CoverProcessingReport> {
  const timestamp = new Date().toISOString();
  const outputDir = path.join(generatedDir, bookSlug);
  const outputPath = path.join(outputDir, 'cover.jpg');
  const reportPath = path.join(outputDir, 'validation.json');

  // Initialize report structure
  const report: CoverProcessingReport = {
    timestamp,
    bookSlug,
    originalFile: {
      path: inputCoverPath,
      exists: false
    },
    processedFile: {
      path: outputPath,
      created: false,
      format: 'jpeg',
      dpi: options.dpi || 300
    },
    processing: {
      success: false,
      inputPath: inputCoverPath,
      outputPath,
      processingSteps: [],
      validation: {
        isValid: false,
        hasWarnings: false,
        checks: [],
        errors: [],
        warnings: [],
        suggestions: []
      }
    },
    validation: {
      isValid: false,
      hasWarnings: false,
      checks: [],
      errors: [],
      warnings: [],
      suggestions: []
    }
  };

  try {
    // Check if input file exists
    try {
      await fs.access(inputCoverPath);
      report.originalFile.exists = true;

      // Get original file metadata
      const processor = await createImageProcessor();
      const metadata = await processor.getMetadata(inputCoverPath);
      report.originalFile = {
        ...report.originalFile,
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        size: metadata.size
      };
    } catch {
      report.processing.processingSteps.push(`Input file not found: ${inputCoverPath}`);
      report.processing.error = `Input file not found: ${inputCoverPath}`;
    }

    if (report.originalFile.exists) {
      // Process the cover
      const processingResult = await processCover(inputCoverPath, outputDir, options);
      report.processing = processingResult;
      
      // Check if processed file was created
      try {
        await fs.access(outputPath);
        report.processedFile.created = true;
        
        // Get processed file metadata
        const processor = await createImageProcessor();
        const metadata = await processor.getMetadata(outputPath);
        report.processedFile.width = metadata.width;
        report.processedFile.height = metadata.height;
        report.processedFile.size = metadata.size;
      } catch {
        report.processedFile.created = false;
      }

      report.validation = processingResult.validation;
    }

    // Write validation report
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    if (options.verbose) {
      console.log(`Validation report written to: ${reportPath}`);
    }

    return report;

  } catch (error) {
    report.processing.error = (error as Error).message;
    report.processing.processingSteps.push(`Unexpected error: ${(error as Error).message}`);

    // Still try to write the error report
    try {
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    } catch {
      // Silent fail on report writing
    }

    return report;
  }
}