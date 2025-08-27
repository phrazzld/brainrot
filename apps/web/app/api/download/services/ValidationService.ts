import { Logger } from '@/utils/logger';

/**
 * Validation result with success/failure status and errors
 */
export interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

/**
 * Individual validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
  value?: unknown;
}

/**
 * Download request parameters to validate
 */
export interface DownloadParams {
  slug?: string;
  type?: string;
  chapter?: string;
  proxy?: string;
}

/**
 * Validated download parameters
 */
export interface ValidatedDownloadParams {
  slug: string;
  type: 'full' | 'chapter';
  chapter?: number;
  isProxy: boolean;
}

/**
 * Configuration for ValidationService
 */
export interface ValidationServiceConfig {
  logger?: Logger;
  validTypes?: string[];
  slugPattern?: RegExp;
  maxChapter?: number;
}

/**
 * Default valid download types
 */
const DEFAULT_VALID_TYPES = ['full', 'chapter'];

/**
 * Default slug pattern (alphanumeric with hyphens)
 */
const DEFAULT_SLUG_PATTERN = /^[a-zA-Z0-9-]+$/;

/**
 * Validates download request parameters
 */
export function validateDownloadParams(
  params: DownloadParams,
  config: ValidationServiceConfig = {},
): ValidationResult<ValidatedDownloadParams> {
  const {
    logger = console,
    validTypes = DEFAULT_VALID_TYPES,
    slugPattern = DEFAULT_SLUG_PATTERN,
    maxChapter = 999,
  } = config;

  const errors: ValidationError[] = [];

  // Validate slug (required)
  if (!params.slug) {
    errors.push({
      field: 'slug',
      message: 'Missing required parameter: slug',
      code: 'MISSING_SLUG',
    });
    logger.warn?.({ msg: 'Missing required parameter', param: 'slug' });
  } else if (!slugPattern.test(params.slug)) {
    errors.push({
      field: 'slug',
      message: 'Invalid slug format',
      code: 'INVALID_SLUG',
      value: params.slug,
    });
    logger.warn?.({ msg: 'Invalid slug format', param: 'slug', value: params.slug });
  }

  // Validate type (required)
  if (!params.type) {
    errors.push({
      field: 'type',
      message: 'Missing required parameter: type',
      code: 'MISSING_TYPE',
    });
    logger.warn?.({ msg: 'Missing required parameter', param: 'type' });
  } else if (!validTypes.includes(params.type)) {
    errors.push({
      field: 'type',
      message: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
      code: 'INVALID_TYPE',
      value: params.type,
    });
    logger.warn?.({ msg: 'Invalid value for parameter', param: 'type', value: params.type });
  }

  // Validate chapter (required if type is 'chapter')
  if (params.type === 'chapter') {
    if (!params.chapter) {
      errors.push({
        field: 'chapter',
        message: 'Missing required parameter: chapter (required when type is "chapter")',
        code: 'MISSING_CHAPTER',
      });
      logger.warn?.({ msg: 'Missing required parameter', param: 'chapter' });
    } else {
      const chapterNum = parseInt(params.chapter, 10);
      if (isNaN(chapterNum) || chapterNum < 1 || chapterNum > maxChapter) {
        errors.push({
          field: 'chapter',
          message: `Invalid chapter number. Must be between 1 and ${maxChapter}`,
          code: 'INVALID_CHAPTER',
          value: params.chapter,
        });
        logger.warn?.({ msg: 'Invalid chapter number', param: 'chapter', value: params.chapter });
      }
    }
  }

  // Return validation result
  if (errors.length > 0) {
    return {
      success: false,
      errors,
    };
  }

  // Build validated params
  const validatedParams: ValidatedDownloadParams = {
    slug: params.slug || '',
    type: params.type as 'full' | 'chapter',
    isProxy: params.proxy === 'true',
  };

  if (params.type === 'chapter' && params.chapter) {
    validatedParams.chapter = parseInt(params.chapter, 10);
  }

  return {
    success: true,
    data: validatedParams,
  };
}

/**
 * Validates a single parameter value
 */
export function validateParameter(
  name: string,
  value: unknown,
  validator: (val: unknown) => boolean,
  errorMessage: string,
): ValidationResult {
  if (!validator(value)) {
    return {
      success: false,
      errors: [
        {
          field: name,
          message: errorMessage,
          value,
        },
      ],
    };
  }

  return {
    success: true,
    data: value,
  };
}

/**
 * Factory function to create ValidationService
 */
export function createValidationService(config: ValidationServiceConfig = {}) {
  return {
    validateDownloadParams: (params: DownloadParams) => validateDownloadParams(params, config),
    validateParameter,
  };
}
