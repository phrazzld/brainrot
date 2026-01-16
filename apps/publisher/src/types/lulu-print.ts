/**
 * TypeScript interfaces for Lulu Print API (Direct Fulfillment)
 * API Docs: https://api.lulu.com/docs/
 */

// ============================================================================
// Configuration
// ============================================================================

export interface LuluPrintConfig {
  clientKey: string;
  clientSecret: string;
  sandbox?: boolean;
  mockMode?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

// ============================================================================
// Shipping & Address
// ============================================================================

export interface ShippingAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state_code?: string;
  postal_code: string;
  country_code: string; // ISO 3166-1 alpha-2
  phone_number: string;
  email?: string;
  organization?: string;
  is_business?: boolean;
}

export type ShippingLevel =
  | "MAIL"
  | "PRIORITY_MAIL"
  | "GROUND"
  | "EXPEDITED"
  | "EXPRESS";

export interface ShippingOption {
  level: ShippingLevel;
  name: string;
  cost: number;
  currency: string;
  estimated_days: {
    min: number;
    max: number;
  };
  tracking_supported: boolean;
}

// ============================================================================
// Line Items & Products
// ============================================================================

export interface PrintableNormalization {
  cover: { source_url: string };
  interior: { source_url: string };
  pod_package_id: string;
}

export interface LineItem {
  title: string;
  quantity: number;
  pod_package_id: string;
  printable_normalization: PrintableNormalization;
  external_id?: string;
}

export interface LineItemCost {
  quantity: number;
  unit_cost: number;
  total_cost: number;
  currency: string;
}

// ============================================================================
// Cost Estimation
// ============================================================================

export interface CostEstimate {
  line_items: LineItemCost[];
  shipping: {
    level: ShippingLevel;
    cost: number;
    currency: string;
  }[];
  tax: number;
  total: number;
  currency: string;
}

// ============================================================================
// Print Jobs
// ============================================================================

export type PrintJobStatus =
  | "CREATED"
  | "UNPAID"
  | "PAYMENT_IN_PROGRESS"
  | "PRODUCTION_READY"
  | "IN_PRODUCTION"
  | "SHIPPED"
  | "CANCELED"
  | "ERROR";

export interface TrackingInfo {
  carrier: string;
  number: string;
  url: string;
}

export interface PrintJob {
  id: string;
  status: PrintJobStatus;
  line_items: Array<{
    title: string;
    quantity: number;
    pod_package_id: string;
    tracking?: TrackingInfo;
  }>;
  shipping_address: ShippingAddress;
  shipping_level: ShippingLevel;
  costs: {
    total_cost_excl_tax: number;
    total_cost_incl_tax: number;
    tax: number;
    shipping_cost: number;
    currency: string;
  };
  external_id?: string;
  contact_email?: string;
  production_delay_minutes?: number;
  created_at: string;
  updated_at: string;
  estimated_ship_date?: string;
}

export interface PrintJobCreateOptions {
  external_id?: string;
  production_delay_minutes?: number;
  contact_email?: string;
}

export interface PrintJobListOptions {
  limit?: number;
  offset?: number;
  status?: PrintJobStatus;
  created_after?: string;
  created_before?: string;
}

export interface PrintJobListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PrintJob[];
}

// ============================================================================
// File Validation
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
}

// ============================================================================
// Cover Dimensions
// ============================================================================

export interface CoverDimensions {
  width: number;
  height: number;
  spine_width: number;
  bleed: number;
  unit: "in" | "mm";
}

// ============================================================================
// Webhooks (deferred but interface ready)
// ============================================================================

export interface Webhook {
  id: string;
  url: string;
  topics: string[];
  created_at: string;
  active: boolean;
}

export interface WebhookPayload {
  topic: string;
  print_job_id: string;
  old_status?: PrintJobStatus;
  new_status: PrintJobStatus;
  timestamp: string;
}

// ============================================================================
// Book Configuration (from metadata.yaml)
// ============================================================================

export type TrimSize = "5x8" | "5.5x8.5" | "6x9" | "7x10" | "8.5x11";
export type ColorOption = "bw" | "color";
export type BindingType = "paperback" | "hardcover" | "coil";
export type PaperType = "white" | "cream";
export type FinishType = "matte" | "glossy";

export interface PrintSpecs {
  trim: TrimSize;
  color: ColorOption;
  binding: BindingType;
  paper: PaperType;
  finish: FinishType;
}

// ============================================================================
// OAuth2
// ============================================================================

export interface OAuth2Token {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  created_at: number;
}
