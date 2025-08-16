import {
  validateISBN,
  validateISBN10,
  validateISBN13,
  convertISBN10to13,
  formatISBN,
  generatePlaceholderISBN,
  extractISBN,
} from './isbn';

describe('ISBN Validation', () => {
  describe('validateISBN13', () => {
    it('should validate correct ISBN-13', () => {
      expect(validateISBN13('9780316769174')).toBe(true);
      expect(validateISBN13('978-0-316-76917-4')).toBe(true);
      expect(validateISBN13('979-8-123456-00-0')).toBe(true);
    });

    it('should reject invalid ISBN-13', () => {
      expect(validateISBN13('9780316769175')).toBe(false); // Wrong check digit
      expect(validateISBN13('978031676917')).toBe(false); // Too short
      expect(validateISBN13('97803167691744')).toBe(false); // Too long
      expect(validateISBN13('abc0316769174')).toBe(false); // Non-numeric
    });

    it('should handle ISBN-13 with spaces', () => {
      expect(validateISBN13('978 0 316 76917 4')).toBe(true);
    });
  });

  describe('validateISBN10', () => {
    it('should validate correct ISBN-10', () => {
      expect(validateISBN10('0316769177')).toBe(true);
      expect(validateISBN10('0-316-76917-7')).toBe(true);
      expect(validateISBN10('043942089X')).toBe(true); // X check digit
    });

    it('should reject invalid ISBN-10', () => {
      expect(validateISBN10('0316769178')).toBe(false); // Wrong check digit
      expect(validateISBN10('031676917')).toBe(false); // Too short
      expect(validateISBN10('03167691777')).toBe(false); // Too long
      expect(validateISBN10('abc6769177')).toBe(false); // Non-numeric
    });
  });

  describe('validateISBN', () => {
    it('should validate both ISBN-10 and ISBN-13', () => {
      expect(validateISBN('9780316769174')).toBe(true); // ISBN-13
      expect(validateISBN('0316769177')).toBe(true); // ISBN-10
      expect(validateISBN('978-0-316-76917-4')).toBe(true); // ISBN-13 with hyphens
      expect(validateISBN('0-316-76917-7')).toBe(true); // ISBN-10 with hyphens
    });

    it('should reject invalid ISBNs', () => {
      expect(validateISBN('12345')).toBe(false); // Too short
      expect(validateISBN('abcdefghij')).toBe(false); // Non-numeric
      expect(validateISBN('')).toBe(false); // Empty
    });
  });

  describe('convertISBN10to13', () => {
    it('should convert valid ISBN-10 to ISBN-13', () => {
      expect(convertISBN10to13('0316769177')).toBe('9780316769174');
      expect(convertISBN10to13('0-316-76917-7')).toBe('9780316769174');
    });

    it('should return null for invalid ISBN-10', () => {
      expect(convertISBN10to13('0316769178')).toBe(null);
      expect(convertISBN10to13('invalid')).toBe(null);
    });

    it('should handle X check digit correctly', () => {
      const result = convertISBN10to13('043942089X');
      expect(result).toMatch(/^978/);
      expect(validateISBN13(result!)).toBe(true);
    });
  });

  describe('formatISBN', () => {
    it('should format ISBN-13 with hyphens', () => {
      expect(formatISBN('9780316769174')).toBe('978-0-31676-917-4');
      expect(formatISBN('9798123456001')).toBe('979-8-123456-00-1');
    });

    it('should format ISBN-10 with hyphens', () => {
      expect(formatISBN('0316769177')).toBe('0-31676-91-77');
    });

    it('should use custom separator', () => {
      expect(formatISBN('9780316769174', ' ')).toBe('978 0 31676 917 4');
      expect(formatISBN('9780316769174', '.')).toBe('978.0.31676.917.4');
    });

    it('should return original for invalid length', () => {
      expect(formatISBN('12345')).toBe('12345');
    });
  });

  describe('generatePlaceholderISBN', () => {
    it('should generate valid ISBN-13 with 979-8 prefix', () => {
      const isbn = generatePlaceholderISBN(123456);
      expect(isbn).toMatch(/^9798/);
      expect(validateISBN13(isbn)).toBe(true);
    });

    it('should pad book number to 6 digits', () => {
      const isbn = generatePlaceholderISBN(123);
      expect(isbn).toContain('000123');
      expect(validateISBN13(isbn)).toBe(true);
    });

    it('should truncate long book numbers', () => {
      const isbn = generatePlaceholderISBN(12345678);
      expect(isbn.length).toBe(13);
      expect(validateISBN13(isbn)).toBe(true);
    });
  });

  describe('extractISBN', () => {
    it('should extract ISBN-13 from text', () => {
      const text = 'This book has ISBN-13: 978-0-316-76917-4 in it.';
      expect(extractISBN(text)).toBe('978-0-316-76917-4');
    });

    it('should extract ISBN-10 from text', () => {
      const text = 'The ISBN-10 is 0-316-76917-7 for this edition.';
      expect(extractISBN(text)).toBe('0-316-76917-7');
    });

    it('should prefer ISBN-13 over ISBN-10', () => {
      const text = 'ISBN-13: 978-0-316-76917-4 and ISBN-10: 0-316-76917-7';
      expect(extractISBN(text)).toBe('978-0-316-76917-4');
    });

    it('should return null if no valid ISBN found', () => {
      expect(extractISBN('No ISBN in this text')).toBe(null);
      expect(extractISBN('Invalid ISBN: 123456789')).toBe(null);
    });

    it('should handle ISBN without prefix label', () => {
      const text = 'The number 978-0-316-76917-4 appears here.';
      expect(extractISBN(text)).toBe('978-0-316-76917-4');
    });
  });
});