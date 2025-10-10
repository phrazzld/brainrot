/**
 * KDP (Kindle Direct Publishing) Domain Types
 *
 * Core data structures for Amazon KDP book management, sales tracking,
 * and account operations.
 */

/**
 * Status of a book in the KDP publishing workflow
 */
export type BookStatus =
  | "draft" // Book created but not submitted
  | "in_review" // Submitted and under Amazon review
  | "live" // Published and available for sale
  | "unpublished" // Previously live, now taken offline
  | "blocked"; // Blocked by Amazon (content violation, rights issue, etc.)

/**
 * Available book formats on KDP
 */
export type BookFormat = "ebook" | "paperback" | "hardcover";

/**
 * Core book information from KDP bookshelf
 */
export interface KdpBook {
  /** Amazon Standard Identification Number */
  asin: string;

  /** Book title */
  title: string;

  /** Primary author name */
  author: string;

  /** Current publishing status */
  status: BookStatus;

  /** Available formats for this book */
  formats: BookFormat[];

  /** Date when book was first published (undefined for drafts) */
  publishedDate?: Date;

  /** Last modification timestamp */
  lastModified: Date;
}

/**
 * Extended book details including metadata and pricing
 */
export interface KdpBookDetails extends KdpBook {
  /** Book subtitle (optional) */
  subtitle?: string;

  /** Book description/blurb */
  description: string;

  /** Search keywords (up to 7) */
  keywords: string[];

  /** Amazon category assignments */
  categories: string[];

  /** Pricing across all marketplaces */
  pricing: MarketplacePricing[];

  /** Amazon Best Sellers Rank (undefined if not ranked) */
  salesRank?: number;
}

/**
 * Pricing configuration for a specific marketplace
 */
export interface MarketplacePricing {
  /** Marketplace code (e.g., 'US', 'UK', 'DE', 'FR', 'ES', 'IT', 'JP') */
  marketplace: string;

  /** Currency code (e.g., 'USD', 'GBP', 'EUR', 'JPY') */
  currency: string;

  /** List price in the marketplace currency */
  listPrice: number;

  /** KDP royalty rate selected for this marketplace */
  royaltyRate: 0.35 | 0.7;
}

/**
 * Sales data for a specific book, date, and marketplace
 */
export interface SalesData {
  /** Book ASIN */
  asin: string;

  /** Sales date */
  date: Date;

  /** Marketplace where sale occurred */
  marketplace: string;

  /** Units ordered (before refunds) */
  unitsOrdered: number;

  /** Royalty earned in marketplace currency */
  royalty: number;

  /** Currency code for royalty amount */
  currency: string;

  /** Kindle Edition Normalized Pages read (KDP Select only) */
  kenpRead?: number;

  /** Royalty from KENP reads (KDP Select only) */
  kenpRoyalty?: number;
}
