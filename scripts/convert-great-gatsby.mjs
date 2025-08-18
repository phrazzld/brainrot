#!/usr/bin/env node

/**
 * Convert Great Gatsby markdown files to text and upload to blob storage
 */

import { stripMarkdown } from '../packages/@brainrot/converter/dist/index.js';
import { BlobService } from '../packages/@brainrot/blob-client/dist/index.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const BASE_URL = process.env.NEXT_PUBLIC_BLOB_BASE_URL;

if (!TOKEN || !BASE_URL) {
  console.error('Missing required environment variables:');
  console.error('BLOB_READ_WRITE_TOKEN:', TOKEN ? '✓' : '✗');
  console.error('NEXT_PUBLIC_BLOB_BASE_URL:', BASE_URL ? '✓' : '✗');
  process.exit(1);
}

const blobService = new BlobService(TOKEN, BASE_URL);

async function convertAndUpload() {
  const bookDir = path.join(__dirname, '..', 'content', 'translations', 'books', 'great-gatsby', 'brainrot');
  
  try {
    // Get all markdown files
    const files = await fs.readdir(bookDir);
    const mdFiles = files.filter(f => f.endsWith('.md')).sort();
    
    console.log(`Found ${mdFiles.length} markdown files to convert`);
    
    for (const file of mdFiles) {
      const filePath = path.join(bookDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Convert markdown to plain text
      const plainText = stripMarkdown(content);
      
      // Generate blob path
      // The web app expects: /assets/text/great-gatsby/brainrot-{name}.txt
      const baseName = path.basename(file, '.md');
      const blobPath = `assets/text/great-gatsby/brainrot-${baseName}.txt`;
      
      console.log(`Uploading ${file} → ${blobPath}`);
      
      // Upload to blob storage (use uploadText for direct content)
      const result = await blobService.uploadText(plainText, blobPath);
      
      if (result.success) {
        console.log(`✓ Uploaded: ${result.url}`);
      } else {
        console.error(`✗ Failed to upload ${file}:`, result.error);
      }
    }
    
    // Also upload introduction if it exists
    const introPath = path.join(bookDir, 'introduction.md');
    try {
      const introContent = await fs.readFile(introPath, 'utf-8');
      const introText = stripMarkdown(introContent);
      const introBlobPath = 'assets/text/great-gatsby/brainrot-introduction.txt';
      
      console.log(`Uploading introduction.md → ${introBlobPath}`);
      const result = await blobService.uploadText(introText, introBlobPath);
      
      if (result.success) {
        console.log(`✓ Uploaded introduction: ${result.url}`);
      } else {
        console.error(`✗ Failed to upload introduction:`, result.error);
      }
    } catch (err) {
      console.log('No introduction.md file found');
    }
    
    console.log('\n✨ Great Gatsby conversion and upload complete!');
    
  } catch (error) {
    console.error('Error during conversion:', error);
    process.exit(1);
  }
}

// Run the conversion
convertAndUpload();