#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Stephanus Pagination Mapping for Plato's Republic
 * 
 * Standard Stephanus references run from 327a to 621d
 * This maps our Gutenberg text line numbers to approximate Stephanus pages
 * Based on standard scholarly divisions
 */

interface StephanusReference {
  book: number;
  stephanusStart: string;
  stephanusEnd: string;
  lineStart: number;
  lineEnd: number;
  description: string;
}

// Standard Stephanus pagination for The Republic's major sections
// Based on the Oxford Classical Text and Loeb editions
const STEPHANUS_MAPPING: StephanusReference[] = [
  // Book I
  { book: 1, stephanusStart: '327a', stephanusEnd: '331d', lineStart: 8636, lineEnd: 9100, 
    description: 'Opening at Piraeus festival through Cephalus discussion' },
  { book: 1, stephanusStart: '331e', stephanusEnd: '336a', lineStart: 9100, lineEnd: 9800,
    description: 'Polemarchus on justice as helping friends/harming enemies' },
  { book: 1, stephanusStart: '336b', stephanusEnd: '354c', lineStart: 9800, lineEnd: 10337,
    description: 'Thrasymachus on justice as advantage of the stronger' },
    
  // Book II  
  { book: 2, stephanusStart: '357a', stephanusEnd: '362c', lineStart: 10340, lineEnd: 10900,
    description: 'Glaucon\'s challenge and Ring of Gyges' },
  { book: 2, stephanusStart: '362d', stephanusEnd: '376e', lineStart: 10900, lineEnd: 11300,
    description: 'Origins of the city and need for guardians' },
  { book: 2, stephanusStart: '376e', stephanusEnd: '383c', lineStart: 11300, lineEnd: 11777,
    description: 'Guardian education begins' },
    
  // Book III
  { book: 3, stephanusStart: '386a', stephanusEnd: '392c', lineStart: 11780, lineEnd: 12400,
    description: 'Censorship of poetry and proper stories for guardians' },
  { book: 3, stephanusStart: '392d', stephanusEnd: '403c', lineStart: 12400, lineEnd: 13000,
    description: 'Musical modes and physical training' },
  { book: 3, stephanusStart: '403d', stephanusEnd: '412b', lineStart: 13000, lineEnd: 13300,
    description: 'Selection and testing of guardians' },
  { book: 3, stephanusStart: '414b', stephanusEnd: '417b', lineStart: 13300, lineEnd: 13632,
    description: 'The Noble Lie and guardian living arrangements' },
    
  // Book IV
  { book: 4, stephanusStart: '419a', stephanusEnd: '427c', lineStart: 13635, lineEnd: 14200,
    description: 'Guardian happiness and city completion' },
  { book: 4, stephanusStart: '427d', stephanusEnd: '434d', lineStart: 14200, lineEnd: 14800,
    description: 'Four virtues of the city' },
  { book: 4, stephanusStart: '434e', stephanusEnd: '445e', lineStart: 14800, lineEnd: 15232,
    description: 'Justice in the soul and tripartite psychology' },
    
  // Book V
  { book: 5, stephanusStart: '449a', stephanusEnd: '457b', lineStart: 15235, lineEnd: 15900,
    description: 'Women guardians and gender equality' },
  { book: 5, stephanusStart: '457c', stephanusEnd: '466d', lineStart: 15900, lineEnd: 16600,
    description: 'Community of wives and children' },
  { book: 5, stephanusStart: '466e', stephanusEnd: '471c', lineStart: 16600, lineEnd: 16900,
    description: 'Warfare and treatment of Greeks' },
  { book: 5, stephanusStart: '471d', stephanusEnd: '480a', lineStart: 16900, lineEnd: 17194,
    description: 'Philosopher kings and knowledge vs opinion' },
    
  // Book VI
  { book: 6, stephanusStart: '484a', stephanusEnd: '487a', lineStart: 17197, lineEnd: 17700,
    description: 'Nature of the philosopher' },
  { book: 6, stephanusStart: '487b', stephanusEnd: '497a', lineStart: 17700, lineEnd: 18100,
    description: 'Why philosophy is despised' },
  { book: 6, stephanusStart: '504a', stephanusEnd: '509c', lineStart: 18100, lineEnd: 18400,
    description: 'The Form of the Good and Sun analogy' },
  { book: 6, stephanusStart: '509d', stephanusEnd: '511e', lineStart: 18400, lineEnd: 18766,
    description: 'The Divided Line' },
    
  // Book VII
  { book: 7, stephanusStart: '514a', stephanusEnd: '518b', lineStart: 18769, lineEnd: 19300,
    description: 'The Cave Allegory' },
  { book: 7, stephanusStart: '518c', stephanusEnd: '521c', lineStart: 19300, lineEnd: 19700,
    description: 'Return to the cave and philosopher\'s duty' },
  { book: 7, stephanusStart: '521d', stephanusEnd: '531c', lineStart: 19700, lineEnd: 20000,
    description: 'Mathematical studies curriculum' },
  { book: 7, stephanusStart: '531d', stephanusEnd: '541b', lineStart: 20000, lineEnd: 20246,
    description: 'Dialectic and philosopher training program' },
    
  // Book VIII
  { book: 8, stephanusStart: '543a', stephanusEnd: '545c', lineStart: 20249, lineEnd: 20600,
    description: 'Decline of states and the nuptial number' },
  { book: 8, stephanusStart: '545d', stephanusEnd: '550c', lineStart: 20600, lineEnd: 21000,
    description: 'Timocracy and the honor-loving man' },
  { book: 8, stephanusStart: '550d', stephanusEnd: '555b', lineStart: 21000, lineEnd: 21400,
    description: 'Oligarchy and the money-loving man' },
  { book: 8, stephanusStart: '555c', stephanusEnd: '569c', lineStart: 21400, lineEnd: 21831,
    description: 'Democracy and tyranny' },
    
  // Book IX
  { book: 9, stephanusStart: '571a', stephanusEnd: '576b', lineStart: 21834, lineEnd: 22200,
    description: 'The tyrannical man\'s psychology' },
  { book: 9, stephanusStart: '576c', stephanusEnd: '580c', lineStart: 22200, lineEnd: 22600,
    description: 'Comparison of just and unjust lives' },
  { book: 9, stephanusStart: '580d', stephanusEnd: '592b', lineStart: 22600, lineEnd: 23159,
    description: 'Three proofs that justice is superior' },
    
  // Book X
  { book: 10, stephanusStart: '595a', stephanusEnd: '602c', lineStart: 23162, lineEnd: 23500,
    description: 'Critique of poetry and imitation' },
  { book: 10, stephanusStart: '602d', stephanusEnd: '612a', lineStart: 23500, lineEnd: 23900,
    description: 'Immortality of the soul' },
  { book: 10, stephanusStart: '612b', stephanusEnd: '621d', lineStart: 23900, lineEnd: 24569,
    description: 'Rewards of justice and the Myth of Er' }
];

function interpolateStephanus(lineNumber: number): string {
  // Find the section containing this line
  for (let i = 0; i < STEPHANUS_MAPPING.length; i++) {
    const section = STEPHANUS_MAPPING[i];
    if (lineNumber >= section.lineStart && lineNumber <= section.lineEnd) {
      // Calculate position within section
      const sectionProgress = (lineNumber - section.lineStart) / (section.lineEnd - section.lineStart);
      
      // Parse start and end Stephanus references
      const startNum = parseInt(section.stephanusStart.slice(0, -1));
      const startLetter = section.stephanusStart.slice(-1);
      const endNum = parseInt(section.stephanusEnd.slice(0, -1));
      const endLetter = section.stephanusEnd.slice(-1);
      
      // Calculate approximate Stephanus page
      const totalPages = (endNum - startNum) * 5 + (endLetter.charCodeAt(0) - startLetter.charCodeAt(0));
      const progressPages = Math.floor(totalPages * sectionProgress);
      
      const newPageNum = startNum + Math.floor((startLetter.charCodeAt(0) - 97 + progressPages) / 5);
      const newPageLetter = String.fromCharCode(97 + ((startLetter.charCodeAt(0) - 97 + progressPages) % 5));
      
      return `${newPageNum}${newPageLetter}`;
    }
  }
  
  return 'Unknown';
}

async function generateStephanusMapping() {
  console.log('📚 Generating Stephanus Pagination Reference Mapping\n');
  console.log('This maps Gutenberg text line numbers to standard Stephanus references');
  console.log('(Used for academic citations of Plato\'s Republic)\n');
  console.log('=' .repeat(70));
  
  // Load chapter mapping
  const chapterMappingPath = join(process.cwd(), 'content/translations/books/platos-republic/chapters/chapter-mapping.json');
  const chapterMapping = JSON.parse(readFileSync(chapterMappingPath, 'utf-8'));
  
  // Create enhanced mapping with Stephanus references
  const enhancedMapping = {
    ...chapterMapping,
    stephanusInfo: {
      description: 'Stephanus pagination reference system for academic citations',
      rangeStart: '327a',
      rangeEnd: '621d',
      note: 'References are approximate due to textual variations between editions'
    },
    bookStephanusRanges: [] as any[],
    chapterStephanusReferences: [] as any[]
  };
  
  // Map each book to its Stephanus range
  for (const book of chapterMapping.books) {
    const bookSections = STEPHANUS_MAPPING.filter(s => s.book === book.book);
    const bookStephanusStart = bookSections[0]?.stephanusStart || 'Unknown';
    const bookStephanusEnd = bookSections[bookSections.length - 1]?.stephanusEnd || 'Unknown';
    
    enhancedMapping.bookStephanusRanges.push({
      book: book.book,
      stephanusRange: `${bookStephanusStart}-${bookStephanusEnd}`,
      lineRange: `${book.startLine}-${book.endLine}`
    });
    
    console.log(`\n📖 Book ${book.book}: Stephanus ${bookStephanusStart}-${bookStephanusEnd}`);
    console.log(`   Lines ${book.startLine}-${book.endLine}`);
    
    // Map each chapter
    for (const chapter of book.chapterDetails) {
      const [startLine, endLine] = chapter.lines.split('-').map(Number);
      const stephanusStart = interpolateStephanus(startLine);
      const stephanusEnd = interpolateStephanus(endLine);
      
      enhancedMapping.chapterStephanusReferences.push({
        book: book.book,
        chapter: chapter.chapter,
        title: chapter.title,
        stephanusRange: `${stephanusStart}-${stephanusEnd}`,
        lineRange: chapter.lines,
        words: chapter.words
      });
      
      console.log(`   Chapter ${chapter.chapter}: ${stephanusStart}-${stephanusEnd} "${chapter.title}"`);
    }
  }
  
  // Save enhanced mapping
  const outputPath = join(process.cwd(), 'content/translations/books/platos-republic/chapters/stephanus-mapping.json');
  writeFileSync(outputPath, JSON.stringify(enhancedMapping, null, 2));
  
  // Generate citation guide
  const citationGuide = `# Stephanus Pagination Reference Guide

## Overview
This guide maps our chapter divisions to standard Stephanus pagination for academic citations.

Stephanus pagination (named after Henri Estienne's 1578 edition) is the universal reference system for Plato's works. The Republic spans from 327a to 621d.

## How to Cite

### Standard Format
\`Plato, Republic [Stephanus page][section letter]\`

Example: "Plato, Republic 514a" (start of the Cave Allegory)

## Book-by-Book Stephanus Ranges

${STEPHANUS_MAPPING.filter((s, i, arr) => i === 0 || s.book !== arr[i-1].book)
  .map(s => {
    const bookSections = STEPHANUS_MAPPING.filter(sec => sec.book === s.book);
    const lastSection = bookSections[bookSections.length - 1];
    return `### Book ${s.book}: ${s.stephanusStart}-${lastSection.stephanusEnd}
${bookSections.map(sec => `- **${sec.stephanusStart}-${sec.stephanusEnd}**: ${sec.description}`).join('\n')}`;
  }).join('\n\n')}

## Important Sections

### Famous Passages
- **Ring of Gyges**: 359d-360d
- **Noble Lie**: 414b-415d
- **Ship of State**: 488a-489a
- **Sun Analogy**: 507b-509c
- **Divided Line**: 509d-511e
- **Cave Allegory**: 514a-517a
- **Philosopher King**: 473c-d
- **Myth of Er**: 614b-621d

## Notes on This Mapping

1. **Approximation**: Our line numbers are mapped to approximate Stephanus references
2. **Textual Variations**: Different editions may have slight variations
3. **Academic Use**: Always verify critical citations with standard editions
4. **Cross-Reference**: Use chapter-mapping.json for precise line numbers

## Citation Examples

\`\`\`
"Justice is doing one's own work" (Republic 433a-b)
"The Form of the Good" (Republic 507b-509c)
"Until philosophers are kings..." (Republic 473c-d)
\`\`\`

Generated: ${new Date().toISOString()}
`;
  
  const guideOutput = join(process.cwd(), 'content/translations/books/platos-republic/STEPHANUS_REFERENCE.md');
  writeFileSync(guideOutput, citationGuide);
  
  console.log('\n' + '=' .repeat(70));
  console.log('✅ STEPHANUS MAPPING COMPLETE\n');
  console.log(`📋 JSON mapping saved to: ${outputPath}`);
  console.log(`📖 Citation guide saved to: ${guideOutput}`);
  console.log('\n🎓 Academic Citation Support:');
  console.log('   - All 35 chapters mapped to Stephanus pages');
  console.log('   - Famous passages identified with precise references');
  console.log('   - Cross-reference system established for scholars');
  console.log('\n⚠️  Note: References are approximate due to edition variations');
  console.log('   Always verify critical citations with Oxford Classical Texts');
}

// Run the mapping
generateStephanusMapping().catch(console.error);