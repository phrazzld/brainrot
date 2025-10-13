/**
 * Integration tests for KdpService
 * These tests verify end-to-end workflows using mock mode
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { KdpService } from "./kdp.js";

describe("KDP Integration (Mock Mode)", () => {
  let kdpService: KdpService;

  beforeEach(() => {
    kdpService = new KdpService({
      mockMode: true,
      email: "test@example.com",
      password: "mock-password",
    });
  });

  afterEach(async () => {
    await kdpService.close();
  });

  describe("Full Workflow - List and View Books", () => {
    it("should login, list books, and get details without real KDP connection", async () => {
      // Login
      await kdpService.login();

      // List all books
      const books = await kdpService.listBooks();
      expect(books).toHaveLength(2);
      expect(books[0]).toHaveProperty("asin");
      expect(books[0]).toHaveProperty("title");
      expect(books[0]).toHaveProperty("author");
      expect(books[0]).toHaveProperty("status");
      expect(books[0]).toHaveProperty("formats");

      // Get details for first book
      const firstBook = books[0];
      const details = await kdpService.getBookDetails(firstBook.asin);

      expect(details.asin).toBe(firstBook.asin);
      expect(details.title).toBeDefined();
      expect(details.description).toBeDefined();
      expect(details.keywords.length).toBeGreaterThan(0);
      expect(details.pricing.length).toBeGreaterThan(0);
    });

    it("should handle sequential operations on multiple books", async () => {
      await kdpService.login();

      const books = await kdpService.listBooks();

      // Get details for all books
      const allDetails = await Promise.all(
        books.map((book) => kdpService.getBookDetails(book.asin)),
      );

      expect(allDetails).toHaveLength(books.length);
      allDetails.forEach((details, index) => {
        expect(details.asin).toBe(books[index].asin);
      });
    });
  });

  describe("Full Workflow - Sales Data Retrieval", () => {
    it("should login and retrieve sales data for a book", async () => {
      await kdpService.login();

      const books = await kdpService.listBooks();
      const firstBook = books[0];

      const sales = await kdpService.getSalesData(firstBook.asin);

      expect(Array.isArray(sales)).toBe(true);
      if (sales.length > 0) {
        expect(sales[0]).toHaveProperty("date");
        expect(sales[0]).toHaveProperty("marketplace");
        expect(sales[0]).toHaveProperty("royalty");
      }
    });

    it("should retrieve sales data with date range", async () => {
      await kdpService.login();

      const books = await kdpService.listBooks();
      const sales = await kdpService.getSalesData(books[0].asin, {
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-01-31"),
      });

      expect(Array.isArray(sales)).toBe(true);
    });

    it("should download sales report as CSV fallback", async () => {
      await kdpService.login();

      const books = await kdpService.listBooks();
      const sales = await kdpService.downloadSalesReport(books[0].asin, {
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-01-31"),
      });

      expect(Array.isArray(sales)).toBe(true);
    });
  });

  describe("Cache Behavior", () => {
    it("should cache book list results", async () => {
      await kdpService.login();

      const start1 = Date.now();
      const books1 = await kdpService.listBooks();
      const duration1 = Date.now() - start1;

      const start2 = Date.now();
      const books2 = await kdpService.listBooks();
      const duration2 = Date.now() - start2;

      // Second call should be faster due to cache
      expect(duration2).toBeLessThanOrEqual(duration1);
      expect(books1.length).toBe(books2.length);
    });

    it("should bypass cache with noCache option", async () => {
      await kdpService.login();

      const books1 = await kdpService.listBooks();
      const books2 = await kdpService.listBooks({ noCache: true });

      // Should return same data structure
      expect(books1.length).toBe(books2.length);
    });
  });

  describe("Error Scenarios", () => {
    it("should work without login in mock mode (mock mode doesn't require login)", async () => {
      // Mock mode bypasses login requirement
      const books = await kdpService.listBooks();
      expect(books).toBeDefined();
    });

    it("should handle close without initializing", async () => {
      // Should not throw
      await expect(kdpService.close()).resolves.not.toThrow();
    });

    it("should allow multiple close calls", async () => {
      await kdpService.login();
      await kdpService.close();
      await kdpService.close();
      // Should not throw
    });
  });

  describe("Data Consistency", () => {
    it("should return consistent book structure across methods", async () => {
      await kdpService.login();

      const books = await kdpService.listBooks();
      const details = await kdpService.getBookDetails(books[0].asin);

      // Fields should match between list and details
      expect(details.asin).toBe(books[0].asin);
      expect(details.title).toBe(books[0].title);
      expect(details.author).toBe(books[0].author);
      expect(details.status).toBe(books[0].status);
    });

    it("should maintain data integrity for pricing information", async () => {
      await kdpService.login();

      const books = await kdpService.listBooks();
      const details = await kdpService.getBookDetails(books[0].asin);

      details.pricing.forEach((price) => {
        expect(price.listPrice).toBeGreaterThan(0);
        expect([0.35, 0.7]).toContain(price.royaltyRate);
        expect(price.currency).toMatch(/^[A-Z]{3}$/);
      });
    });

    it("should return valid marketplace codes", async () => {
      await kdpService.login();

      const books = await kdpService.listBooks();
      const sales = await kdpService.getSalesData(books[0].asin);

      const validMarketplaces = [
        "US",
        "UK",
        "GB",
        "DE",
        "FR",
        "ES",
        "IT",
        "JP",
        "CA",
        "AU",
        "BR",
        "IN",
      ];

      sales.forEach((sale) => {
        expect(validMarketplaces).toContain(sale.marketplace.substring(0, 2));
      });
    });
  });

  describe("Complete Publishing Workflow Simulation", () => {
    it("should simulate checking book status and sales", async () => {
      // Login
      await kdpService.login();

      // Get all books
      const books = await kdpService.listBooks();
      expect(books.length).toBeGreaterThan(0);

      // Find live books
      const liveBooks = books.filter((book) => book.status === "live");

      if (liveBooks.length > 0) {
        const book = liveBooks[0];

        // Get full details
        const details = await kdpService.getBookDetails(book.asin);
        expect(details.pricing).toBeDefined();

        // Get sales data
        const sales = await kdpService.getSalesData(book.asin);
        expect(Array.isArray(sales)).toBe(true);

        // Calculate total royalty
        const totalRoyalty = sales.reduce((sum, s) => sum + s.royalty, 0);
        expect(totalRoyalty).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("Performance Characteristics", () => {
    it("should complete login operation quickly in mock mode", async () => {
      const start = Date.now();
      await kdpService.login();
      const duration = Date.now() - start;

      // Mock mode should be nearly instant (<100ms)
      expect(duration).toBeLessThan(100);
    });

    it("should handle concurrent requests gracefully", async () => {
      await kdpService.login();

      const operations = [
        kdpService.listBooks(),
        kdpService.getBookDetails("B0MOCK123"),
        kdpService.getSalesData("B0MOCK123"),
      ];

      // Should all complete without error
      const results = await Promise.all(operations);
      expect(results[0]).toBeDefined(); // books
      expect(results[1]).toBeDefined(); // details
      expect(results[2]).toBeDefined(); // sales
    });
  });

  describe("Realistic Usage Patterns", () => {
    it("should support checking multiple books for sales data", async () => {
      await kdpService.login();

      const books = await kdpService.listBooks();
      const salesByBook = await Promise.all(
        books.map(async (book) => ({
          asin: book.asin,
          title: book.title,
          sales: await kdpService.getSalesData(book.asin),
        })),
      );

      expect(salesByBook).toHaveLength(books.length);
      salesByBook.forEach((item) => {
        expect(item.asin).toBeDefined();
        expect(item.title).toBeDefined();
        expect(Array.isArray(item.sales)).toBe(true);
      });
    });

    it("should support filtering books by status", async () => {
      await kdpService.login();

      const allBooks = await kdpService.listBooks();
      const liveBooks = allBooks.filter((book) => book.status === "live");
      const draftBooks = allBooks.filter((book) => book.status === "draft");

      expect(liveBooks.length + draftBooks.length).toBeLessThanOrEqual(
        allBooks.length,
      );
    });

    it("should support aggregating royalty data", async () => {
      await kdpService.login();

      const books = await kdpService.listBooks();
      const firstBook = books[0];

      const sales = await kdpService.getSalesData(firstBook.asin);

      const totalRoyalty = sales.reduce((sum, s) => sum + s.royalty, 0);
      const totalKenpRoyalty = sales.reduce(
        (sum, s) => sum + (s.kenpRoyalty || 0),
        0,
      );
      const totalUnits = sales.reduce((sum, s) => sum + s.unitsOrdered, 0);

      expect(totalRoyalty).toBeGreaterThanOrEqual(0);
      expect(totalKenpRoyalty).toBeGreaterThanOrEqual(0);
      expect(totalUnits).toBeGreaterThanOrEqual(0);
    });
  });
});
