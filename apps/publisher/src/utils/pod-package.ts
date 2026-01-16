/**
 * POD Package ID (SKU) Generator
 *
 * Lulu uses 27-character codes encoding product specifications:
 * Format: [TrimSize][Color][Quality][Binding][Paper][PPI][Finish][Linen][Foil]
 *
 * Example: 0600X0900BWSTDPB060UW444
 *          └─┬─────┘└┬┘└─┬┘└┬┘└──┬──┘└─┬┘└┬──┘
 *           │       │   │   │    │     │   │
 *           Trim    Color Quality Bind Paper  PPI  Finish
 *
 * Per council recommendation: Generate at runtime from specs + actual page count.
 * Do NOT hardcode in metadata.yaml as page count must match actual PDF.
 */

import type {
  PrintSpecs,
  TrimSize,
  ColorOption,
  BindingType,
  PaperType,
  FinishType,
} from "../types/lulu-print.js";

// Trim size codes (width x height in 1/100 inch format)
const TRIM_CODES: Record<TrimSize, string> = {
  "5x8": "0500X0800",
  "5.5x8.5": "0550X0850",
  "6x9": "0600X0900",
  "7x10": "0700X1000",
  "8.5x11": "0850X1100",
};

// Color codes
const COLOR_CODES: Record<ColorOption, string> = {
  bw: "BW",
  color: "FC",
};

// Quality codes (STD = Standard, PRE = Premium)
const QUALITY_CODES = {
  standard: "STD",
  premium: "PRE",
} as const;

// Binding codes
const BINDING_CODES: Record<BindingType, string> = {
  paperback: "PB",
  hardcover: "CW", // Casewrap
  coil: "CO",
};

// Paper type codes (affects weight too)
// Format: PPP where PPP is paper weight in lbs
const PAPER_CODES: Record<PaperType, Record<ColorOption, string>> = {
  white: {
    bw: "060", // 60# white
    color: "070", // 70# white for color
  },
  cream: {
    bw: "060", // 60# cream
    color: "060", // 60# cream (color on cream is rare)
  },
};

// Paper type indicator (U = Uncoated White, W = Cream)
const PAPER_TYPE_CODES: Record<PaperType, string> = {
  white: "U",
  cream: "W",
};

// Finish codes
const FINISH_CODES: Record<FinishType, string> = {
  matte: "M",
  glossy: "G",
};

// PPI (Pages Per Inch) - affects spine width calculation
// Varies by paper type and weight
const PPI_VALUES: Record<PaperType, Record<ColorOption, number>> = {
  white: {
    bw: 444, // White 60# B&W
    color: 382, // White 70# Color
  },
  cream: {
    bw: 444, // Cream 60# B&W
    color: 444, // Cream 60# Color
  },
};

/**
 * Generate pod_package_id from print specs
 *
 * @param specs - Print specifications from metadata.yaml
 * @param pageCount - Actual page count from PDF (REQUIRED)
 * @returns 27-character pod_package_id
 */
export function generatePodPackageId(
  specs: PrintSpecs,
  _pageCount: number, // Used for validation, not in ID itself
): string {
  // Validate page count
  if (_pageCount < 24) {
    throw new Error(`Page count ${_pageCount} is below minimum of 24`);
  }
  if (_pageCount > 800) {
    throw new Error(`Page count ${_pageCount} exceeds maximum of 800`);
  }

  // Build the SKU
  const trim = TRIM_CODES[specs.trim];
  if (!trim) {
    throw new Error(`Unknown trim size: ${specs.trim}`);
  }

  const color = COLOR_CODES[specs.color];
  if (!color) {
    throw new Error(`Unknown color option: ${specs.color}`);
  }

  const quality = QUALITY_CODES.standard; // Default to standard

  const binding = BINDING_CODES[specs.binding];
  if (!binding) {
    throw new Error(`Unknown binding type: ${specs.binding}`);
  }

  const paperWeight = PAPER_CODES[specs.paper]?.[specs.color];
  if (!paperWeight) {
    throw new Error(`Unknown paper type: ${specs.paper}`);
  }

  const paperType = PAPER_TYPE_CODES[specs.paper];
  const finish = FINISH_CODES[specs.finish];
  if (!finish) {
    throw new Error(`Unknown finish type: ${specs.finish}`);
  }

  // Get PPI for this configuration
  const ppi = PPI_VALUES[specs.paper]?.[specs.color] || 444;

  // Build the full SKU
  // Format: TRIM + COLOR + QUALITY + BINDING + PAPER_WEIGHT + PAPER_TYPE + FINISH + PPI
  // Example: 0600X0900BWSTDPB060UW444
  const sku = `${trim}${color}${quality}${binding}${paperWeight}${paperType}${finish}${ppi}`;

  // Validate length (should be around 23-27 chars)
  if (sku.length < 20 || sku.length > 30) {
    throw new Error(`Generated SKU has unexpected length: ${sku} (${sku.length} chars)`);
  }

  return sku;
}

/**
 * Calculate spine width in inches based on page count and specs
 *
 * @param pageCount - Number of pages
 * @param specs - Print specifications
 * @returns Spine width in inches
 */
export function calculateSpineWidth(pageCount: number, specs: PrintSpecs): number {
  const ppi = PPI_VALUES[specs.paper]?.[specs.color] || 444;
  // Spine width = page count / PPI
  return pageCount / ppi;
}

/**
 * Parse a pod_package_id to extract specs (for display/debugging)
 *
 * @param sku - The 27-char pod_package_id
 * @returns Parsed specifications or null if invalid
 */
export function parsePodPackageId(sku: string): {
  trim: string;
  color: string;
  quality: string;
  binding: string;
  paper: string;
  ppi: number;
} | null {
  // Basic format: 0600X0900BWSTDPB060UW444
  const match = sku.match(
    /^(\d{4}X\d{4})(BW|FC)(STD|PRE)(PB|CW|CO)(\d{3})([UW])([MG])(\d{3})$/,
  );

  if (!match) {
    return null;
  }

  const [, trim, color, quality, binding, _paper, paperType, _finish, ppiStr] =
    match;

  return {
    trim: formatTrimSize(trim),
    color: color === "BW" ? "Black & White" : "Full Color",
    quality: quality === "STD" ? "Standard" : "Premium",
    binding:
      binding === "PB"
        ? "Paperback"
        : binding === "CW"
          ? "Hardcover"
          : "Coil",
    paper: paperType === "U" ? "White" : "Cream",
    ppi: parseInt(ppiStr, 10),
  };
}

/**
 * Format trim code back to readable size
 */
function formatTrimSize(code: string): string {
  const match = code.match(/^(\d{2})(\d{2})X(\d{2})(\d{2})$/);
  if (!match) return code;

  const width = parseInt(match[1] + match[2], 10) / 100;
  const height = parseInt(match[3] + match[4], 10) / 100;

  return `${width}"x${height}"`;
}

/**
 * Get default print specs for a standard paperback
 */
export function getDefaultPrintSpecs(): PrintSpecs {
  return {
    trim: "6x9",
    color: "bw",
    binding: "paperback",
    paper: "cream",
    finish: "matte",
  };
}

/**
 * Validate print specs
 * @throws Error if specs are invalid
 */
export function validatePrintSpecs(specs: PrintSpecs): void {
  if (!TRIM_CODES[specs.trim]) {
    throw new Error(
      `Invalid trim size: ${specs.trim}. Valid options: ${Object.keys(TRIM_CODES).join(", ")}`,
    );
  }
  if (!COLOR_CODES[specs.color]) {
    throw new Error(
      `Invalid color option: ${specs.color}. Valid options: ${Object.keys(COLOR_CODES).join(", ")}`,
    );
  }
  if (!BINDING_CODES[specs.binding]) {
    throw new Error(
      `Invalid binding type: ${specs.binding}. Valid options: ${Object.keys(BINDING_CODES).join(", ")}`,
    );
  }
  if (!PAPER_TYPE_CODES[specs.paper]) {
    throw new Error(
      `Invalid paper type: ${specs.paper}. Valid options: ${Object.keys(PAPER_TYPE_CODES).join(", ")}`,
    );
  }
  if (!FINISH_CODES[specs.finish]) {
    throw new Error(
      `Invalid finish type: ${specs.finish}. Valid options: ${Object.keys(FINISH_CODES).join(", ")}`,
    );
  }
}
