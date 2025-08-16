export interface ISBN {
  format: 'ebook' | 'paperback' | 'hardcover';
  isbn13: string;
}

export interface Pricing {
  format: 'ebook' | 'paperback' | 'hardcover';
  price: number;
  currency: string;
}

export interface PublishingFlags {
  kdp: boolean;
  lulu: boolean;
  ingram: boolean;
}

export interface BookMetadata {
  isbn?: ISBN[];
  publishDate?: Date;
  categories: string[];
  keywords: string[];
  pricing?: Pricing[];
  publishingFlags?: PublishingFlags;
  language?: string;
  pageCount?: number;
  dimensions?: {
    width: number;
    height: number;
    unit: 'inch' | 'cm';
  };
  copyright?: string;
  publisher?: string;
  edition?: string;
}