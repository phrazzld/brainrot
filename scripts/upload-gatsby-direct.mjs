#!/usr/bin/env node

/**
 * Convert Great Gatsby markdown files to text and upload to blob storage
 * Direct implementation using @vercel/blob
 */

import { put } from '@vercel/blob';
import { stripMarkdown } from '../packages/@brainrot/converter/dist/index.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

if (!TOKEN) {
  console.error('Missing BLOB_READ_WRITE_TOKEN environment variable');
  process.exit(1);
}

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
      
      try {
        // Upload to blob storage using @vercel/blob directly
        const blob = await put(blobPath, plainText, {
          access: 'public',
          token: TOKEN,
          contentType: 'text/plain',
        });
        
        console.log(`✓ Uploaded: ${blob.url}`);
      } catch (error) {
        console.error(`✗ Failed to upload ${file}:`, error.message);
      }
    }
    
    // Also upload introduction if it exists
    const introPath = path.join(bookDir, 'introduction.md');
    try {
      const introContent = await fs.readFile(introPath, 'utf-8');
      const introText = stripMarkdown(introContent);
      const introBlobPath = 'assets/text/great-gatsby/brainrot-introduction.txt';
      
      console.log(`Uploading introduction.md → ${introBlobPath}`);
      
      const blob = await put(introBlobPath, introText, {
        access: 'public',
        token: TOKEN,
        contentType: 'text/plain',
      });
      
      console.log(`✓ Uploaded introduction: ${blob.url}`);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error(`✗ Failed to upload introduction:`, err.message);
      } else {
        console.log('No introduction.md file found');
      }
    }
    
    console.log('\n✨ Great Gatsby conversion and upload complete!');
    
  } catch (error) {
    console.error('Error during conversion:', error);
    process.exit(1);
  }
}

// Run the conversion
convertAndUpload();