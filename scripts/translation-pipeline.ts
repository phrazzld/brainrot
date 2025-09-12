#!/usr/bin/env tsx

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Translation Preprocessing Pipeline for Plato's Republic
 * 
 * Converts source text into annotated markdown with:
 * - Speaker identification
 * - Philosophical concept tagging
 * - Dialogue structure analysis
 * - Translation memory integration
 */

interface AnnotatedSegment {
  type: 'dialogue' | 'narration' | 'argument' | 'analogy';
  speaker?: string;
  text: string;
  lineStart: number;
  lineEnd: number;
  concepts: string[];
  argumentStructure?: ArgumentStructure;
  translationNotes?: string[];
}

interface ArgumentStructure {
  type: 'premise' | 'conclusion' | 'refutation' | 'question' | 'analogy';
  logicalFlow: string;
  keyTerms: string[];
}

interface ProcessedChapter {
  book: number;
  chapter: number;
  title: string;
  segments: AnnotatedSegment[];
  speakers: Set<string>;
  concepts: Set<string>;
  wordCount: number;
  dialoguePercentage: number;
}

// Speaker patterns in the text
const SPEAKER_PATTERNS = {
  // Direct speech indicators
  directSpeech: /^([\w\s]+) said:/i,
  saidVariants: /(said|replied|answered|asked|exclaimed|continued|interrupted|observed|remarked|suggested|proposed|agreed|objected|retorted|whispered|shouted|declared|added|began|went on)/i,
  
  // Common speakers in The Republic
  speakers: [
    'Socrates', 'Glaucon', 'Adeimantus', 'Thrasymachus', 'Polemarchus',
    'Cephalus', 'Cleitophon', 'Polus', 'Callicles', 'Crito'
  ],
  
  // Dialogue markers
  dialogueStart: /^["']|^—/,
  dialogueEnd: /["']$|—$/,
  
  // Narration indicators
  narrationMarkers: /(I said|I replied|I asked|he said|she said|they said)/i
};

// Philosophical concepts to detect and tag
const PHILOSOPHICAL_CONCEPTS = {
  // Core concepts
  justice: /\b(justice|just|unjust|injustice|fairness|fair|unfair)\b/gi,
  virtue: /\b(virtue|virtuous|excellence|good|goodness|evil|vice|vicious)\b/gi,
  knowledge: /\b(knowledge|know|knowing|wisdom|wise|ignorance|ignorant|understanding)\b/gi,
  truth: /\b(truth|true|false|falsehood|reality|real|appearance|seeming)\b/gi,
  
  // Political concepts
  state: /\b(state|city|polis|republic|government|ruler|ruling|guardian|king)\b/gi,
  democracy: /\b(democracy|democratic|oligarchy|tyranny|tyrant|timocracy)\b/gi,
  
  // Psychological concepts
  soul: /\b(soul|spirit|appetite|reason|rational|desire|passion|emotion)\b/gi,
  happiness: /\b(happiness|happy|pleasure|pain|suffering|flourishing|eudaimonia)\b/gi,
  
  // Metaphysical concepts
  forms: /\b(form|forms|idea|ideas|essence|being|becoming|participation)\b/gi,
  good: /\b(the good|form of the good|highest good|ultimate good)\b/gi,
  
  // Educational concepts
  education: /\b(education|teaching|learning|curriculum|music|gymnastic|poetry)\b/gi,
  philosophy: /\b(philosophy|philosopher|philosophical|dialectic|argument|reasoning)\b/gi
};

// Argument structure patterns
const ARGUMENT_PATTERNS = {
  premise: /\b(if|suppose|assuming|given that|let us say|granted that)\b/i,
  conclusion: /\b(therefore|thus|hence|so|consequently|it follows|we conclude)\b/i,
  refutation: /\b(but|however|on the contrary|not so|false|wrong|mistaken)\b/i,
  question: /\?|^(what|why|how|who|where|when|is it|do you|can we|shall we)/i,
  analogy: /\b(like|as|similar to|just as|in the same way|compare|for example)\b/i
};

class TranslationPipeline {
  private chapterText: string;
  private lines: string[];
  private translationMemory: any;
  
  constructor(chapterPath: string, memoryPath?: string) {
    this.chapterText = readFileSync(chapterPath, 'utf-8');
    this.lines = this.chapterText.split('\n');
    
    if (memoryPath && existsSync(memoryPath)) {
      this.translationMemory = JSON.parse(readFileSync(memoryPath, 'utf-8'));
    }
  }
  
  /**
   * Main processing pipeline
   */
  process(): ProcessedChapter {
    const segments = this.segmentText();
    const annotatedSegments = segments.map(seg => this.annotateSegment(seg));
    
    // Collect statistics
    const speakers = new Set<string>();
    const concepts = new Set<string>();
    let dialogueWords = 0;
    let totalWords = 0;
    
    annotatedSegments.forEach(seg => {
      if (seg.speaker) speakers.add(seg.speaker);
      seg.concepts.forEach(c => concepts.add(c));
      
      const wordCount = seg.text.split(/\s+/).length;
      totalWords += wordCount;
      if (seg.type === 'dialogue') dialogueWords += wordCount;
    });
    
    return {
      book: this.extractBookNumber(),
      chapter: this.extractChapterNumber(),
      title: this.extractChapterTitle(),
      segments: annotatedSegments,
      speakers,
      concepts,
      wordCount: totalWords,
      dialoguePercentage: (dialogueWords / totalWords) * 100
    };
  }
  
  /**
   * Segment text into logical units
   */
  private segmentText(): AnnotatedSegment[] {
    const segments: AnnotatedSegment[] = [];
    let currentSegment: string[] = [];
    let currentType: 'dialogue' | 'narration' | 'argument' | 'analogy' = 'narration';
    let currentSpeaker: string | undefined;
    let segmentStart = 0;
    
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i].trim();
      if (!line) continue;
      
      // Check for speaker change
      const speakerMatch = this.detectSpeaker(line);
      if (speakerMatch) {
        // Save current segment if exists
        if (currentSegment.length > 0) {
          segments.push({
            type: currentType,
            speaker: currentSpeaker,
            text: currentSegment.join(' '),
            lineStart: segmentStart,
            lineEnd: i - 1,
            concepts: []
          });
        }
        
        // Start new segment
        currentSpeaker = speakerMatch;
        currentType = 'dialogue';
        currentSegment = [line];
        segmentStart = i;
      }
      // Check for argument markers
      else if (this.isArgumentMarker(line)) {
        if (currentSegment.length > 0) {
          segments.push({
            type: currentType,
            speaker: currentSpeaker,
            text: currentSegment.join(' '),
            lineStart: segmentStart,
            lineEnd: i - 1,
            concepts: []
          });
        }
        
        currentType = 'argument';
        currentSegment = [line];
        segmentStart = i;
      }
      // Check for analogy markers
      else if (this.isAnalogyMarker(line)) {
        if (currentSegment.length > 0) {
          segments.push({
            type: currentType,
            speaker: currentSpeaker,
            text: currentSegment.join(' '),
            lineStart: segmentStart,
            lineEnd: i - 1,
            concepts: []
          });
        }
        
        currentType = 'analogy';
        currentSegment = [line];
        segmentStart = i;
      }
      // Continue current segment
      else {
        currentSegment.push(line);
      }
    }
    
    // Save final segment
    if (currentSegment.length > 0) {
      segments.push({
        type: currentType,
        speaker: currentSpeaker,
        text: currentSegment.join(' '),
        lineStart: segmentStart,
        lineEnd: this.lines.length - 1,
        concepts: []
      });
    }
    
    return segments;
  }
  
  /**
   * Annotate a segment with concepts and structure
   */
  private annotateSegment(segment: AnnotatedSegment): AnnotatedSegment {
    // Detect philosophical concepts
    segment.concepts = this.detectConcepts(segment.text);
    
    // Analyze argument structure if applicable
    if (segment.type === 'argument' || segment.type === 'dialogue') {
      segment.argumentStructure = this.analyzeArgumentStructure(segment.text);
    }
    
    // Add translation notes from memory
    if (this.translationMemory) {
      segment.translationNotes = this.getTranslationNotes(segment);
    }
    
    return segment;
  }
  
  /**
   * Detect speaker from text
   */
  private detectSpeaker(line: string): string | undefined {
    // Check for explicit speaker markers
    const directMatch = line.match(SPEAKER_PATTERNS.directSpeech);
    if (directMatch) {
      const speaker = directMatch[1].trim();
      if (SPEAKER_PATTERNS.speakers.some(s => 
        speaker.toLowerCase().includes(s.toLowerCase())
      )) {
        return speaker;
      }
    }
    
    // Check for speech verbs with known speakers
    for (const speaker of SPEAKER_PATTERNS.speakers) {
      const pattern = new RegExp(`\\b${speaker}\\s+${SPEAKER_PATTERNS.saidVariants.source}`, 'i');
      if (pattern.test(line)) {
        return speaker;
      }
    }
    
    return undefined;
  }
  
  /**
   * Detect philosophical concepts in text
   */
  private detectConcepts(text: string): string[] {
    const concepts = new Set<string>();
    
    for (const [concept, pattern] of Object.entries(PHILOSOPHICAL_CONCEPTS)) {
      if (pattern.test(text)) {
        concepts.add(concept);
      }
    }
    
    return Array.from(concepts);
  }
  
  /**
   * Analyze argument structure
   */
  private analyzeArgumentStructure(text: string): ArgumentStructure | undefined {
    let type: ArgumentStructure['type'] = 'premise';
    const keyTerms: string[] = [];
    
    // Detect argument type
    if (ARGUMENT_PATTERNS.conclusion.test(text)) {
      type = 'conclusion';
    } else if (ARGUMENT_PATTERNS.refutation.test(text)) {
      type = 'refutation';
    } else if (ARGUMENT_PATTERNS.question.test(text)) {
      type = 'question';
    } else if (ARGUMENT_PATTERNS.analogy.test(text)) {
      type = 'analogy';
    }
    
    // Extract key philosophical terms
    for (const [concept, pattern] of Object.entries(PHILOSOPHICAL_CONCEPTS)) {
      const matches = text.match(pattern);
      if (matches) {
        keyTerms.push(...matches.map(m => m.toLowerCase()));
      }
    }
    
    return {
      type,
      logicalFlow: this.describeLogicalFlow(type),
      keyTerms: [...new Set(keyTerms)].slice(0, 5) // Top 5 unique terms
    };
  }
  
  /**
   * Check if line contains argument markers
   */
  private isArgumentMarker(line: string): boolean {
    return ARGUMENT_PATTERNS.premise.test(line) ||
           ARGUMENT_PATTERNS.conclusion.test(line) ||
           ARGUMENT_PATTERNS.refutation.test(line);
  }
  
  /**
   * Check if line contains analogy markers
   */
  private isAnalogyMarker(line: string): boolean {
    return ARGUMENT_PATTERNS.analogy.test(line) && line.length > 50;
  }
  
  /**
   * Describe logical flow based on type
   */
  private describeLogicalFlow(type: ArgumentStructure['type']): string {
    const flows = {
      premise: 'Setting up initial assumptions',
      conclusion: 'Drawing logical inference',
      refutation: 'Challenging previous claim',
      question: 'Socratic questioning method',
      analogy: 'Explaining through comparison'
    };
    return flows[type];
  }
  
  /**
   * Get translation notes from memory
   */
  private getTranslationNotes(segment: AnnotatedSegment): string[] {
    const notes: string[] = [];
    
    if (segment.speaker && this.translationMemory?.characterVoices?.[segment.speaker]) {
      const voice = this.translationMemory.characterVoices[segment.speaker];
      notes.push(`Voice: ${voice.personality}`);
    }
    
    if (segment.concepts.length > 0 && this.translationMemory?.philosophicalConcepts) {
      const relevantConcepts = this.translationMemory.philosophicalConcepts
        .filter((c: any) => segment.concepts.includes(c.original.toLowerCase()));
      
      relevantConcepts.forEach((c: any) => {
        notes.push(`${c.original} → ${c.modern}`);
      });
    }
    
    return notes;
  }
  
  /**
   * Extract book number from text
   */
  private extractBookNumber(): number {
    const match = this.chapterText.match(/BOOK (\d+)/);
    return match ? parseInt(match[1]) : 1;
  }
  
  /**
   * Extract chapter number from text
   */
  private extractChapterNumber(): number {
    const match = this.chapterText.match(/CHAPTER (\d+)/);
    return match ? parseInt(match[1]) : 1;
  }
  
  /**
   * Extract chapter title from text
   */
  private extractChapterTitle(): string {
    const lines = this.chapterText.split('\n');
    for (const line of lines) {
      if (line.includes('CHAPTER')) {
        const match = line.match(/CHAPTER \d+:\s*(.+)/);
        if (match) return match[1].trim();
      }
    }
    return 'Unknown Chapter';
  }
  
  /**
   * Generate annotated markdown output
   */
  generateAnnotatedMarkdown(processed: ProcessedChapter): string {
    const output: string[] = [];
    
    // Header with metadata
    output.push('---');
    output.push(`book: ${processed.book}`);
    output.push(`chapter: ${processed.chapter}`);
    output.push(`title: "${processed.title}"`);
    output.push(`speakers: [${Array.from(processed.speakers).map(s => `"${s}"`).join(', ')}]`);
    output.push(`concepts: [${Array.from(processed.concepts).map(c => `"${c}"`).join(', ')}]`);
    output.push(`word_count: ${processed.wordCount}`);
    output.push(`dialogue_percentage: ${processed.dialoguePercentage.toFixed(1)}`);
    output.push('---');
    output.push('');
    output.push(`# Book ${processed.book}, Chapter ${processed.chapter}: ${processed.title}`);
    output.push('');
    
    // Process each segment
    for (const segment of processed.segments) {
      // Add segment metadata as HTML comments
      output.push(`<!-- Type: ${segment.type}, Lines: ${segment.lineStart}-${segment.lineEnd} -->`);
      
      if (segment.speaker) {
        output.push(`<!-- Speaker: ${segment.speaker} -->`);
      }
      
      if (segment.concepts.length > 0) {
        output.push(`<!-- Concepts: ${segment.concepts.join(', ')} -->`);
      }
      
      if (segment.argumentStructure) {
        output.push(`<!-- Argument: ${segment.argumentStructure.type} - ${segment.argumentStructure.logicalFlow} -->`);
        if (segment.argumentStructure.keyTerms.length > 0) {
          output.push(`<!-- Key Terms: ${segment.argumentStructure.keyTerms.join(', ')} -->`);
        }
      }
      
      if (segment.translationNotes && segment.translationNotes.length > 0) {
        output.push(`<!-- Translation Notes:`);
        segment.translationNotes.forEach(note => {
          output.push(`     - ${note}`);
        });
        output.push(`-->`);
      }
      
      // Format the actual text based on type
      if (segment.type === 'dialogue' && segment.speaker) {
        output.push(`**${segment.speaker}:** ${segment.text}`);
      } else if (segment.type === 'analogy') {
        output.push(`> *[Analogy]* ${segment.text}`);
      } else if (segment.type === 'argument') {
        output.push(`> ${segment.text}`);
      } else {
        output.push(segment.text);
      }
      
      output.push('');
    }
    
    // Footer with statistics
    output.push('---');
    output.push('## Processing Statistics');
    output.push(`- Total segments: ${processed.segments.length}`);
    output.push(`- Dialogue segments: ${processed.segments.filter(s => s.type === 'dialogue').length}`);
    output.push(`- Argument segments: ${processed.segments.filter(s => s.type === 'argument').length}`);
    output.push(`- Analogy segments: ${processed.segments.filter(s => s.type === 'analogy').length}`);
    output.push(`- Unique speakers: ${processed.speakers.size}`);
    output.push(`- Philosophical concepts: ${processed.concepts.size}`);
    
    return output.join('\n');
  }
}

/**
 * Process a single chapter
 */
async function processChapter(
  chapterPath: string,
  memoryPath: string,
  outputPath: string
): Promise<void> {
  console.log(`🔄 Processing: ${chapterPath}`);
  
  const pipeline = new TranslationPipeline(chapterPath, memoryPath);
  const processed = pipeline.process();
  const annotatedMarkdown = pipeline.generateAnnotatedMarkdown(processed);
  
  // Create output directory if needed
  const outputDir = join(outputPath, '..');
  mkdirSync(outputDir, { recursive: true });
  
  // Write annotated markdown
  writeFileSync(outputPath, annotatedMarkdown);
  
  console.log(`✅ Generated: ${outputPath}`);
  console.log(`   Speakers: ${Array.from(processed.speakers).join(', ')}`);
  console.log(`   Concepts: ${processed.concepts.size} unique`);
  console.log(`   Dialogue: ${processed.dialoguePercentage.toFixed(1)}%`);
}

/**
 * Main execution - process Book 1 Chapter 1 as example
 */
async function main() {
  console.log('🚀 Translation Preprocessing Pipeline\n');
  
  // Example: Process Book 1, Chapter 1
  const chapterPath = join(
    process.cwd(),
    'content/translations/books/platos-republic/chapters/book-01-chapter-1.txt'
  );
  
  const memoryPath = join(
    process.cwd(),
    'content/translations/books/platos-republic/translation-memory/book-01-chapter-1.json'
  );
  
  const outputPath = join(
    process.cwd(),
    'content/translations/books/platos-republic/annotated/book-01-chapter-1.md'
  );
  
  if (!existsSync(chapterPath)) {
    console.error(`❌ Chapter file not found: ${chapterPath}`);
    process.exit(1);
  }
  
  await processChapter(chapterPath, memoryPath, outputPath);
  
  console.log('\n✨ Pipeline complete! Annotated markdown ready for translation.');
  console.log('\n📝 Next steps:');
  console.log('1. Review the annotated markdown for accuracy');
  console.log('2. Use the annotations to guide Gen Z translation');
  console.log('3. Maintain speaker voices and philosophical concepts');
}

// Export for use in other scripts
export { TranslationPipeline, processChapter, ProcessedChapter };

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}