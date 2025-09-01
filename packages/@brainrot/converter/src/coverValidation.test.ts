/**
 * Unit tests for cover validation functions
 * Tests all validation logic, edge cases, and error handling
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import {
  validateDimensions,
  validateFormat,
  validateFileSize,
  validateCover,
  isCoverValid,
  getCoverSuggestions,
  type ValidationResult,
  type CoverValidationOptions,
  type CoverValidationSummary,
} from "./coverValidation";
import { getImageMetadata, type ImageMetadata } from "./imageProcessor";

// Mock the imageProcessor module
vi.mock("./imageProcessor");
const mockGetImageMetadata = vi.mocked(getImageMetadata);

describe("coverValidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test helper to create image metadata
  const createImageMetadata = (overrides: Partial<ImageMetadata> = {}): ImageMetadata => ({
    width: 1600,
    height: 2560,
    format: "JPEG",
    size: 2 * 1024 * 1024, // 2MB
    ...overrides,
  });

  describe("validateDimensions", () => {
    it("should pass for recommended dimensions", () => {
      const metadata = createImageMetadata({ width: 1600, height: 2560 });
      const results = validateDimensions(metadata);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        name: "Cover Dimensions",
        status: "pass",
        message: undefined,
      });
      expect(results[1]).toEqual({
        name: "Cover Aspect Ratio",
        status: "pass",
        message: undefined,
      });
    });

    it("should pass for recommended dimensions with verbose messages", () => {
      const metadata = createImageMetadata({ width: 1600, height: 2560 });
      const results = validateDimensions(metadata, { verbose: true });

      expect(results[0]).toEqual({
        name: "Cover Dimensions",
        status: "pass",
        message: "1600×2560 - Excellent quality",
      });
      expect(results[1]).toEqual({
        name: "Cover Aspect Ratio",
        status: "pass",
        message: "0.63:1 - Good book proportions",
      });
    });

    it("should fail for dimensions below minimum requirement", () => {
      const metadata = createImageMetadata({ width: 800, height: 600 });
      const results = validateDimensions(metadata);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        name: "Cover Dimensions",
        status: "fail",
        message: "800×600 - Must be at least 1000×1000 pixels for KDP",
      });
    });

    it("should warn for dimensions above minimum but below recommended", () => {
      const metadata = createImageMetadata({ width: 1200, height: 1800 });
      const results = validateDimensions(metadata);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        name: "Cover Dimensions",
        status: "warning",
        message: "1200×1800 - Recommended: 1600×2560 pixels for best quality",
      });
    });

    it("should fail for dimensions above minimum but below recommended in strict mode", () => {
      const metadata = createImageMetadata({ width: 1200, height: 1800 });
      const results = validateDimensions(metadata, { strict: true });

      expect(results[0].status).toBe("fail");
      expect(results[1].status).toBe("pass"); // aspect ratio is within tolerance for 1200x1800
    });

    it("should warn for incorrect aspect ratio", () => {
      const metadata = createImageMetadata({ width: 2000, height: 2000 }); // Square image
      const results = validateDimensions(metadata);

      expect(results[1]).toEqual({
        name: "Cover Aspect Ratio",
        status: "warning",
        message: "1.00:1 - Recommended: 0.625:1 (1600×2560)",
      });
    });

    it("should pass for aspect ratio within tolerance", () => {
      const metadata = createImageMetadata({ width: 1500, height: 2400 }); // Close to ideal ratio
      const results = validateDimensions(metadata);

      expect(results[1].status).toBe("pass");
    });

    it("should handle edge case of exactly minimum dimensions", () => {
      const metadata = createImageMetadata({ width: 1000, height: 1000 });
      const results = validateDimensions(metadata);

      expect(results[0].status).toBe("warning"); // Above minimum but below recommended
    });
  });

  describe("validateFormat", () => {
    it("should pass for JPEG format", () => {
      const metadata = createImageMetadata({ format: "JPEG" });
      const results = validateFormat(metadata);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        name: "Cover Format",
        status: "pass",
        message: undefined,
      });
    });

    it("should pass for PNG format", () => {
      const metadata = createImageMetadata({ format: "PNG" });
      const results = validateFormat(metadata);

      expect(results[0].status).toBe("pass");
    });

    it("should pass for TIFF format", () => {
      const metadata = createImageMetadata({ format: "TIFF" });
      const results = validateFormat(metadata);

      expect(results[0].status).toBe("pass");
    });

    it("should normalize JPG to JPEG in display", () => {
      const metadata = createImageMetadata({ format: "JPG" });
      const results = validateFormat(metadata, { verbose: true });

      expect(results[0]).toEqual({
        name: "Cover Format",
        status: "pass",
        message: "JPEG - Supported format",
      });
    });

    it("should normalize TIF to TIFF in display", () => {
      const metadata = createImageMetadata({ format: "TIF" });
      const results = validateFormat(metadata, { verbose: true });

      expect(results[0]).toEqual({
        name: "Cover Format",
        status: "pass",
        message: "TIFF - Supported format",
      });
    });

    it("should fail for unsupported format", () => {
      const metadata = createImageMetadata({ format: "BMP" });
      const results = validateFormat(metadata);

      expect(results[0]).toEqual({
        name: "Cover Format",
        status: "fail",
        message: "BMP format - Must be JPEG, PNG, or TIFF",
      });
    });

    it("should fail for unknown format", () => {
      const metadata = createImageMetadata({ format: undefined });
      const results = validateFormat(metadata);

      expect(results[0]).toEqual({
        name: "Cover Format",
        status: "fail",
        message: "Unknown format - Must be JPEG, PNG, or TIFF",
      });
    });

    it("should handle lowercase formats", () => {
      const metadata = createImageMetadata({ format: "jpeg" });
      const results = validateFormat(metadata);

      expect(results[0].status).toBe("pass");
    });
  });

  describe("validateFileSize", () => {
    it("should pass for optimal file size (1-3MB)", () => {
      const metadata = createImageMetadata({ size: 2 * 1024 * 1024 }); // 2MB
      const results = validateFileSize(metadata);

      expect(results[0]).toEqual({
        name: "Cover File Size",
        status: "pass",
        message: undefined,
      });
    });

    it("should pass for optimal file size with verbose message", () => {
      const metadata = createImageMetadata({ size: 2.5 * 1024 * 1024 }); // 2.5MB
      const results = validateFileSize(metadata, { verbose: true });

      expect(results[0]).toEqual({
        name: "Cover File Size",
        status: "pass",
        message: "2.5MB - Optimal size",
      });
    });

    it("should pass for good file size (3-5MB)", () => {
      const metadata = createImageMetadata({ size: 4 * 1024 * 1024 }); // 4MB
      const results = validateFileSize(metadata, { verbose: true });

      expect(results[0]).toEqual({
        name: "Cover File Size",
        status: "pass",
        message: "4.0MB - Good size",
      });
    });

    it("should warn for large file size (5-50MB)", () => {
      const metadata = createImageMetadata({ size: 10 * 1024 * 1024 }); // 10MB
      const results = validateFileSize(metadata);

      expect(results[0]).toEqual({
        name: "Cover File Size",
        status: "warning",
        message: "10.0MB - Recommended: Under 5MB for faster uploads",
      });
    });

    it("should fail for large file size in strict mode", () => {
      const metadata = createImageMetadata({ size: 10 * 1024 * 1024 }); // 10MB
      const results = validateFileSize(metadata, { strict: true });

      expect(results[0].status).toBe("fail");
    });

    it("should fail for file size over maximum (50MB)", () => {
      const metadata = createImageMetadata({ size: 60 * 1024 * 1024 }); // 60MB
      const results = validateFileSize(metadata);

      expect(results[0]).toEqual({
        name: "Cover File Size",
        status: "fail",
        message: "60.0MB - Must be under 50MB for KDP upload",
      });
    });

    it("should warn for small file size (under 1MB)", () => {
      const metadata = createImageMetadata({ size: 0.5 * 1024 * 1024 }); // 0.5MB
      const results = validateFileSize(metadata);

      expect(results[0]).toEqual({
        name: "Cover File Size",
        status: "warning",
        message: "0.5MB - May appear pixelated, consider higher quality image",
      });
    });

    it("should fail for small file size in strict mode", () => {
      const metadata = createImageMetadata({ size: 0.5 * 1024 * 1024 }); // 0.5MB
      const results = validateFileSize(metadata, { strict: true });

      expect(results[0].status).toBe("fail");
    });

    it("should handle edge case of exactly 50MB", () => {
      const metadata = createImageMetadata({ size: 50 * 1024 * 1024 }); // Exactly 50MB
      const results = validateFileSize(metadata);

      expect(results[0].status).toBe("warning"); // Should be warning, not fail
    });

    it("should handle edge case of exactly 1MB", () => {
      const metadata = createImageMetadata({ size: 1 * 1024 * 1024 }); // Exactly 1MB
      const results = validateFileSize(metadata, { verbose: true });

      expect(results[0]).toEqual({
        name: "Cover File Size",
        status: "pass",
        message: "1.0MB - Optimal size",
      });
    });
  });

  describe("validateCover - integration", () => {
    it("should return valid result for perfect cover", async () => {
      const perfectMetadata = createImageMetadata();
      mockGetImageMetadata.mockResolvedValue(perfectMetadata);

      const result = await validateCover("test-cover.jpg");

      expect(result).toEqual({
        isValid: true,
        hasWarnings: false,
        checks: expect.any(Array),
        errors: [],
        warnings: [],
        suggestions: [],
      });
      expect(result.checks).toHaveLength(4); // dimensions, aspect ratio, format, size
      expect(result.checks.every(check => check.status === "pass")).toBe(true);
    });

    it("should return invalid result with suggestions for poor cover", async () => {
      const poorMetadata = createImageMetadata({
        width: 800,
        height: 600,
        format: "BMP",
        size: 60 * 1024 * 1024, // 60MB
      });
      mockGetImageMetadata.mockResolvedValue(poorMetadata);

      const result = await validateCover("bad-cover.bmp");

      expect(result.isValid).toBe(false);
      expect(result.hasWarnings).toBe(false); // No warnings, only failures
      expect(result.errors).toHaveLength(3); // All validations should fail
      expect(result.suggestions).toContain("Create or resize your cover to at least 1600×2560 pixels");
      expect(result.suggestions).toContain("Convert your cover to JPEG, PNG, or TIFF format");
      expect(result.suggestions).toContain("Reduce file size to under 50MB (compress image or reduce dimensions)");
    });

    it("should handle warnings in non-strict mode", async () => {
      const warningMetadata = createImageMetadata({
        width: 1200,
        height: 1800,
        size: 10 * 1024 * 1024, // 10MB
      });
      mockGetImageMetadata.mockResolvedValue(warningMetadata);

      const result = await validateCover("warning-cover.jpg");

      expect(result.isValid).toBe(true); // Valid in non-strict mode
      expect(result.hasWarnings).toBe(true);
      expect(result.warnings).toHaveLength(2); // dimensions, file size (aspect ratio is within tolerance)
      expect(result.suggestions).toContain("Consider addressing warnings for optimal publishing results");
    });

    it("should fail warnings in strict mode", async () => {
      const warningMetadata = createImageMetadata({
        width: 1200,
        height: 1800,
        size: 10 * 1024 * 1024, // 10MB
      });
      mockGetImageMetadata.mockResolvedValue(warningMetadata);

      const result = await validateCover("warning-cover.jpg", { strict: true });

      expect(result.isValid).toBe(false);
      expect(result.hasWarnings).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should handle image processing errors gracefully", async () => {
      mockGetImageMetadata.mockRejectedValue(new Error("File not found"));

      const result = await validateCover("missing-cover.jpg");

      expect(result).toEqual({
        isValid: false,
        hasWarnings: false,
        checks: [
          {
            name: "Cover Analysis",
            status: "fail",
            message: "Could not analyze cover image: File not found",
          },
        ],
        errors: [
          {
            name: "Cover Analysis",
            status: "fail",
            message: "Could not analyze cover image: File not found",
          },
        ],
        warnings: [],
        suggestions: [
          "Ensure the cover file exists and is a valid image",
          "Check file permissions and path",
        ],
      });
    });

    it("should include verbose messages when requested", async () => {
      const perfectMetadata = createImageMetadata();
      mockGetImageMetadata.mockResolvedValue(perfectMetadata);

      const result = await validateCover("test-cover.jpg", { verbose: true });

      expect(result.isValid).toBe(true);
      expect(result.checks.some(check => check.message !== undefined)).toBe(true);
    });

    it("should generate specific suggestions for small file sizes", async () => {
      const smallMetadata = createImageMetadata({
        size: 0.5 * 1024 * 1024, // 0.5MB
      });
      mockGetImageMetadata.mockResolvedValue(smallMetadata);

      const result = await validateCover("small-cover.jpg");

      expect(result.suggestions).toContain("Use a higher quality image to avoid pixelation (target 1-5MB)");
    });
  });

  describe("utility functions", () => {
    describe("isCoverValid", () => {
      it("should return true for valid cover", async () => {
        const validMetadata = createImageMetadata();
        mockGetImageMetadata.mockResolvedValue(validMetadata);

        const isValid = await isCoverValid("valid-cover.jpg");

        expect(isValid).toBe(true);
        expect(mockGetImageMetadata).toHaveBeenCalledWith("valid-cover.jpg");
      });

      it("should return false for invalid cover", async () => {
        const invalidMetadata = createImageMetadata({
          width: 500,
          height: 500,
        });
        mockGetImageMetadata.mockResolvedValue(invalidMetadata);

        const isValid = await isCoverValid("invalid-cover.jpg");

        expect(isValid).toBe(false);
      });

      it("should return false when image processing fails", async () => {
        mockGetImageMetadata.mockRejectedValue(new Error("Processing failed"));

        const isValid = await isCoverValid("broken-cover.jpg");

        expect(isValid).toBe(false);
      });
    });

    describe("getCoverSuggestions", () => {
      it("should return suggestions for cover with issues", async () => {
        const problematicMetadata = createImageMetadata({
          width: 800,
          height: 600,
          format: "BMP",
        });
        mockGetImageMetadata.mockResolvedValue(problematicMetadata);

        const suggestions = await getCoverSuggestions("problem-cover.bmp");

        expect(suggestions).toContain("Create or resize your cover to at least 1600×2560 pixels");
        expect(suggestions).toContain("Convert your cover to JPEG, PNG, or TIFF format");
        expect(mockGetImageMetadata).toHaveBeenCalledWith("problem-cover.bmp");
      });

      it("should return empty suggestions for perfect cover", async () => {
        const perfectMetadata = createImageMetadata();
        mockGetImageMetadata.mockResolvedValue(perfectMetadata);

        const suggestions = await getCoverSuggestions("perfect-cover.jpg");

        expect(suggestions).toEqual([]);
      });

      it("should return error suggestions when processing fails", async () => {
        mockGetImageMetadata.mockRejectedValue(new Error("Access denied"));

        const suggestions = await getCoverSuggestions("inaccessible-cover.jpg");

        expect(suggestions).toContain("Ensure the cover file exists and is a valid image");
        expect(suggestions).toContain("Check file permissions and path");
      });
    });
  });
});