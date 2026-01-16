/**
 * PDF utilities for page counting and validation
 *
 * Per council recommendation: Get EXACT page count at ORDER time, not quote time.
 * The pod_package_id encodes spine width/page count. If PDF has 204 pages but
 * metadata says 200, the Print API will reject the job or print blank spine.
 *
 * Uses pdf-lib for lightweight PDF parsing.
 */

import { PDFDocument } from "pdf-lib";
import { readFile } from "fs/promises";
import { createHash } from "crypto";

export interface PdfInfo {
  pageCount: number;
  fileSize: number;
  hash: string;
}

/**
 * Get page count from a PDF file
 * @param pdfPath - Path to the PDF file
 * @returns Number of pages in the PDF
 */
export async function getPdfPageCount(pdfPath: string): Promise<number> {
  const pdfBytes = await readFile(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes, {
    // Ignore encryption issues for page counting
    ignoreEncryption: true,
  });
  return pdfDoc.getPageCount();
}

/**
 * Get comprehensive PDF info including page count, size, and hash
 * @param pdfPath - Path to the PDF file
 * @returns PdfInfo object with page count, file size, and content hash
 */
export async function getPdfInfo(pdfPath: string): Promise<PdfInfo> {
  const pdfBytes = await readFile(pdfPath);

  const pdfDoc = await PDFDocument.load(pdfBytes, {
    ignoreEncryption: true,
  });

  const hash = createHash("sha256").update(pdfBytes).digest("hex");

  return {
    pageCount: pdfDoc.getPageCount(),
    fileSize: pdfBytes.length,
    hash,
  };
}

/**
 * Calculate file hash for comparison with remote blob
 * @param filePath - Path to file
 * @returns SHA-256 hash of file contents
 */
export async function getFileHash(filePath: string): Promise<string> {
  const bytes = await readFile(filePath);
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Validate that a PDF meets basic requirements for print
 * @param pdfPath - Path to the PDF file
 * @returns Validation result with any issues found
 */
export async function validatePdfForPrint(pdfPath: string): Promise<{
  valid: boolean;
  pageCount: number;
  issues: string[];
}> {
  const issues: string[] = [];

  let pdfBytes: Buffer;
  try {
    pdfBytes = await readFile(pdfPath);
  } catch (error) {
    return {
      valid: false,
      pageCount: 0,
      issues: [`Cannot read PDF file: ${(error as Error).message}`],
    };
  }

  if (pdfBytes.length === 0) {
    return {
      valid: false,
      pageCount: 0,
      issues: ["PDF file is empty"],
    };
  }

  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: true,
    });
  } catch (error) {
    return {
      valid: false,
      pageCount: 0,
      issues: [`Invalid PDF format: ${(error as Error).message}`],
    };
  }

  const pageCount = pdfDoc.getPageCount();

  if (pageCount === 0) {
    issues.push("PDF has no pages");
  }

  // Minimum page requirements for Lulu
  if (pageCount < 24) {
    issues.push(`PDF has ${pageCount} pages, minimum is 24 for Lulu POD`);
  }

  // Maximum page limit (Lulu)
  if (pageCount > 800) {
    issues.push(`PDF has ${pageCount} pages, maximum is 800 for Lulu POD`);
  }

  // Check file size (Lulu limits vary but 2GB is safe upper bound)
  const fileSizeMB = pdfBytes.length / (1024 * 1024);
  if (fileSizeMB > 2000) {
    issues.push(`PDF is ${fileSizeMB.toFixed(1)}MB, should be under 2GB`);
  }

  return {
    valid: issues.length === 0,
    pageCount,
    issues,
  };
}

/**
 * Get page dimensions from a PDF
 * @param pdfPath - Path to the PDF file
 * @returns Page dimensions in points (72 points = 1 inch)
 */
export async function getPdfPageDimensions(pdfPath: string): Promise<{
  width: number;
  height: number;
  widthInches: number;
  heightInches: number;
}> {
  const pdfBytes = await readFile(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes, {
    ignoreEncryption: true,
  });

  const pages = pdfDoc.getPages();
  if (pages.length === 0) {
    throw new Error("PDF has no pages");
  }

  // Get dimensions from first page
  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();

  return {
    width,
    height,
    widthInches: width / 72,
    heightInches: height / 72,
  };
}
