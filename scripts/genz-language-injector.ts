#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Gen Z Language Injection System with Contextual Awareness
 * 
 * Intelligently injects modern slang and internet culture references
 * while preserving philosophical accuracy and maintaining character voices
 */

interface InjectionContext {
  text: string;
  speaker?: string;
  complexity: number; // 1-5 scale
  concepts: string[];
  argumentType?: string;
  previousSlangCount: number;
  totalWords: number;
}

interface InjectionResult {
  translatedText: string;
  slangCount: number;
  slangPercentage: number;
  injectedTerms: string[];
  complexityAdjustment: string;
}

interface CharacterVocabulary {
  name: string;
  slangPreference: 'high' | 'medium' | 'low';
  favoriteTerms: string[];
  avoidTerms: string[];
  speechQuirks: string[];
  memePhrases: string[];
}

/**
 * Slang Frequency Governor
 * Controls injection rate to maintain 10-15% saturation
 */
class SlangGovernor {
  private readonly MIN_SATURATION = 0.10; // 10%
  private readonly MAX_SATURATION = 0.15; // 15%
  private readonly WINDOW_SIZE = 100; // Words to consider for saturation
  private recentInjections: number[] = [];
  
  /**
   * Calculate current saturation level
   */
  getCurrentSaturation(wordCount: number, slangCount: number): number {
    if (wordCount === 0) return 0;
    return slangCount / wordCount;
  }
  
  /**
   * Determine if more slang can be injected
   */
  canInject(context: InjectionContext): boolean {
    const currentSaturation = this.getCurrentSaturation(
      context.totalWords,
      context.previousSlangCount
    );
    
    // Check if we're below maximum saturation
    if (currentSaturation >= this.MAX_SATURATION) {
      return false;
    }
    
    // Apply complexity penalty (higher complexity = less slang)
    const complexityPenalty = (context.complexity - 1) * 0.02;
    const adjustedMax = this.MAX_SATURATION - complexityPenalty;
    
    return currentSaturation < adjustedMax;
  }
  
  /**
   * Calculate how many slang terms to inject
   */
  calculateInjectionCount(context: InjectionContext): number {
    const words = context.text.split(/\s+/).length;
    const currentSaturation = this.getCurrentSaturation(
      context.totalWords,
      context.previousSlangCount
    );
    
    // Target saturation based on complexity
    const targetSaturation = this.MAX_SATURATION - (context.complexity - 1) * 0.02;
    const saturationGap = targetSaturation - currentSaturation;
    
    if (saturationGap <= 0) return 0;
    
    // Calculate how many terms we can add
    const maxNewTerms = Math.floor(words * saturationGap);
    
    // Apply speaker preference
    if (context.speaker) {
      const vocabulary = CHARACTER_VOCABULARIES[context.speaker];
      if (vocabulary) {
        if (vocabulary.slangPreference === 'high') {
          return Math.min(maxNewTerms, Math.ceil(words * 0.20));
        } else if (vocabulary.slangPreference === 'low') {
          return Math.min(maxNewTerms, Math.floor(words * 0.05));
        }
      }
    }
    
    return Math.min(maxNewTerms, Math.floor(words * 0.15));
  }
  
  /**
   * Track injection for sliding window
   */
  recordInjection(wordPosition: number, count: number): void {
    for (let i = 0; i < count; i++) {
      this.recentInjections.push(wordPosition + i);
    }
    
    // Keep only recent injections within window
    const cutoff = wordPosition - this.WINDOW_SIZE;
    this.recentInjections = this.recentInjections.filter(pos => pos > cutoff);
  }
  
  /**
   * Get injection density in recent window
   */
  getRecentDensity(currentPosition: number): number {
    const windowStart = currentPosition - this.WINDOW_SIZE;
    const recentCount = this.recentInjections.filter(
      pos => pos > windowStart && pos <= currentPosition
    ).length;
    
    return recentCount / this.WINDOW_SIZE;
  }
}

/**
 * Tone Modulation System
 * Adjusts language based on philosophical complexity
 */
class ToneModulator {
  private readonly COMPLEXITY_LEVELS = {
    1: { // Simple narrative
      formality: 0.2,
      slangIntensity: 0.9,
      memeDensity: 0.8,
      description: 'Casual storytelling vibe'
    },
    2: { // Basic argument
      formality: 0.4,
      slangIntensity: 0.7,
      memeDensity: 0.6,
      description: 'Chill philosophical discussion'
    },
    3: { // Complex argument
      formality: 0.5,
      slangIntensity: 0.5,
      memeDensity: 0.4,
      description: 'Balanced modern philosophy'
    },
    4: { // Deep philosophy
      formality: 0.7,
      slangIntensity: 0.3,
      memeDensity: 0.2,
      description: 'Serious with light modern touches'
    },
    5: { // Peak complexity
      formality: 0.8,
      slangIntensity: 0.2,
      memeDensity: 0.1,
      description: 'Mostly serious, minimal slang'
    }
  };
  
  /**
   * Calculate complexity score from context
   */
  calculateComplexity(context: InjectionContext): number {
    let score = 1;
    
    // Increase for philosophical concepts
    score += Math.min(context.concepts.length * 0.3, 1.5);
    
    // Increase for argument types
    if (context.argumentType) {
      if (context.argumentType === 'conclusion') score += 0.5;
      if (context.argumentType === 'refutation') score += 0.7;
      if (context.argumentType === 'analogy') score += 0.3;
    }
    
    // Increase for specific complex concepts
    const complexConcepts = ['forms', 'dialectic', 'tripartite soul', 'philosopher king'];
    const hasComplexConcept = context.concepts.some(c => 
      complexConcepts.some(cc => c.toLowerCase().includes(cc))
    );
    if (hasComplexConcept) score += 1;
    
    // Cap at 5
    return Math.min(Math.ceil(score), 5);
  }
  
  /**
   * Get tone parameters for given complexity
   */
  getToneParams(complexity: number) {
    return this.COMPLEXITY_LEVELS[complexity as keyof typeof this.COMPLEXITY_LEVELS] 
           || this.COMPLEXITY_LEVELS[3];
  }
  
  /**
   * Select appropriate slang based on tone
   */
  selectSlang(availableSlang: string[], complexity: number): string[] {
    const params = this.getToneParams(complexity);
    
    // Filter slang by intensity
    const appropriateSlang = availableSlang.filter(term => {
      // High complexity = avoid intense slang
      if (complexity >= 4) {
        const intenseTerms = ['bussin', 'no cap', 'fr fr', 'deadass', 'finna', 'bet'];
        return !intenseTerms.includes(term.toLowerCase());
      }
      
      // Medium complexity = balanced
      if (complexity === 3) {
        const veryIntense = ['bussin', 'finna', 'periodt', 'stan'];
        return !veryIntense.includes(term.toLowerCase());
      }
      
      // Low complexity = all slang welcome
      return true;
    });
    
    // Reduce set based on intensity parameter
    const targetCount = Math.floor(appropriateSlang.length * params.slangIntensity);
    return appropriateSlang.slice(0, targetCount);
  }
}

/**
 * Character Vocabulary Banks
 */
const CHARACTER_VOCABULARIES: Record<string, CharacterVocabulary> = {
  'Socrates': {
    name: 'Socrates',
    slangPreference: 'medium',
    favoriteTerms: [
      'lowkey', 'ngl', 'tbh', 'literally', 'actually',
      'basically', 'kinda', 'like', 'vibe', 'energy'
    ],
    avoidTerms: ['cap', 'bussin', 'stan', 'slay', 'periodt'],
    speechQuirks: [
      'fr tho, {statement}',
      'okay but like... {question}',
      'that\'s crazy but {continuation}',
      'no but seriously {point}',
      'wait hold up, {realization}'
    ],
    memePhrases: [
      'skill issue',
      'that ain\'t it chief',
      'big brain time',
      'galaxy brain take',
      'we do a little trolling'
    ]
  },
  
  'Glaucon': {
    name: 'Glaucon',
    slangPreference: 'high',
    favoriteTerms: [
      'based', 'valid', 'facts', 'straight up', 'deadass',
      'no cap', 'on god', 'fire', 'goated', 'W take'
    ],
    avoidTerms: ['bestie', 'slay', 'girlie', 'hun'],
    speechQuirks: [
      'okay but {counterpoint}',
      'hear me out tho {argument}',
      'nah but fr {agreement}',
      'that\'s actually {observation}',
      'wait so {clarification}'
    ],
    memePhrases: [
      'big if true',
      'source: trust me bro',
      'literally 1984',
      'we live in a society',
      'wake up sheeple'
    ]
  },
  
  'Thrasymachus': {
    name: 'Thrasymachus',
    slangPreference: 'high',
    favoriteTerms: [
      'cope', 'seethe', 'mald', 'ratio', 'L take',
      'cringe', 'beta', 'sigma', 'grindset', 'alpha'
    ],
    avoidTerms: ['wholesome', 'valid', 'bestie', 'queen'],
    speechQuirks: [
      'LMAO {mockery}',
      'imagine {sarcasm}',
      'couldn\'t be me {dismissal}',
      'stay mad {taunt}',
      'cope harder {insult}'
    ],
    memePhrases: [
      'sigma grindset',
      'touch grass',
      'skill issue',
      'get good',
      'stay poor'
    ]
  },
  
  'Adeimantus': {
    name: 'Adeimantus',
    slangPreference: 'low',
    favoriteTerms: [
      'honestly', 'realistically', 'practically', 'genuinely',
      'obviously', 'clearly', 'essentially', 'fundamentally'
    ],
    avoidTerms: ['bussin', 'periodt', 'stan', 'finna', 'bet'],
    speechQuirks: [
      'but realistically {practical}',
      'in practice though {reality}',
      'people will say {reputation}',
      'the optics are {appearance}',
      'honestly though {truth}'
    ],
    memePhrases: [
      'read the room',
      'that\'s not very cash money',
      'red flag',
      'toxic trait',
      'problematic'
    ]
  },
  
  'Polemarchus': {
    name: 'Polemarchus',
    slangPreference: 'medium',
    favoriteTerms: [
      'homie', 'bro', 'fam', 'squad', 'crew',
      'ride or die', 'day one', 'real one', 'OG', 'goat'
    ],
    avoidTerms: ['sigma', 'beta', 'cope', 'seethe'],
    speechQuirks: [
      'my guy {address}',
      'the homies {group}',
      'we been {history}',
      'can\'t let {loyalty}',
      'gotta {obligation}'
    ],
    memePhrases: [
      'bros before',
      'ride or die',
      'day ones',
      'loyalty check',
      'real recognize real'
    ]
  },
  
  'Cephalus': {
    name: 'Cephalus',
    slangPreference: 'low',
    favoriteTerms: [
      'back in my day', 'these days', 'nowadays', 'young people',
      'in my time', 'when I was younger', 'at my age'
    ],
    avoidTerms: ['bussin', 'no cap', 'fr fr', 'stan', 'slay'],
    speechQuirks: [
      'kids these days {observation}',
      'back when {nostalgia}',
      'you\'ll understand when {wisdom}',
      'trust me, {experience}',
      'at my age {perspective}'
    ],
    memePhrases: [
      'ok boomer energy',
      'touch grass',
      'go outside',
      'millennials ruined',
      'participation trophy'
    ]
  }
};

/**
 * Main Gen Z Language Injector
 */
class GenZInjector {
  private governor: SlangGovernor;
  private modulator: ToneModulator;
  private slangBank: string[];
  private translationMemory: any;
  
  constructor(slangBank: string[], translationMemory?: any) {
    this.governor = new SlangGovernor();
    this.modulator = new ToneModulator();
    this.slangBank = slangBank;
    this.translationMemory = translationMemory;
  }
  
  /**
   * Main injection method
   */
  inject(context: InjectionContext): InjectionResult {
    // Calculate complexity if not provided
    if (!context.complexity) {
      context.complexity = this.modulator.calculateComplexity(context);
    }
    
    // Get tone parameters
    const toneParams = this.modulator.getToneParams(context.complexity);
    
    // Check if we can inject
    if (!this.governor.canInject(context)) {
      return {
        translatedText: context.text,
        slangCount: 0,
        slangPercentage: 0,
        injectedTerms: [],
        complexityAdjustment: 'Maximum saturation reached'
      };
    }
    
    // Calculate injection count
    const injectionCount = this.governor.calculateInjectionCount(context);
    
    // Select appropriate slang
    const availableSlang = this.getContextualSlang(context);
    const selectedSlang = this.modulator.selectSlang(availableSlang, context.complexity);
    
    // Perform injection
    const result = this.performInjection(
      context.text,
      selectedSlang,
      injectionCount,
      context.speaker
    );
    
    // Add character-specific quirks
    if (context.speaker) {
      result.translatedText = this.addCharacterQuirks(
        result.translatedText,
        context.speaker,
        context.complexity
      );
    }
    
    // Calculate final statistics
    const words = result.translatedText.split(/\s+/).length;
    const slangPercentage = (result.slangCount / words) * 100;
    
    return {
      ...result,
      slangPercentage,
      complexityAdjustment: toneParams.description
    };
  }
  
  /**
   * Get contextually appropriate slang
   */
  private getContextualSlang(context: InjectionContext): string[] {
    let slang = [...this.slangBank];
    
    // Add character-specific terms
    if (context.speaker) {
      const vocab = CHARACTER_VOCABULARIES[context.speaker];
      if (vocab) {
        slang = [...vocab.favoriteTerms, ...slang];
        // Remove avoided terms
        slang = slang.filter(term => !vocab.avoidTerms.includes(term));
      }
    }
    
    // Add concept-specific slang
    if (context.concepts.includes('justice')) {
      slang.push('based', 'fair', 'valid', 'W', 'L');
    }
    if (context.concepts.includes('knowledge')) {
      slang.push('woke', 'galaxy brain', 'big brain', 'smooth brain');
    }
    if (context.concepts.includes('virtue')) {
      slang.push('goated', 'chad', 'sigma', 'gigachad');
    }
    
    return [...new Set(slang)]; // Remove duplicates
  }
  
  /**
   * Perform the actual text injection
   */
  private performInjection(
    text: string,
    slang: string[],
    count: number,
    speaker?: string
  ): Partial<InjectionResult> {
    let translatedText = text;
    const injectedTerms: string[] = [];
    let actualCount = 0;
    
    // Common replacements
    const replacements: Record<string, string[]> = {
      'very': ['super', 'hella', 'mad', 'dummy'],
      'good': ['fire', 'valid', 'goated', 'based'],
      'bad': ['cringe', 'sus', 'mid', 'L'],
      'think': ['feel like', 'lowkey think', 'ngl think'],
      'said': ['was like', 'went', 'was all'],
      'really': ['literally', 'genuinely', 'actually', 'fr'],
      'yes': ['yeah', 'yup', 'facts', 'bet'],
      'no': ['nah', 'nope', 'cap', 'not it'],
      'friend': ['homie', 'bestie', 'fam', 'bro'],
      'person': ['dude', 'guy', 'individual', 'mf'],
      'understand': ['get it', 'vibe with', 'feel', 'see the vision']
    };
    
    // Perform strategic replacements
    for (const [original, options] of Object.entries(replacements)) {
      if (actualCount >= count) break;
      
      const regex = new RegExp(`\\b${original}\\b`, 'gi');
      if (regex.test(translatedText)) {
        const replacement = options[Math.floor(Math.random() * options.length)];
        translatedText = translatedText.replace(regex, (match) => {
          actualCount++;
          injectedTerms.push(replacement);
          return replacement;
        });
      }
    }
    
    // Add filler words for natural flow
    if (actualCount < count && speaker) {
      const fillers = ['like', 'literally', 'basically', 'actually', 'lowkey'];
      const sentences = translatedText.split(/[.!?]/);
      
      translatedText = sentences.map(sentence => {
        if (actualCount < count && Math.random() < 0.3) {
          const filler = fillers[Math.floor(Math.random() * fillers.length)];
          actualCount++;
          injectedTerms.push(filler);
          return sentence.replace(/^(\s*)/, `$1${filler}, `);
        }
        return sentence;
      }).join('. ');
    }
    
    return {
      translatedText,
      slangCount: actualCount,
      injectedTerms
    };
  }
  
  /**
   * Add character-specific speech quirks
   */
  private addCharacterQuirks(
    text: string,
    speaker: string,
    complexity: number
  ): string {
    const vocab = CHARACTER_VOCABULARIES[speaker];
    if (!vocab) return text;
    
    // Low complexity = more quirks
    const quirkProbability = complexity <= 2 ? 0.3 : complexity === 3 ? 0.2 : 0.1;
    
    // Split into sentences
    const sentences = text.split(/([.!?])/);
    
    return sentences.map((sentence, idx) => {
      // Only modify actual sentences, not punctuation
      if (idx % 2 !== 0) return sentence;
      
      if (Math.random() < quirkProbability) {
        const quirk = vocab.speechQuirks[Math.floor(Math.random() * vocab.speechQuirks.length)];
        
        // Replace placeholder with relevant part of sentence
        if (quirk.includes('{')) {
          const placeholder = quirk.match(/\{(\w+)\}/)?.[1];
          if (placeholder) {
            // Extract relevant part based on placeholder type
            const extracted = this.extractForPlaceholder(sentence, placeholder);
            return quirk.replace(/\{(\w+)\}/, extracted);
          }
        }
        
        // Add meme phrase occasionally
        if (Math.random() < 0.1 && vocab.memePhrases.length > 0) {
          const meme = vocab.memePhrases[Math.floor(Math.random() * vocab.memePhrases.length)];
          return `${sentence} (${meme})`;
        }
      }
      
      return sentence;
    }).join('');
  }
  
  /**
   * Extract sentence part for placeholder
   */
  private extractForPlaceholder(sentence: string, placeholder: string): string {
    const words = sentence.trim().split(/\s+/);
    
    switch (placeholder) {
      case 'statement':
      case 'point':
      case 'continuation':
        return sentence.trim();
      case 'question':
        return sentence.includes('?') ? sentence.trim() : `${sentence.trim()}?`;
      case 'counterpoint':
      case 'argument':
        return words.slice(0, Math.min(words.length, 10)).join(' ');
      case 'realization':
      case 'observation':
        return words.slice(-Math.min(words.length, 8)).join(' ');
      default:
        return sentence.trim();
    }
  }
}

/**
 * Process a chapter with Gen Z injection
 */
async function processWithInjection(
  annotatedPath: string,
  memoryPath: string,
  outputPath: string
): Promise<void> {
  console.log(`💬 Processing with Gen Z injection: ${annotatedPath}`);
  
  // Load annotated markdown
  const annotated = readFileSync(annotatedPath, 'utf-8');
  
  // Load translation memory
  const memory = JSON.parse(readFileSync(memoryPath, 'utf-8'));
  
  // Initialize injector
  const injector = new GenZInjector(memory.slangBank || [], memory);
  
  // Process each segment
  const lines = annotated.split('\n');
  const output: string[] = [];
  let totalSlangCount = 0;
  let totalWords = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip metadata lines
    if (line.startsWith('<!--') || line.startsWith('---') || line.startsWith('#')) {
      output.push(line);
      continue;
    }
    
    // Extract context from comments
    const context = extractContextFromComments(lines, i);
    
    if (context && line.trim()) {
      const injectionContext: InjectionContext = {
        text: line.replace(/^\*\*[^:]+:\*\*\s*/, ''), // Remove speaker prefix
        speaker: context.speaker,
        complexity: context.complexity || 3,
        concepts: context.concepts || [],
        argumentType: context.argumentType,
        previousSlangCount: totalSlangCount,
        totalWords: totalWords
      };
      
      const result = injector.inject(injectionContext);
      
      // Update counters
      totalSlangCount += result.slangCount;
      totalWords += result.translatedText.split(/\s+/).length;
      
      // Format output
      if (context.speaker) {
        output.push(`**${context.speaker}:** ${result.translatedText}`);
      } else {
        output.push(result.translatedText);
      }
      
      // Add injection stats as comment
      if (result.slangCount > 0) {
        output.push(`<!-- Injected: ${result.injectedTerms.join(', ')} (${result.slangPercentage.toFixed(1)}%) -->`);
      }
    } else {
      output.push(line);
    }
  }
  
  // Add summary statistics
  output.push('');
  output.push('---');
  output.push('## Gen Z Injection Statistics');
  output.push(`- Total slang injected: ${totalSlangCount} terms`);
  output.push(`- Overall saturation: ${((totalSlangCount / totalWords) * 100).toFixed(1)}%`);
  output.push(`- Target range: 10-15%`);
  
  // Create output directory if needed
  const outputDir = outputPath.substring(0, outputPath.lastIndexOf('/'));
  const { mkdirSync } = require('fs');
  mkdirSync(outputDir, { recursive: true });
  
  // Write output
  writeFileSync(outputPath, output.join('\n'));
  
  console.log(`✅ Gen Z injection complete: ${outputPath}`);
  console.log(`   Total slang: ${totalSlangCount} terms`);
  console.log(`   Saturation: ${((totalSlangCount / totalWords) * 100).toFixed(1)}%`);
}

/**
 * Extract context from HTML comments
 */
function extractContextFromComments(lines: string[], currentIndex: number): any {
  const context: any = {};
  
  // Look backwards for context comments
  for (let i = currentIndex - 1; i >= Math.max(0, currentIndex - 5); i--) {
    const line = lines[i];
    
    if (line.includes('<!-- Speaker:')) {
      const match = line.match(/Speaker:\s*([^-]+)/);
      if (match) context.speaker = match[1].trim();
    }
    
    if (line.includes('<!-- Concepts:')) {
      const match = line.match(/Concepts:\s*([^-]+)/);
      if (match) context.concepts = match[1].split(',').map(c => c.trim());
    }
    
    if (line.includes('<!-- Argument:')) {
      const match = line.match(/Argument:\s*(\w+)/);
      if (match) context.argumentType = match[1];
    }
    
    if (line.includes('<!-- Type:')) {
      const match = line.match(/Type:\s*(\w+)/);
      if (match) context.type = match[1];
    }
  }
  
  // Calculate complexity based on concepts
  if (context.concepts) {
    context.complexity = Math.min(1 + context.concepts.length * 0.5, 5);
  }
  
  return context;
}

/**
 * Main execution
 */
async function main() {
  console.log('🎮 Gen Z Language Injection System\n');
  
  // Example: Process annotated Book 1 Chapter 1
  const annotatedPath = join(
    process.cwd(),
    'content/translations/books/platos-republic/annotated/book-01-chapter-1.md'
  );
  
  const memoryPath = join(
    process.cwd(),
    'content/translations/books/platos-republic/translation-memory/book-01-chapter-1.json'
  );
  
  const outputPath = join(
    process.cwd(),
    'content/translations/books/platos-republic/genz-injected/book-01-chapter-1.md'
  );
  
  await processWithInjection(annotatedPath, memoryPath, outputPath);
  
  console.log('\n🔥 Gen Z injection complete! Ready for final translation.');
}

// Export for use in other scripts
export { GenZInjector, SlangGovernor, ToneModulator, CHARACTER_VOCABULARIES };

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}