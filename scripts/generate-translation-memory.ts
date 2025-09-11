#!/usr/bin/env tsx

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface TranslationMemory {
  chapter: string;
  book: number;
  chapterNumber: number;
  keyTerms: Record<string, string>;
  characterVoices: Record<string, CharacterVoice>;
  philosophicalConcepts: PhilosophicalConcept[];
  contextNotes: string[];
  slangBank: string[];
}

interface CharacterVoice {
  originalName: string;
  modernName: string;
  personality: string;
  speechPatterns: string[];
  catchphrases: string[];
}

interface PhilosophicalConcept {
  original: string;
  modern: string;
  context: string;
  importance: 'critical' | 'major' | 'minor';
}

// Core philosophical terms that must be consistently translated
const CORE_TERMS: Record<string, string> = {
  // Justice & Ethics
  'justice': 'being based and fair',
  'injustice': 'being cringe and unfair',
  'virtue': 'being goated',
  'excellence': 'absolute peak performance',
  'the good': 'the ultimate W',
  'the just': 'the based ones',
  'the unjust': 'the L-takers',
  
  // Political Terms
  'guardian': 'elite defender',
  'philosopher king': 'galaxy brain ruler',
  'auxiliary': 'enforcer squad',
  'craftsman': 'grindset worker',
  'tyrant': 'toxic dictator',
  'democracy': 'chaos mode government',
  'oligarchy': 'rich kid rule',
  'timocracy': 'clout-chaser state',
  
  // Philosophical Concepts
  'forms': 'eternal blueprints',
  'the form of the good': 'the ultimate reality check',
  'knowledge': 'being actually woke',
  'opinion': 'mid-tier takes',
  'wisdom': 'gigachad brain energy',
  'ignorance': 'NPC mindset',
  'truth': 'the real tea',
  'appearance': 'surface-level vibes',
  'reality': 'the actual facts',
  
  // Soul Parts
  'reason': 'big brain energy',
  'spirit': 'emotional damage dealer',
  'appetite': 'hungry boi instincts',
  'soul': 'your whole vibe',
  'harmony': 'everything hitting different',
  
  // Educational Terms
  'education': 'leveling up your brain',
  'gymnastic': 'getting absolutely jacked',
  'music': 'vibe cultivation',
  'dialectic': 'galaxy brain debate mode',
  'mathematics': 'number autism',
  
  // Metaphysical
  'being': 'existing for real',
  'becoming': 'constant flux energy',
  'essence': 'core programming',
  'participation': 'downloading the vibe'
};

// Character voice profiles
const CHARACTER_VOICES: Record<string, CharacterVoice> = {
  'Socrates': {
    originalName: 'Socrates',
    modernName: 'Socrates (Based Philosophy Streamer)',
    personality: 'Trolling mentor who acts dumb but is galaxy brain',
    speechPatterns: [
      'fr fr, but like... what even IS [concept]?',
      'no cap, that take is kinda sus though',
      'okay but lowkey... *proceeds to destroy entire argument*',
      'bestie, you\'re literally proving my point rn',
      'that\'s crazy... anyway, so you\'re saying [ridiculous conclusion]?'
    ],
    catchphrases: [
      'skill issue tbh',
      'that\'s giving NPC energy',
      'we do a little philosophical trolling',
      'absolutely cooked take',
      'rare Thrasymachus L'
    ]
  },
  'Glaucon': {
    originalName: 'Glaucon',
    modernName: 'Glaucon (Devil\'s Advocate Hypebeast)',
    personality: 'Smart but needs validation, always pushing boundaries',
    speechPatterns: [
      'okay but what if we\'re all just coping?',
      'based take, but hear me out...',
      'socrates, you can\'t just...',
      'nah but seriously though',
      'this is literally impossible but go off'
    ],
    catchphrases: [
      'big if true',
      'source: trust me bro',
      'wake up sheeple',
      'society moment',
      'literally 1984'
    ]
  },
  'Thrasymachus': {
    originalName: 'Thrasymachus',
    modernName: 'Thrasymachus (Edgelord Grindset Coach)',
    personality: 'Aggressive, cynical, might-makes-right energy',
    speechPatterns: [
      'LMAO you actually believe that?',
      'stop the cap RIGHT NOW',
      'only betas think justice matters',
      'sigma rule #1: might makes right',
      'you\'re all sheep and I\'m the wolf'
    ],
    catchphrases: [
      'cope harder',
      'justice is for losers',
      'get that bread by any means',
      'morality is a social construct',
      'stay mad, stay poor'
    ]
  },
  'Adeimantus': {
    originalName: 'Adeimantus',
    modernName: 'Adeimantus (Practical Skeptic)',
    personality: 'Realistic, concerned with reputation and consequences',
    speechPatterns: [
      'but what about the optics though?',
      'okay but in practice...',
      'people only care about seeming good',
      'that\'s all theoretical bestie',
      'touch grass, this won\'t work irl'
    ],
    catchphrases: [
      'PR nightmare',
      'read the room',
      'that\'s not very cash money',
      'massive red flag',
      'terminally online take'
    ]
  },
  'Polemarchus': {
    originalName: 'Polemarchus',
    modernName: 'Polemarchus (Loyalty Stan)',
    personality: 'Traditional values but trying to be modern',
    speechPatterns: [
      'my dad always said...',
      'it\'s about loyalty, you wouldn\'t understand',
      'ride or die for the homies',
      'family over everything',
      'that\'s just how we were raised'
    ],
    catchphrases: [
      'homies help homies',
      'opps get dropped',
      'loyalty check',
      'blood is thicker',
      'old school values'
    ]
  },
  'Cephalus': {
    originalName: 'Cephalus',
    modernName: 'Cephalus (Boomer Wisdom)',
    personality: 'Old money, traditional but chill',
    speechPatterns: [
      'back in my day...',
      'money can\'t buy peace of mind',
      'you\'ll understand when you\'re older',
      'I\'ve seen some things',
      'death hits different at my age'
    ],
    catchphrases: [
      'touch grass kids',
      'wealth is mid actually',
      'mortality check',
      'generational wisdom',
      'retirement vibes'
    ]
  }
};

// Gen Z slang bank for injection
const SLANG_BANK = [
  // Positive
  'slaps', 'hits different', 'bussin', 'fire', 'goated', 'valid', 'based', 'chad move',
  'absolutely cooking', 'no cap', 'fr fr', 'lowkey', 'highkey', 'deadass', 'on god',
  'periodt', 'slay', 'ate and left no crumbs', 'understood the assignment', 'main character energy',
  
  // Negative  
  'L take', 'cringe', 'sus', 'mid', 'fell off', 'ratio + L', 'toxic', 'problematic',
  'giving NPC energy', 'beta behavior', 'skill issue', 'cope', 'seethe', 'mald',
  'touch grass', 'chronically online', 'down bad', 'caught in 4k', 'emotional damage',
  
  // Neutral/Structural
  'ngl', 'tbh', 'imo', 'literally', 'basically', 'actually', 'genuinely', 'unironically',
  'bestie', 'fam', 'chief', 'king', 'queen', 'bro', 'homie', 'my guy', 'girlie',
  
  // Reactions
  'oof', 'yikes', 'big yikes', 'that\'s tough', 'F in chat', 'RIP', 'GG', 'W', 'L',
  'that ain\'t it', 'it\'s giving...', 'the way that...', 'not me thinking...',
  'imagine', 'couldn\'t be me', 'why is this literally me', 'I\'m deceased', 'crying',
  
  // Internet Culture
  'vibe check', 'mood', 'same energy', 'chaotic energy', 'unhinged', 'feral', 'goblin mode',
  'touch grass', 'terminally online', 'delulu', 'parasocial', 'canon event', 'NPC behavior',
  'main quest', 'side quest', 'speedrun', 'any % run', 'RNG', 'META', 'nerf', 'buff'
];

// Book-specific concepts
const BOOK_CONCEPTS: Record<number, PhilosophicalConcept[]> = {
  1: [
    { original: 'giving each his due', modern: 'giving everyone their receipts', context: 'Cephalus/Polemarchus definition', importance: 'major' },
    { original: 'helping friends and harming enemies', modern: 'ride or die for homies, ops get dropped', context: 'Polemarchus definition', importance: 'major' },
    { original: 'advantage of the stronger', modern: 'sigma grindset always wins', context: 'Thrasymachus definition', importance: 'critical' },
    { original: 'craft analogy', modern: 'skill specialization argument', context: 'Socrates refutation method', importance: 'critical' }
  ],
  2: [
    { original: 'Ring of Gyges', modern: 'invisibility hacks IRL', context: 'Ultimate power corrupts test', importance: 'critical' },
    { original: 'three types of good', modern: 'tier list of valuable things', context: 'Glaucon\'s classification', importance: 'major' },
    { original: 'social contract', modern: 'society\'s terms of service', context: 'Origin of justice', importance: 'critical' },
    { original: 'city of pigs', modern: 'basic NPC society', context: 'First city model', importance: 'minor' }
  ],
  3: [
    { original: 'noble lie', modern: 'necessary reality distortion field', context: 'Myth of metals', importance: 'critical' },
    { original: 'myth of metals', modern: 'genetic tier system lore', context: 'Social stratification', importance: 'major' },
    { original: 'censorship of poetry', modern: 'content moderation for society', context: 'Educational reform', importance: 'major' },
    { original: 'guardians', modern: 'elite warrior-philosophers', context: 'Ruling class', importance: 'critical' }
  ],
  4: [
    { original: 'tripartite soul', modern: 'three-part personality system', context: 'Psychological model', importance: 'critical' },
    { original: 'wisdom', modern: 'galaxy brain governance', context: 'Virtue of rulers', importance: 'major' },
    { original: 'courage', modern: 'based defender energy', context: 'Virtue of guardians', importance: 'major' },
    { original: 'moderation', modern: 'balanced vibe check', context: 'Virtue of all classes', importance: 'major' },
    { original: 'justice in the soul', modern: 'internal harmony hits different', context: 'Personal justice', importance: 'critical' }
  ],
  5: [
    { original: 'philosopher kings', modern: 'galaxy brain rulers', context: 'Ideal government', importance: 'critical' },
    { original: 'women guardians', modern: 'girlboss warriors', context: 'Gender equality', importance: 'critical' },
    { original: 'communal wives and children', modern: 'no nuclear family mode', context: 'Social structure', importance: 'major' },
    { original: 'knowledge vs opinion', modern: 'facts vs mid takes', context: 'Epistemology', importance: 'critical' }
  ],
  6: [
    { original: 'Form of the Good', modern: 'ultimate reality source code', context: 'Highest knowledge', importance: 'critical' },
    { original: 'sun analogy', modern: 'the Good is basically the sun but for reality', context: 'Illumination metaphor', importance: 'critical' },
    { original: 'divided line', modern: 'knowledge tier list visualization', context: 'Levels of reality', importance: 'critical' },
    { original: 'ship of state', modern: 'country is a ship and everyone\'s fighting for the wheel', context: 'Political metaphor', importance: 'major' }
  ],
  7: [
    { original: 'cave allegory', modern: 'we\'re all watching shadows on TikTok', context: 'Reality vs illusion', importance: 'critical' },
    { original: 'return to the cave', modern: 'trying to redpill the NPCs', context: 'Philosopher\'s duty', importance: 'critical' },
    { original: 'mathematical education', modern: 'number autism training arc', context: 'Curriculum', importance: 'major' },
    { original: 'dialectic', modern: 'final boss debate skills', context: 'Highest education', importance: 'critical' }
  ],
  8: [
    { original: 'decline of states', modern: 'how societies take the L', context: 'Political devolution', importance: 'critical' },
    { original: 'timocracy', modern: 'clout-chaser government', context: 'Honor-based rule', importance: 'major' },
    { original: 'oligarchy', modern: 'billionaire boys club rule', context: 'Wealth-based rule', importance: 'major' },
    { original: 'democracy', modern: 'everyone votes, chaos ensues', context: 'Mob rule', importance: 'major' },
    { original: 'tyranny', modern: 'toxic dictator arc', context: 'Worst government', importance: 'critical' }
  ],
  9: [
    { original: 'tyrannical soul', modern: 'unhinged villain mindset', context: 'Psychological tyranny', importance: 'critical' },
    { original: 'three parts of soul', modern: 'reason vs feels vs hunger', context: 'Internal conflict', importance: 'major' },
    { original: 'happiness calculation', modern: 'who\'s actually winning at life', context: 'Justice vs injustice', importance: 'critical' },
    { original: 'philosopher\'s pleasures', modern: 'galaxy brain satisfaction hits different', context: 'Types of pleasure', importance: 'major' }
  ],
  10: [
    { original: 'poetry as imitation', modern: 'all art is basically fanfic of reality', context: 'Critique of art', importance: 'major' },
    { original: 'thrice removed from truth', modern: 'three degrees of separation from facts', context: 'Imitation theory', importance: 'major' },
    { original: 'immortality of soul', modern: 'consciousness doesn\'t just delete itself', context: 'Afterlife argument', importance: 'critical' },
    { original: 'Myth of Er', modern: 'respawn mechanics of the universe', context: 'Cosmic justice', importance: 'critical' }
  ]
};

async function generateTranslationMemory() {
  console.log('🧠 Generating Translation Memory Files\n');
  console.log('Creating consistency resources for each chapter...\n');
  
  // Load chapter mapping
  const chapterMappingPath = join(process.cwd(), 'content/translations/books/platos-republic/chapters/chapter-mapping.json');
  const chapterMapping = JSON.parse(readFileSync(chapterMappingPath, 'utf-8'));
  
  // Create memory directory
  const memoryDir = join(process.cwd(), 'content/translations/books/platos-republic/translation-memory');
  mkdirSync(memoryDir, { recursive: true });
  
  // Generate master glossary
  const masterGlossary = {
    version: '1.0.0',
    created: new Date().toISOString(),
    description: 'Master translation memory for Plato\'s Republic Gen Z translation',
    coreTerms: CORE_TERMS,
    characterVoices: CHARACTER_VOICES,
    slangBank: SLANG_BANK,
    totalChapters: 35,
    philosophicalConcepts: Object.values(BOOK_CONCEPTS).flat(),
    translationGuidelines: {
      slangDensity: '10-15% of total words',
      philosophicalAccuracy: 'Maintain 95% concept integrity',
      characterConsistency: 'Each speaker must maintain unique voice',
      modernReferences: 'Use internet culture, gaming, social media analogies',
      readability: 'Target Gen Z/Millennial audience (ages 16-35)'
    }
  };
  
  const masterPath = join(memoryDir, 'master-glossary.json');
  writeFileSync(masterPath, JSON.stringify(masterGlossary, null, 2));
  console.log('📚 Created master glossary');
  
  // Generate memory for each chapter
  let totalMemoryFiles = 0;
  for (const book of chapterMapping.books) {
    console.log(`\n📖 Book ${book.book}:`);
    
    for (const chapter of book.chapterDetails) {
      const chapterKey = `book-${String(book.book).padStart(2, '0')}-chapter-${chapter.chapter}`;
      
      // Determine which characters appear in this chapter
      const activeCharacters = getActiveCharacters(book.book, chapter.chapter);
      
      // Get relevant philosophical concepts
      const relevantConcepts = BOOK_CONCEPTS[book.book] || [];
      
      // Create chapter-specific memory
      const chapterMemory: TranslationMemory = {
        chapter: chapterKey,
        book: book.book,
        chapterNumber: chapter.chapter,
        keyTerms: {
          ...CORE_TERMS,
          // Add chapter-specific terms based on content
          ...getChapterSpecificTerms(book.book, chapter.chapter)
        },
        characterVoices: activeCharacters,
        philosophicalConcepts: relevantConcepts.filter(c => 
          isConceptRelevant(c, book.book, chapter.chapter)
        ),
        contextNotes: getChapterContextNotes(book.book, chapter.chapter, chapter.title),
        slangBank: SLANG_BANK
      };
      
      const chapterPath = join(memoryDir, `${chapterKey}.json`);
      writeFileSync(chapterPath, JSON.stringify(chapterMemory, null, 2));
      totalMemoryFiles++;
      
      console.log(`  ✅ ${chapterKey}: ${activeCharacters.length} characters, ${relevantConcepts.length} concepts`);
    }
  }
  
  // Generate quick reference CSV
  const csvPath = join(memoryDir, 'quick-reference.csv');
  const csvContent = [
    'Original Term,Modern Translation,Context,Importance',
    ...Object.entries(CORE_TERMS).map(([orig, modern]) => 
      `"${orig}","${modern}","Core philosophical term","High"`
    ),
    ...Object.values(BOOK_CONCEPTS).flat().map(concept =>
      `"${concept.original}","${concept.modern}","${concept.context}","${concept.importance}"`
    )
  ].join('\n');
  
  writeFileSync(csvPath, csvContent);
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ TRANSLATION MEMORY GENERATION COMPLETE\n');
  console.log(`📁 Generated ${totalMemoryFiles} chapter memory files`);
  console.log(`📚 Master glossary: ${masterPath}`);
  console.log(`📊 Quick reference: ${csvPath}`);
  console.log('\n🎯 Memory Features:');
  console.log(`  - ${Object.keys(CORE_TERMS).length} core terms mapped`);
  console.log(`  - ${Object.keys(CHARACTER_VOICES).length} character voice profiles`);
  console.log(`  - ${SLANG_BANK.length} Gen Z slang terms available`);
  console.log(`  - ${Object.values(BOOK_CONCEPTS).flat().length} philosophical concepts tracked`);
  console.log('\n💡 Usage: Load chapter memory before translating to ensure consistency');
}

// Helper functions
function getActiveCharacters(book: number, chapter: number): Record<string, CharacterVoice> {
  const active: Record<string, CharacterVoice> = {
    'Socrates': CHARACTER_VOICES['Socrates'] // Always present
  };
  
  // Book 1 characters
  if (book === 1) {
    if (chapter === 1) {
      active['Cephalus'] = CHARACTER_VOICES['Cephalus'];
    } else if (chapter === 2) {
      active['Polemarchus'] = CHARACTER_VOICES['Polemarchus'];
    } else if (chapter === 3) {
      active['Thrasymachus'] = CHARACTER_VOICES['Thrasymachus'];
    }
  }
  
  // Books 2+ main interlocutors
  if (book >= 2) {
    active['Glaucon'] = CHARACTER_VOICES['Glaucon'];
    active['Adeimantus'] = CHARACTER_VOICES['Adeimantus'];
    
    // Thrasymachus occasionally interjects
    if (book === 2 && chapter === 1) {
      active['Thrasymachus'] = CHARACTER_VOICES['Thrasymachus'];
    }
  }
  
  return active;
}

function getChapterSpecificTerms(book: number, chapter: number): Record<string, string> {
  const terms: Record<string, string> = {};
  
  // Add book/chapter specific terminology
  if (book === 1 && chapter === 1) {
    terms['old age'] = 'boomer era';
    terms['wealth'] = 'generational bags';
    terms['death'] = 'final logout';
  } else if (book === 2 && chapter === 1) {
    terms['invisible'] = 'stealth mode activated';
    terms['reputation'] = 'public image/brand';
  } else if (book === 7 && chapter === 1) {
    terms['shadows'] = 'fake news projections';
    terms['prisoners'] = 'NPCs stuck in the simulation';
    terms['chains'] = 'mental prison bars';
  }
  
  return terms;
}

function isConceptRelevant(concept: PhilosophicalConcept, book: number, chapter: number): boolean {
  // Determine if a concept is relevant to specific chapter
  // For now, include all book concepts in all chapters of that book
  return true;
}

function getChapterContextNotes(book: number, chapter: number, title: string): string[] {
  const notes: string[] = [];
  
  notes.push(`Chapter focus: ${title}`);
  
  // Add specific contextual notes
  if (book === 1 && chapter === 3) {
    notes.push('Thrasymachus should be extra aggressive and cynical here');
    notes.push('Socrates uses ironic praise to disarm Thrasymachus');
  } else if (book === 7 && chapter === 1) {
    notes.push('Cave Allegory - most famous passage, needs perfect execution');
    notes.push('Balance accessibility with philosophical depth');
    notes.push('Use modern tech/social media parallels for shadows');
  } else if (book === 10 && chapter === 3) {
    notes.push('Myth of Er - cosmic/mythological tone shift');
    notes.push('Can use video game respawn mechanics as parallel');
  }
  
  return notes;
}

// Run the generator
generateTranslationMemory().catch(console.error);