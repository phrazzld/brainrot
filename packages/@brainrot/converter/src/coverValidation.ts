/**
 * Cover validation functions for KDP publishing requirements
 * Provides structured validation results with pass/fail/warning status
 */

import { getImageMetadata, type ImageMetadata } from './imageProcessor';

export interface ValidationResult {
  name: string;
  status: "pass" | "fail" | "warning";
  message?: string;
}

export interface CoverValidationOptions {
  /** Whether to enforce strict validation (warnings become failures) */
  strict?: boolean;
  /** Whether to include detailed messages in results */
  verbose?: boolean;
}

export interface CoverValidationSummary {
  isValid: boolean;
  hasWarnings: boolean;
  checks: ValidationResult[];
  errors: ValidationResult[];
  warnings: ValidationResult[];
  suggestions: string[];
}

/**
 * Validate cover image dimensions according to KDP requirements
 * - Minimum: 1000x1000 pixels (blocking)
 * - Recommended: 1600x2560 pixels (warning if smaller)
 * - Aspect ratio: 0.625:1 (1600x2560) recommended
 */
export function validateDimensions(
  metadata: ImageMetadata,
  options: CoverValidationOptions = {}
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const { width, height } = metadata;

  // Check minimum dimensions (blocking requirement)
  if (width < 1000 || height < 1000) {
    results.push({
      name: "Cover Dimensions",
      status: "fail",
      message: `${width}×${height} - Must be at least 1000×1000 pixels for KDP`
    });
    return results; // Stop here if minimum not met
  }

  // Check recommended dimensions
  if (width < 1600 || height < 2560) {
    const status = options.strict ? "fail" : "warning";
    results.push({
      name: "Cover Dimensions",
      status,
      message: `${width}×${height} - Recommended: 1600×2560 pixels for best quality`
    });
  } else {
    results.push({
      name: "Cover Dimensions",
      status: "pass",
      message: options.verbose ? `${width}×${height} - Excellent quality` : undefined
    });
  }

  // Check aspect ratio
  const aspectRatio = width / height;
  const idealRatio = 1600 / 2560; // 0.625
  const ratioTolerance = 0.1;

  if (Math.abs(aspectRatio - idealRatio) > ratioTolerance) {
    const status = options.strict ? "fail" : "warning";
    results.push({
      name: "Cover Aspect Ratio", 
      status,
      message: `${aspectRatio.toFixed(2)}:1 - Recommended: ${idealRatio.toFixed(3)}:1 (${1600}×${2560})`
    });
  } else {
    results.push({
      name: "Cover Aspect Ratio",
      status: "pass", 
      message: options.verbose ? `${aspectRatio.toFixed(2)}:1 - Good book proportions` : undefined
    });
  }

  return results;
}

/**
 * Validate cover image format according to KDP requirements
 * Supported formats: JPEG, PNG, TIFF
 */
export function validateFormat(
  metadata: ImageMetadata,
  options: CoverValidationOptions = {}
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const format = metadata.format?.toUpperCase();
  const supportedFormats = ["JPEG", "JPG", "PNG", "TIFF", "TIF"];

  if (!format || !supportedFormats.includes(format)) {
    results.push({
      name: "Cover Format",
      status: "fail",
      message: `${format || "Unknown"} format - Must be JPEG, PNG, or TIFF`
    });
  } else {
    // Normalize JPG to JPEG, TIF to TIFF for display
    const displayFormat = format === "JPG" ? "JPEG" : format === "TIF" ? "TIFF" : format;
    results.push({
      name: "Cover Format",
      status: "pass",
      message: options.verbose ? `${displayFormat} - Supported format` : undefined
    });
  }

  return results;
}

/**
 * Validate cover image file size according to KDP requirements
 * - Maximum: 50MB (blocking)
 * - Recommended: Under 5MB (warning if larger)
 * - Optimal: 1-3MB range
 */
export function validateFileSize(
  metadata: ImageMetadata,
  options: CoverValidationOptions = {}
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const sizeMB = metadata.size / (1024 * 1024);

  // Check maximum size (blocking requirement)
  if (sizeMB > 50) {
    results.push({
      name: "Cover File Size",
      status: "fail",
      message: `${sizeMB.toFixed(1)}MB - Must be under 50MB for KDP upload`
    });
    return results;
  }

  // Check recommended size
  if (sizeMB > 5) {
    const status = options.strict ? "fail" : "warning";
    results.push({
      name: "Cover File Size",
      status,
      message: `${sizeMB.toFixed(1)}MB - Recommended: Under 5MB for faster uploads`
    });
  } else if (sizeMB >= 1 && sizeMB <= 3) {
    results.push({
      name: "Cover File Size",
      status: "pass",
      message: options.verbose ? `${sizeMB.toFixed(1)}MB - Optimal size` : undefined
    });
  } else if (sizeMB < 1) {
    const status = options.strict ? "fail" : "warning";
    results.push({
      name: "Cover File Size",
      status,
      message: `${sizeMB.toFixed(1)}MB - May appear pixelated, consider higher quality image`
    });
  } else {
    results.push({
      name: "Cover File Size",
      status: "pass",
      message: options.verbose ? `${sizeMB.toFixed(1)}MB - Good size` : undefined
    });
  }

  return results;
}

/**
 * Comprehensive cover validation function
 * Validates dimensions, format, and file size in one call
 */
export async function validateCover(
  imagePath: string,
  options: CoverValidationOptions = {}
): Promise<CoverValidationSummary> {
  try {
    // Get image metadata using the image processor
    const metadata = await getImageMetadata(imagePath);

    // Run all validation checks
    const allChecks: ValidationResult[] = [
      ...validateDimensions(metadata, options),
      ...validateFormat(metadata, options), 
      ...validateFileSize(metadata, options)
    ];

    // Categorize results
    const errors = allChecks.filter(check => check.status === "fail");
    const warnings = allChecks.filter(check => check.status === "warning");
    const isValid = errors.length === 0;
    const hasWarnings = warnings.length > 0;

    // Generate suggestions based on failures and warnings
    const suggestions: string[] = [];
    const allIssues = [...errors, ...warnings];
    
    if (allIssues.some(e => e.name === "Cover Dimensions")) {
      suggestions.push("Create or resize your cover to at least 1600×2560 pixels");
    }
    
    if (allIssues.some(e => e.name === "Cover Format")) {
      suggestions.push("Convert your cover to JPEG, PNG, or TIFF format");
    }
    
    if (allIssues.some(e => e.name === "Cover File Size")) {
      if (metadata.size > 50 * 1024 * 1024) {
        suggestions.push("Reduce file size to under 50MB (compress image or reduce dimensions)");
      }
      if (metadata.size < 1024 * 1024) {
        suggestions.push("Use a higher quality image to avoid pixelation (target 1-5MB)");
      }
    }

    if (warnings.length > 0 && !options.strict) {
      suggestions.push("Consider addressing warnings for optimal publishing results");
    }

    return {
      isValid,
      hasWarnings,
      checks: allChecks,
      errors,
      warnings,
      suggestions
    };

  } catch (error) {
    // Handle metadata extraction failures
    const errorCheck: ValidationResult = {
      name: "Cover Analysis",
      status: "fail",
      message: `Could not analyze cover image: ${(error as Error).message}`
    };

    return {
      isValid: false,
      hasWarnings: false,
      checks: [errorCheck],
      errors: [errorCheck],
      warnings: [],
      suggestions: [
        "Ensure the cover file exists and is a valid image",
        "Check file permissions and path"
      ]
    };
  }
}

/**
 * Quick validation check - returns true if cover meets minimum requirements
 */
export async function isCoverValid(imagePath: string): Promise<boolean> {
  const result = await validateCover(imagePath, { strict: false });
  return result.isValid;
}

/**
 * Get validation suggestions for a cover without full validation
 */
export async function getCoverSuggestions(imagePath: string): Promise<string[]> {
  const result = await validateCover(imagePath, { verbose: true });
  return result.suggestions;
}