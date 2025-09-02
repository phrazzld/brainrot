#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { load } from 'js-yaml';
import { generateCover } from '../packages/@brainrot/templates/index.js';
// Canvas import removed - generating SVG only

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateCoverForBook(bookSlug) {
  console.log(`Generating cover for ${bookSlug}...`);
  
  // Load metadata
  const metadataPath = path.join(__dirname, '../content/translations/books', bookSlug, 'metadata.yaml');
  const metadataYaml = await fs.readFile(metadataPath, 'utf-8');
  const metadata = load(metadataYaml);
  
  // Add slug to metadata
  metadata.slug = bookSlug;
  
  // Generate SVG cover
  console.log('Generating SVG cover...');
  const svgContent = generateCover(metadata);
  
  // Create output directory
  const outputDir = path.join(__dirname, '../generated', bookSlug);
  await fs.mkdir(outputDir, { recursive: true });
  
  // Save SVG for reference
  const svgPath = path.join(outputDir, 'cover.svg');
  await fs.writeFile(svgPath, svgContent);
  console.log(`SVG cover saved to: ${svgPath}`);
  
  // For KDP, we need a JPG. Since we don't have Sharp/Canvas readily available,
  // let's create a simple placeholder JPG using CSS-to-image approach
  // or instruct user to convert manually
  
  console.log('SVG cover generated successfully!');
  console.log('To convert to JPG for KDP:');
  console.log(`1. Open ${svgPath} in a browser`);
  console.log(`2. Take a screenshot or export as JPG`);
  console.log(`3. Save as ${path.join(outputDir, 'cover.jpg')}`);
  console.log('4. Run: pnpm kdp:process-cover great-gatsby /path/to/cover.jpg');
  
  return svgPath;
}

// Get book slug from command line
const bookSlug = process.argv[2];

if (!bookSlug) {
  console.error('Usage: node generate-cover.js <book-slug>');
  process.exit(1);
}

generateCoverForBook(bookSlug)
  .then((svgPath) => {
    console.log(`Cover generation completed: ${svgPath}`);
  })
  .catch((error) => {
    console.error('Error generating cover:', error);
    process.exit(1);
  });