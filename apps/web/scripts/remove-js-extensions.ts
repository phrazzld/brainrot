#!/usr/bin/env node
/**
 * Script to remove .js extensions from TypeScript imports
 * 
 * This fixes the module resolution issues caused by incorrectly added .js extensions.
 * TypeScript with moduleResolution: bundler requires NO extensions for TS files.
 */
import fs from 'fs';
import path from 'path';

// Import statement regex patterns
const IMPORT_REGEX = /import\s+(?:{[^}]*}|\*\s+as\s+[^,;]*|[^,;]*)\s+from\s+['"]([^'"]+)\.js['"]/g;
const EXPORT_FROM_REGEX = /export\s+(?:{[^}]*}|\*(?:\s+as\s+[^,;]*)?)\s+from\s+['"]([^'"]+)\.js['"]/g;
const DYNAMIC_IMPORT_REGEX = /import\(['"]([^'"]+)\.js['"]\)/g;
const REQUIRE_REGEX = /require\(['"]([^'"]+)\.js['"]\)/g;

// Paths to exclude
const EXCLUDE_DIRS = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  'public',
  'reports',
];

// File types to process
const INCLUDE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

interface ImportFix {
  original: string;
  fixed: string;
  position: number;
}

/**
 * Check if import should have .js removed
 */
function shouldRemoveJsExtension(importPath: string): boolean {
  // Don't remove from external packages
  if (!importPath.startsWith('.') && !importPath.startsWith('/') && !importPath.startsWith('@/')) {
    return false;
  }
  
  // Don't remove from actual .js files (check if they exist)
  // This is for cases where we're importing actual JavaScript files
  // We'll skip this check for now and remove all .js extensions from relative/alias imports
  
  return true;
}

/**
 * Process file content and remove .js extensions
 */
function processContent(content: string, _filePath: string): { content: string; fixes: number } {
  let newContent = content;
  let fixes = 0;
  const replacements: ImportFix[] = [];
  
  // Process different import types
  const patterns = [
    { regex: IMPORT_REGEX, type: 'import' },
    { regex: EXPORT_FROM_REGEX, type: 'export' },
    { regex: DYNAMIC_IMPORT_REGEX, type: 'dynamic' },
    { regex: REQUIRE_REGEX, type: 'require' },
  ];
  
  for (const { regex, type } of patterns) {
    regex.lastIndex = 0;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      const importPath = match[1];
      
      if (shouldRemoveJsExtension(importPath + '.js')) {
        const original = match[0];
        let fixed = '';
        
        if (type === 'import') {
          fixed = original.replace(`'${importPath}.js'`, `'${importPath}'`)
                         .replace(`"${importPath}.js"`, `"${importPath}"`);
        } else if (type === 'export') {
          fixed = original.replace(`'${importPath}.js'`, `'${importPath}'`)
                         .replace(`"${importPath}.js"`, `"${importPath}"`);
        } else if (type === 'dynamic') {
          fixed = `import('${importPath}')`;
        } else if (type === 'require') {
          fixed = `require('${importPath}')`;
        }
        
        replacements.push({
          original,
          fixed,
          position: match.index,
        });
      }
    }
  }
  
  // Sort replacements by position (reverse order to maintain positions)
  replacements.sort((a, b) => b.position - a.position);
  
  // Apply replacements
  for (const replacement of replacements) {
    const before = newContent.substring(0, replacement.position);
    const after = newContent.substring(replacement.position + replacement.original.length);
    newContent = before + replacement.fixed + after;
    fixes++;
  }
  
  return { content: newContent, fixes };
}

/**
 * Process a single file
 */
function processFile(filePath: string): { fixes: number; error?: string } {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { content: newContent, fixes } = processContent(content, filePath);
    
    if (fixes > 0) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Fixed ${fixes} imports in ${filePath}`);
    }
    
    return { fixes };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error processing ${filePath}: ${message}`);
    return { fixes: 0, error: message };
  }
}

/**
 * Process directory recursively
 */
function processDirectory(dir: string): { filesProcessed: number; totalFixes: number; errors: number } {
  let filesProcessed = 0;
  let totalFixes = 0;
  let errors = 0;
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (!EXCLUDE_DIRS.includes(entry.name)) {
          const subResult = processDirectory(fullPath);
          filesProcessed += subResult.filesProcessed;
          totalFixes += subResult.totalFixes;
          errors += subResult.errors;
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (INCLUDE_EXTENSIONS.includes(ext)) {
          filesProcessed++;
          const result = processFile(fullPath);
          totalFixes += result.fixes;
          if (result.error) errors++;
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error processing directory ${dir}: ${error}`);
    errors++;
  }
  
  return { filesProcessed, totalFixes, errors };
}

/**
 * Main function
 */
function main() {
  console.log('🔧 Starting removal of .js extensions from TypeScript imports...\n');
  
  const targetDir = process.argv[2] || 'apps/web';
  const fullPath = path.resolve(targetDir);
  
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Directory not found: ${fullPath}`);
    process.exit(1);
  }
  
  console.log(`📁 Processing directory: ${fullPath}\n`);
  
  const startTime = Date.now();
  const { filesProcessed, totalFixes, errors } = processDirectory(fullPath);
  const duration = Date.now() - startTime;
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log(`   Files processed: ${filesProcessed}`);
  console.log(`   Imports fixed: ${totalFixes}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Duration: ${duration}ms`);
  console.log('='.repeat(50));
  
  if (totalFixes > 0) {
    console.log('\n✅ Successfully removed .js extensions from imports!');
    console.log('💡 Next steps:');
    console.log('   1. Run "pnpm build" to verify the fixes');
    console.log('   2. Run tests to ensure nothing broke');
    console.log('   3. Commit the changes');
  } else {
    console.log('\n✨ No .js extensions found to remove.');
  }
  
  process.exit(errors > 0 ? 1 : 0);
}

// Run the script
main();