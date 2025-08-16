/**
 * JSON schemas for metadata validation
 */

import { JSONSchemaType } from 'ajv';

export interface BookISBN {
  isbn13: string;
  format: 'ebook' | 'paperback' | 'hardcover' | 'audiobook';
}

export interface BookPricing {
  ebook?: number;
  paperback?: number;
  hardcover?: number;
  audiobook?: number;
}

export interface PublishingConfig {
  kdp?: boolean;
  lulu?: boolean;
  ingram?: boolean;
  draft2digital?: boolean;
}

export interface BookMetadata {
  // Basic information
  slug: string;
  title: string;
  subtitle?: string;
  author: string;
  translator?: string;
  originalAuthor?: string;
  originalTitle?: string;
  
  // Publishing details
  publisher?: string;
  publishDate?: string;
  language?: string;
  
  // ISBNs for different formats
  isbns?: BookISBN[];
  
  // Categorization
  categories?: string[];
  keywords?: string[];
  tags?: string[];
  
  // Pricing
  pricing?: BookPricing;
  
  // Publishing platforms
  publishing?: PublishingConfig;
  
  // Book details
  pageCount?: number;
  wordCount?: number;
  readingTime?: number; // in minutes
  
  // Description
  description?: string;
  shortDescription?: string;
  
  // Marketing
  marketingCopy?: string;
  targetAudience?: string;
  comparableBooks?: string[];
  
  // Files and assets
  coverImage?: string;
  hasAudio?: boolean;
  hasVideo?: boolean;
  
  // Internal metadata
  status?: 'draft' | 'review' | 'published' | 'archived';
  createdAt?: string;
  updatedAt?: string;
  version?: string;
}

export const bookMetadataSchema: JSONSchemaType<BookMetadata> = {
  type: 'object',
  properties: {
    // Required fields
    slug: {
      type: 'string',
      pattern: '^[a-z0-9-]+$',
      minLength: 1,
      maxLength: 100,
    },
    title: {
      type: 'string',
      minLength: 1,
      maxLength: 300,
    },
    author: {
      type: 'string',
      minLength: 1,
      maxLength: 200,
    },
    
    // Optional fields
    subtitle: {
      type: 'string',
      nullable: true,
      maxLength: 300,
    },
    translator: {
      type: 'string',
      nullable: true,
      maxLength: 200,
    },
    originalAuthor: {
      type: 'string',
      nullable: true,
      maxLength: 200,
    },
    originalTitle: {
      type: 'string',
      nullable: true,
      maxLength: 300,
    },
    publisher: {
      type: 'string',
      nullable: true,
      maxLength: 200,
    },
    publishDate: {
      type: 'string',
      nullable: true,
      pattern: '^\\d{4}-\\d{2}-\\d{2}$', // YYYY-MM-DD format
    },
    language: {
      type: 'string',
      nullable: true,
      pattern: '^[a-z]{2}(-[A-Z]{2})?$', // ISO language code
    },
    
    // ISBNs array
    isbns: {
      type: 'array',
      nullable: true,
      items: {
        type: 'object',
        properties: {
          isbn13: {
            type: 'string',
            pattern: '^(97[89])[- ]?\\d{1}[- ]?\\d{6}[- ]?\\d{2}[- ]?\\d{1}$',
          },
          format: {
            type: 'string',
            enum: ['ebook', 'paperback', 'hardcover', 'audiobook'],
          },
        },
        required: ['isbn13', 'format'],
      },
    },
    
    // Categories, keywords, tags
    categories: {
      type: 'array',
      nullable: true,
      items: {
        type: 'string',
        maxLength: 100,
      },
      maxItems: 10,
    },
    keywords: {
      type: 'array',
      nullable: true,
      items: {
        type: 'string',
        maxLength: 50,
      },
      maxItems: 20,
    },
    tags: {
      type: 'array',
      nullable: true,
      items: {
        type: 'string',
        maxLength: 30,
      },
      maxItems: 30,
    },
    
    // Pricing
    pricing: {
      type: 'object',
      nullable: true,
      properties: {
        ebook: {
          type: 'number',
          nullable: true,
          minimum: 0,
          maximum: 999.99,
        },
        paperback: {
          type: 'number',
          nullable: true,
          minimum: 0,
          maximum: 999.99,
        },
        hardcover: {
          type: 'number',
          nullable: true,
          minimum: 0,
          maximum: 999.99,
        },
        audiobook: {
          type: 'number',
          nullable: true,
          minimum: 0,
          maximum: 999.99,
        },
      },
      additionalProperties: false,
    },
    
    // Publishing config
    publishing: {
      type: 'object',
      nullable: true,
      properties: {
        kdp: {
          type: 'boolean',
          nullable: true,
        },
        lulu: {
          type: 'boolean',
          nullable: true,
        },
        ingram: {
          type: 'boolean',
          nullable: true,
        },
        draft2digital: {
          type: 'boolean',
          nullable: true,
        },
      },
      additionalProperties: false,
    },
    
    // Book details
    pageCount: {
      type: 'integer',
      nullable: true,
      minimum: 1,
      maximum: 10000,
    },
    wordCount: {
      type: 'integer',
      nullable: true,
      minimum: 1,
      maximum: 1000000,
    },
    readingTime: {
      type: 'integer',
      nullable: true,
      minimum: 1,
      maximum: 10000,
    },
    
    // Descriptions
    description: {
      type: 'string',
      nullable: true,
      maxLength: 5000,
    },
    shortDescription: {
      type: 'string',
      nullable: true,
      maxLength: 500,
    },
    
    // Marketing
    marketingCopy: {
      type: 'string',
      nullable: true,
      maxLength: 2000,
    },
    targetAudience: {
      type: 'string',
      nullable: true,
      maxLength: 500,
    },
    comparableBooks: {
      type: 'array',
      nullable: true,
      items: {
        type: 'string',
        maxLength: 200,
      },
      maxItems: 10,
    },
    
    // Assets
    coverImage: {
      type: 'string',
      nullable: true,
      maxLength: 500,
    },
    hasAudio: {
      type: 'boolean',
      nullable: true,
    },
    hasVideo: {
      type: 'boolean',
      nullable: true,
    },
    
    // Internal metadata
    status: {
      type: 'string',
      nullable: true,
      enum: ['draft', 'review', 'published', 'archived'],
    },
    createdAt: {
      type: 'string',
      nullable: true,
      pattern: '^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2}(\\.\\d{3})?Z)?$',
    },
    updatedAt: {
      type: 'string',
      nullable: true,
      pattern: '^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2}(\\.\\d{3})?Z)?$',
    },
    version: {
      type: 'string',
      nullable: true,
      pattern: '^\\d+\\.\\d+\\.\\d+$',
    },
  },
  required: ['slug', 'title', 'author'],
  additionalProperties: false,
};

/**
 * Default metadata values for inheritance
 */
export const defaultMetadata: Partial<BookMetadata> = {
  publisher: 'Brainrot Publishing House',
  language: 'en-US',
  status: 'draft',
  version: '1.0.0',
  categories: ['Fiction / Classics', 'Humor / Parody', 'Young Adult / General'],
  publishing: {
    kdp: true,
    lulu: true,
    ingram: false,
    draft2digital: false,
  },
  pricing: {
    ebook: 4.99,
    paperback: 14.99,
    hardcover: 24.99,
  },
};