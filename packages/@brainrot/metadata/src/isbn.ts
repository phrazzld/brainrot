/**
 * ISBN validation and generation utilities
 */

/**
 * Validate an ISBN-13 number
 * @param isbn The ISBN to validate (with or without hyphens)
 * @returns True if valid ISBN-13
 */
export function validateISBN13(isbn: string): boolean {
  // Remove any hyphens or spaces
  const cleanISBN = isbn.replace(/[-\s]/g, '');
  
  // Check if it's exactly 13 digits
  if (!/^\d{13}$/.test(cleanISBN)) {
    return false;
  }
  
  // Calculate check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(cleanISBN[i], 10);
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  const lastDigit = parseInt(cleanISBN[12], 10);
  
  return checkDigit === lastDigit;
}

/**
 * Validate an ISBN-10 number
 * @param isbn The ISBN to validate (with or without hyphens)
 * @returns True if valid ISBN-10
 */
export function validateISBN10(isbn: string): boolean {
  // Remove any hyphens or spaces
  const cleanISBN = isbn.replace(/[-\s]/g, '');
  
  // Check if it's exactly 10 characters (digits or X for check digit)
  if (!/^\d{9}[\dX]$/.test(cleanISBN)) {
    return false;
  }
  
  // Calculate check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanISBN[i], 10) * (10 - i);
  }
  
  const checkChar = cleanISBN[9];
  const checkDigit = checkChar === 'X' ? 10 : parseInt(checkChar, 10);
  sum += checkDigit;
  
  return sum % 11 === 0;
}

/**
 * Validate any ISBN (10 or 13)
 * @param isbn The ISBN to validate
 * @returns True if valid ISBN-10 or ISBN-13
 */
export function validateISBN(isbn: string): boolean {
  const cleanISBN = isbn.replace(/[-\s]/g, '');
  
  if (cleanISBN.length === 13) {
    return validateISBN13(isbn);
  } else if (cleanISBN.length === 10) {
    return validateISBN10(isbn);
  }
  
  return false;
}

/**
 * Convert ISBN-10 to ISBN-13
 * @param isbn10 The ISBN-10 to convert
 * @returns ISBN-13 string or null if invalid
 */
export function convertISBN10to13(isbn10: string): string | null {
  if (!validateISBN10(isbn10)) {
    return null;
  }
  
  // Remove any hyphens or spaces
  const cleanISBN = isbn10.replace(/[-\s]/g, '');
  
  // Prefix with 978 and remove the ISBN-10 check digit
  const isbn13Base = '978' + cleanISBN.substring(0, 9);
  
  // Calculate new check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(isbn13Base[i], 10);
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  
  return isbn13Base + checkDigit;
}

/**
 * Format ISBN with hyphens
 * @param isbn The ISBN to format
 * @param separator The separator to use (default: '-')
 * @returns Formatted ISBN or original if cannot be formatted
 */
export function formatISBN(isbn: string, separator: string = '-'): string {
  const cleanISBN = isbn.replace(/[-\s]/g, '');
  
  if (cleanISBN.length === 13) {
    // Format as 978-8-XXXXXX-XX-X (example format, actual varies by publisher)
    // For self-published: 979-8-XXXXXX-XX-X
    if (cleanISBN.startsWith('979')) {
      return [
        cleanISBN.substring(0, 3),
        cleanISBN.substring(3, 4),
        cleanISBN.substring(4, 10),
        cleanISBN.substring(10, 12),
        cleanISBN.substring(12, 13),
      ].join(separator);
    } else {
      return [
        cleanISBN.substring(0, 3),
        cleanISBN.substring(3, 4),
        cleanISBN.substring(4, 9),
        cleanISBN.substring(9, 12),
        cleanISBN.substring(12, 13),
      ].join(separator);
    }
  } else if (cleanISBN.length === 10) {
    // Format as X-XXXXX-XX-X (example format)
    return [
      cleanISBN.substring(0, 1),
      cleanISBN.substring(1, 6),
      cleanISBN.substring(6, 8),
      cleanISBN.substring(8, 10),
    ].join(separator);
  }
  
  return isbn;
}

/**
 * Generate a placeholder ISBN-13 for self-published books
 * @param bookNumber A unique number for the book (6 digits)
 * @returns A valid ISBN-13 starting with 979-8
 */
export function generatePlaceholderISBN(bookNumber: number): string {
  // Ensure bookNumber is 6 digits
  const paddedNumber = String(bookNumber).padStart(6, '0').substring(0, 6);
  
  // Create base ISBN with 979-8 prefix (for self-published)
  // Format: 979-8-XXXXXX-XX-X
  // Using a consistent publisher code for our examples
  const baseISBN = '9798' + paddedNumber + '00';
  
  // Calculate check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(baseISBN[i], 10);
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  
  return baseISBN + checkDigit;
}

/**
 * Extract ISBN from a string (finds first valid ISBN)
 * @param text Text that may contain an ISBN
 * @returns The first valid ISBN found or null
 */
export function extractISBN(text: string): string | null {
  // Look for ISBN-13 pattern
  const isbn13Pattern = /(?:ISBN[- ]?13[:\s]*)?(97[89][- ]?\d{1}[- ]?\d{6}[- ]?\d{2}[- ]?\d{1})/gi;
  const isbn13Matches = text.match(isbn13Pattern);
  
  if (isbn13Matches) {
    for (const match of isbn13Matches) {
      // Extract just the number part
      const isbn = match.replace(/^ISBN[- ]?13[:\s]*/i, '');
      if (validateISBN13(isbn)) {
        return isbn;
      }
    }
  }
  
  // Look for ISBN-10 pattern
  const isbn10Pattern = /(?:ISBN[- ]?10[:\s]*)?(\d{1}[- ]?\d{5}[- ]?\d{2}[- ]?[\dX])/gi;
  const isbn10Matches = text.match(isbn10Pattern);
  
  if (isbn10Matches) {
    for (const match of isbn10Matches) {
      // Extract just the number part
      const isbn = match.replace(/^ISBN[- ]?10[:\s]*/i, '');
      if (validateISBN10(isbn)) {
        return isbn;
      }
    }
  }
  
  return null;
}