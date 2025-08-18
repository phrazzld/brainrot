/**
 * @brainrot/templates
 * Publishing templates for EPUB, PDF, and Kindle formats
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the absolute path to a template file
 * @param {string} type - Template type: 'epub', 'pdf-paperback', 'pdf-hardcover', 'kindle'
 * @returns {string} Absolute path to the template file
 */
export function getTemplatePath(type) {
  const templates = {
    'epub': join(__dirname, 'epub', 'brainrot.epub.template'),
    'epub-css': join(__dirname, 'epub', 'brainrot-style.css'),
    'pdf-paperback': join(__dirname, 'pdf', 'paperback.latex'),
    'pdf-hardcover': join(__dirname, 'pdf', 'hardcover.latex'),
    'kindle': join(__dirname, 'kindle', 'kindle.template'),
    'cover-svg': join(__dirname, 'covers', 'cover-template.svg')
  };
  
  if (!templates[type]) {
    throw new Error(`Unknown template type: ${type}. Valid types are: ${Object.keys(templates).join(', ')}`);
  }
  
  return templates[type];
}

/**
 * Read a template file and return its contents
 * @param {string} type - Template type
 * @returns {string} Template contents
 */
export function readTemplate(type) {
  const path = getTemplatePath(type);
  return readFileSync(path, 'utf8');
}

/**
 * Get color scheme for a book
 * @param {string} bookSlug - Book identifier (e.g., 'great-gatsby')
 * @returns {Object} Color scheme with primary, secondary, and accent colors
 */
export function getColorScheme(bookSlug) {
  const schemesPath = join(__dirname, 'covers', 'color-schemes.json');
  const schemes = JSON.parse(readFileSync(schemesPath, 'utf8'));
  
  const slug = bookSlug.replace('the-', '');
  return schemes.schemes[slug] || schemes.schemes.default;
}

/**
 * Get emoji for a book cover
 * @param {string} bookSlug - Book identifier
 * @returns {string} Emoji character
 */
export function getCoverEmoji(bookSlug) {
  const schemesPath = join(__dirname, 'covers', 'color-schemes.json');
  const schemes = JSON.parse(readFileSync(schemesPath, 'utf8'));
  
  const slug = bookSlug.replace('the-', '');
  return schemes.emojis[slug] || schemes.emojis.default;
}

/**
 * Replace template variables with actual values
 * @param {string} template - Template string with {{VARIABLE}} placeholders
 * @param {Object} values - Object with variable values
 * @returns {string} Processed template
 */
export function processTemplate(template, values) {
  let processed = template;
  
  // Replace all {{VARIABLE}} placeholders
  for (const [key, value] of Object.entries(values)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    processed = processed.replace(regex, value || '');
  }
  
  // Pandoc-style variables for LaTeX
  for (const [key, value] of Object.entries(values)) {
    const regex = new RegExp(`\\$${key}\\$`, 'g');
    processed = processed.replace(regex, value || '');
  }
  
  // Handle conditional sections $if(variable)$ ... $endif$
  processed = processed.replace(/\$if\(([^)]+)\)\$([\s\S]*?)\$endif\$/g, (match, variable, content) => {
    const varName = variable.trim();
    return values[varName] ? content : '';
  });
  
  return processed;
}

/**
 * Generate a cover SVG for a book
 * @param {Object} metadata - Book metadata
 * @returns {string} Processed SVG content
 */
export function generateCover(metadata) {
  const template = readTemplate('cover-svg');
  const colorScheme = getColorScheme(metadata.slug || 'default');
  const emoji = getCoverEmoji(metadata.slug || 'default');
  
  // Prepare title lines (split long titles)
  const titleWords = (metadata.title || '').split(' ');
  let titleLine1 = '';
  let titleLine2 = '';
  
  if (titleWords.length > 3) {
    const midpoint = Math.ceil(titleWords.length / 2);
    titleLine1 = titleWords.slice(0, midpoint).join(' ');
    titleLine2 = titleWords.slice(midpoint).join(' ');
  } else {
    titleLine1 = metadata.title;
  }
  
  const values = {
    COLOR_PRIMARY: colorScheme.primary,
    COLOR_SECONDARY: colorScheme.secondary,
    TITLE_LINE_1: titleLine1.toUpperCase(),
    TITLE_LINE_2: titleLine2.toUpperCase(),
    TITLE_SIZE: titleLine2 ? '120' : '150',
    SUBTITLE: metadata.subtitle || metadata.shortDescription || '',
    GENRE: metadata.genre || 'CLASSIC LITERATURE',
    EMOJI: emoji,
    AUTHOR: metadata.author || '',
    TRANSLATOR: metadata.translator || 'Brainrot Translator'
  };
  
  return processTemplate(template, values);
}

// Export all functions
export default {
  getTemplatePath,
  readTemplate,
  getColorScheme,
  getCoverEmoji,
  processTemplate,
  generateCover
};