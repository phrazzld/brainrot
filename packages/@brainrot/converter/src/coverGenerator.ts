import puppeteer from "puppeteer";

/**
 * Cover PDF Generator for print-on-demand books
 *
 * Creates wrap-around covers with:
 * - Back cover
 * - Spine (width calculated from page count)
 * - Front cover
 * - Bleed areas (0.125" on all sides)
 */

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
}

export interface CoverMetadata {
  title: string;
  author: string;
  translator: string;
  subtitle?: string;
  genre?: string;
  emoji?: string;
}

export interface CoverOptions {
  metadata: CoverMetadata;
  colorScheme: ColorScheme;
  pageCount: number;
  trimWidth?: number; // inches, default 6
  trimHeight?: number; // inches, default 9
  dpi?: number; // default 300
  bleed?: number; // inches, default 0.125
  paperPpi?: number; // pages per inch, default 444
  outputPath?: string;
}

/**
 * Calculate spine width in inches
 */
export function calculateSpineWidth(pageCount: number, ppi: number = 444): number {
  return pageCount / ppi;
}

/**
 * Generate wrap-around cover SVG
 */
function generateCoverSvg(options: CoverOptions): string {
  const {
    metadata,
    colorScheme,
    pageCount,
    trimWidth = 6,
    trimHeight = 9,
    dpi = 300,
    bleed = 0.125,
    paperPpi = 444,
  } = options;

  // Calculate dimensions in pixels
  const spineWidthInches = calculateSpineWidth(pageCount, paperPpi);
  const totalWidthInches = (trimWidth + bleed) * 2 + spineWidthInches;
  const totalHeightInches = trimHeight + bleed * 2;

  const widthPx = Math.round(totalWidthInches * dpi);
  const heightPx = Math.round(totalHeightInches * dpi);
  const bleedPx = Math.round(bleed * dpi);
  const spineWidthPx = Math.round(spineWidthInches * dpi);
  const coverWidthPx = Math.round(trimWidth * dpi);

  // Positions
  const backCoverX = bleedPx;
  const spineX = bleedPx + coverWidthPx;
  const frontCoverX = bleedPx + coverWidthPx + spineWidthPx;

  // Title lines (split if needed)
  const titleLines = splitTitle(metadata.title);
  const titleSize = titleLines.length > 1 ? 120 : 150;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colorScheme.primary};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${colorScheme.secondary};stop-opacity:1" />
    </linearGradient>

    <filter id="dropshadow">
      <feDropShadow dx="4" dy="4" stdDeviation="3" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Full bleed background -->
  <rect width="${widthPx}" height="${heightPx}" fill="url(#bgGradient)"/>

  <!-- Back Cover -->
  <g id="back-cover" transform="translate(${backCoverX}, ${bleedPx})">
    <!-- Back cover content -->
    <text x="${coverWidthPx / 2}" y="200"
          font-family="Inter, Arial, sans-serif"
          font-size="72"
          font-weight="700"
          text-anchor="middle"
          fill="white">
      About This Translation
    </text>

    <text x="${coverWidthPx / 2}" y="400"
          font-family="Inter, Arial, sans-serif"
          font-size="36"
          font-weight="400"
          text-anchor="middle"
          fill="white"
          opacity="0.9">
      <tspan x="${coverWidthPx / 2}" dy="0">Classic literature meets chronically online</tspan>
      <tspan x="${coverWidthPx / 2}" dy="60">brain rot energy. No cap, this translation</tspan>
      <tspan x="${coverWidthPx / 2}" dy="60">goes absolutely unhinged while staying</tspan>
      <tspan x="${coverWidthPx / 2}" dy="60">true to the original plot. Fr fr.</tspan>
    </text>

    <!-- Barcode placeholder area -->
    <rect x="${coverWidthPx / 2 - 200}" y="${heightPx - bleedPx * 2 - 450}"
          width="400" height="250"
          fill="white" rx="10"/>
    <text x="${coverWidthPx / 2}" y="${heightPx - bleedPx * 2 - 350}"
          font-family="monospace"
          font-size="24"
          text-anchor="middle"
          fill="black">
      ISBN BARCODE AREA
    </text>

    <!-- Publisher info -->
    <text x="${coverWidthPx / 2}" y="${heightPx - bleedPx * 2 - 100}"
          font-family="Inter, Arial, sans-serif"
          font-size="36"
          font-weight="700"
          text-anchor="middle"
          fill="white">
      BRAINROT PUBLISHING HOUSE
    </text>
  </g>

  <!-- Spine -->
  <g id="spine" transform="translate(${spineX}, ${bleedPx})">
    <!-- Spine background (slightly darker) -->
    <rect width="${spineWidthPx}" height="${heightPx - bleedPx * 2}" fill="${colorScheme.secondary}" opacity="0.3"/>

    <!-- Spine text (rotated) -->
    <text x="${spineWidthPx / 2}" y="${heightPx / 2 - bleedPx}"
          font-family="Inter, Arial, sans-serif"
          font-size="${Math.min(spineWidthPx * 0.6, 48)}"
          font-weight="700"
          text-anchor="middle"
          fill="white"
          transform="rotate(270, ${spineWidthPx / 2}, ${(heightPx - bleedPx * 2) / 2})">
      ${metadata.title.toUpperCase()} — ${metadata.author}
    </text>
  </g>

  <!-- Front Cover -->
  <g id="front-cover" transform="translate(${frontCoverX}, ${bleedPx})">
    <!-- Decorative border -->
    <rect x="60" y="60" width="${coverWidthPx - 120}" height="${heightPx - bleedPx * 2 - 120}"
          fill="none" stroke="white" stroke-width="4" opacity="0.8"/>

    <!-- Publisher branding -->
    <text x="${coverWidthPx / 2}" y="180"
          font-family="Inter, Arial, sans-serif"
          font-size="36"
          font-weight="900"
          text-anchor="middle"
          fill="white"
          opacity="0.9">
      BRAINROT PUBLISHING HOUSE
    </text>

    <!-- Main title -->
    <text x="${coverWidthPx / 2}" y="600"
          font-family="Inter, Arial Black, sans-serif"
          font-size="${titleSize}"
          font-weight="900"
          text-anchor="middle"
          fill="white"
          filter="url(#dropshadow)">
      ${titleLines[0] || ""}
    </text>

    ${
      titleLines[1]
        ? `<text x="${coverWidthPx / 2}" y="750"
          font-family="Inter, Arial Black, sans-serif"
          font-size="${titleSize}"
          font-weight="900"
          text-anchor="middle"
          fill="white"
          filter="url(#dropshadow)">
      ${titleLines[1]}
    </text>`
        : ""
    }

    <!-- Subtitle -->
    ${
      metadata.subtitle
        ? `<text x="${coverWidthPx / 2}" y="900"
          font-family="Inter, Arial, sans-serif"
          font-size="42"
          font-style="italic"
          text-anchor="middle"
          fill="white"
          opacity="0.95">
      ${metadata.subtitle}
    </text>`
        : ""
    }

    <!-- Decorative line -->
    <line x1="${coverWidthPx * 0.3}" y1="1000" x2="${coverWidthPx * 0.7}" y2="1000"
          stroke="white" stroke-width="3" opacity="0.7"/>

    <!-- Genre badge -->
    ${
      metadata.genre
        ? `<rect x="${coverWidthPx / 2 - 200}" y="1080" width="400" height="80"
          fill="white" opacity="0.15" rx="40"/>
    <text x="${coverWidthPx / 2}" y="1135"
          font-family="Inter, Arial, sans-serif"
          font-size="36"
          font-weight="700"
          text-anchor="middle"
          fill="white">
      ${metadata.genre.toUpperCase()}
    </text>`
        : ""
    }

    <!-- Emoji element -->
    <text x="${coverWidthPx / 2}" y="1450"
          font-size="180"
          text-anchor="middle">
      ${metadata.emoji || "💀"}
    </text>

    <!-- Author -->
    <text x="${coverWidthPx / 2}" y="${heightPx - bleedPx * 2 - 450}"
          font-family="Inter, Arial, sans-serif"
          font-size="60"
          font-weight="700"
          text-anchor="middle"
          fill="white">
      ${metadata.author}
    </text>

    <!-- Translator credit -->
    <text x="${coverWidthPx / 2}" y="${heightPx - bleedPx * 2 - 350}"
          font-family="Inter, Arial, sans-serif"
          font-size="36"
          font-weight="400"
          text-anchor="middle"
          fill="white"
          opacity="0.9">
      Translated by ${metadata.translator}
    </text>

    <!-- Bottom tagline -->
    <text x="${coverWidthPx / 2}" y="${heightPx - bleedPx * 2 - 150}"
          font-family="Inter, Arial, sans-serif"
          font-size="30"
          font-style="italic"
          text-anchor="middle"
          fill="white"
          opacity="0.8">
      Stay literate, stay chaotic
    </text>
  </g>

  <!-- Safe zone guides (for debugging - comment out in production) -->
  <!--
  <rect x="${bleedPx}" y="${bleedPx}"
        width="${widthPx - bleedPx * 2}" height="${heightPx - bleedPx * 2}"
        fill="none" stroke="cyan" stroke-width="2" stroke-dasharray="10,5"/>
  <line x1="${spineX}" y1="0" x2="${spineX}" y2="${heightPx}" stroke="magenta" stroke-width="1"/>
  <line x1="${spineX + spineWidthPx}" y1="0" x2="${spineX + spineWidthPx}" y2="${heightPx}" stroke="magenta" stroke-width="1"/>
  -->
</svg>`;
}

/**
 * Split title into lines if too long
 */
function splitTitle(title: string): string[] {
  const words = title.split(" ");
  if (words.length <= 3 || title.length <= 20) {
    return [title];
  }

  const midpoint = Math.ceil(words.length / 2);
  return [words.slice(0, midpoint).join(" "), words.slice(midpoint).join(" ")];
}

/**
 * Generate cover PDF using Puppeteer
 */
export async function generateCoverPdf(options: CoverOptions): Promise<string> {
  const {
    trimWidth = 6,
    trimHeight = 9,
    dpi = 300,
    bleed = 0.125,
    paperPpi = 444,
    pageCount,
    outputPath,
  } = options;

  // Calculate dimensions
  const spineWidthInches = calculateSpineWidth(pageCount, paperPpi);
  const totalWidthInches = (trimWidth + bleed) * 2 + spineWidthInches;
  const totalHeightInches = trimHeight + bleed * 2;

  // Generate SVG
  const svg = generateCoverSvg(options);

  // Launch Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    // Set viewport to match cover dimensions at 300 DPI
    const widthPx = Math.round(totalWidthInches * dpi);
    const heightPx = Math.round(totalHeightInches * dpi);

    await page.setViewport({
      width: widthPx,
      height: heightPx,
      deviceScaleFactor: 1,
    });

    // Load SVG as HTML page
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; }
            body { width: ${widthPx}px; height: ${heightPx}px; }
          </style>
        </head>
        <body>
          ${svg}
        </body>
      </html>
    `;

    await page.setContent(html, { waitUntil: "networkidle0" });

    // Generate PDF
    const pdfPath =
      outputPath || `/tmp/cover-${Date.now()}.pdf`;

    await page.pdf({
      path: pdfPath,
      width: `${totalWidthInches}in`,
      height: `${totalHeightInches}in`,
      printBackground: true,
      preferCSSPageSize: true,
    });

    return pdfPath;
  } finally {
    await browser.close();
  }
}

/**
 * Generate just the front cover (for previews)
 */
export async function generateFrontCoverPng(
  options: CoverOptions,
  outputPath?: string,
): Promise<string> {
  const { trimWidth = 6, trimHeight = 9, dpi = 300 } = options;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    // Front cover dimensions
    const widthPx = Math.round(trimWidth * dpi);
    const heightPx = Math.round(trimHeight * dpi);

    await page.setViewport({
      width: widthPx,
      height: heightPx,
      deviceScaleFactor: 1,
    });

    // Create standalone front cover SVG
    const frontCoverSvg = generateFrontCoverOnlySvg(options);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; }
            body { width: ${widthPx}px; height: ${heightPx}px; }
          </style>
        </head>
        <body>
          ${frontCoverSvg}
        </body>
      </html>
    `;

    await page.setContent(html, { waitUntil: "networkidle0" });

    const pngPath = outputPath || `/tmp/front-cover-${Date.now()}.png`;

    await page.screenshot({
      path: pngPath,
      type: "png",
    });

    return pngPath;
  } finally {
    await browser.close();
  }
}

/**
 * Generate front cover only SVG (for web/preview)
 */
function generateFrontCoverOnlySvg(options: CoverOptions): string {
  const {
    metadata,
    colorScheme,
    trimWidth = 6,
    trimHeight = 9,
    dpi = 300,
  } = options;

  const widthPx = Math.round(trimWidth * dpi);
  const heightPx = Math.round(trimHeight * dpi);

  const titleLines = splitTitle(metadata.title);
  const titleSize = titleLines.length > 1 ? 120 : 150;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colorScheme.primary};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${colorScheme.secondary};stop-opacity:1" />
    </linearGradient>
    <filter id="dropshadow">
      <feDropShadow dx="4" dy="4" stdDeviation="3" flood-opacity="0.3"/>
    </filter>
  </defs>

  <rect width="${widthPx}" height="${heightPx}" fill="url(#bgGradient)"/>

  <rect x="60" y="60" width="${widthPx - 120}" height="${heightPx - 120}"
        fill="none" stroke="white" stroke-width="4" opacity="0.8"/>

  <text x="${widthPx / 2}" y="180"
        font-family="Inter, Arial, sans-serif"
        font-size="36"
        font-weight="900"
        text-anchor="middle"
        fill="white"
        opacity="0.9">
    BRAINROT PUBLISHING HOUSE
  </text>

  <text x="${widthPx / 2}" y="600"
        font-family="Inter, Arial Black, sans-serif"
        font-size="${titleSize}"
        font-weight="900"
        text-anchor="middle"
        fill="white"
        filter="url(#dropshadow)">
    ${titleLines[0] || ""}
  </text>

  ${
    titleLines[1]
      ? `<text x="${widthPx / 2}" y="750"
        font-family="Inter, Arial Black, sans-serif"
        font-size="${titleSize}"
        font-weight="900"
        text-anchor="middle"
        fill="white"
        filter="url(#dropshadow)">
    ${titleLines[1]}
  </text>`
      : ""
  }

  <text x="${widthPx / 2}" y="1450"
        font-size="180"
        text-anchor="middle">
    ${metadata.emoji || "💀"}
  </text>

  <text x="${widthPx / 2}" y="${heightPx - 450}"
        font-family="Inter, Arial, sans-serif"
        font-size="60"
        font-weight="700"
        text-anchor="middle"
        fill="white">
    ${metadata.author}
  </text>

  <text x="${widthPx / 2}" y="${heightPx - 350}"
        font-family="Inter, Arial, sans-serif"
        font-size="36"
        font-weight="400"
        text-anchor="middle"
        fill="white"
        opacity="0.9">
    Translated by ${metadata.translator}
  </text>

  <text x="${widthPx / 2}" y="${heightPx - 150}"
        font-family="Inter, Arial, sans-serif"
        font-size="30"
        font-style="italic"
        text-anchor="middle"
        fill="white"
        opacity="0.8">
    Stay literate, stay chaotic
  </text>
</svg>`;
}

export { generateCoverSvg };
