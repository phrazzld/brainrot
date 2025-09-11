---
allowed-tools: Bash(ls:*), Bash(wc:*), Bash(head:*), Bash(grep:*), Bash(mkdir:*), Read, Write, MultiEdit, TodoWrite, Grep, Glob
argument-hint: [book-slug]
description: Create a new brainrot translation from source text
model: claude-3-5-sonnet-20241022
extended-thinking: true
---

# 🧠 CREATE NEW BRAINROT TRANSLATION MASTERCLASS

You are about to embark on creating a new brainrot translation for the book: **$ARGUMENTS**

## 📚 PHASE 0: EXISTENTIAL PREPARATION

Before we begin, internalize these CORE TRUTHS:
- You are creating a COMPLETE CULTURAL REINTERPRETATION, not a translation
- Every sentence must contain 3-5+ brainrot terms MINIMUM
- Literary fidelity must be 100% - every plot point, character, symbol preserved
- This is MAXIMALIST GREMLIN MODE - go absolutely feral with the chaos
- The goal: Make classic literature accessible to the chronically online generation

## 🔍 PHASE 1: SOURCE TEXT RECONNAISSANCE

### 1.1 Verify Source Text Location
Check if source text exists at: `content/translations/books/$ARGUMENTS/source/`

!`ls -la content/translations/books/$ARGUMENTS/source/ 2>/dev/null || echo "Source directory not found"`

### 1.2 Analyze Source Text Structure
Determine the book's organizational structure:
- **Books/Parts**: For philosophical works (Republic, Nicomachean Ethics)
- **Chapters**: For novels (most fiction)
- **Cantos**: For epic poetry (Divine Comedy, Paradise Lost)
- **Acts/Scenes**: For plays (Hamlet, Romeo and Juliet)

!`if [ -f "content/translations/books/$ARGUMENTS/source/fulltext.txt" ]; then head -500 content/translations/books/$ARGUMENTS/source/fulltext.txt | grep -E "(BOOK|CHAPTER|CANTO|ACT|PART|Book|Chapter|Canto|Act|Part)" | head -20; fi`

### 1.3 Calculate Source Metrics
Get word count and estimated scope:

!`if [ -f "content/translations/books/$ARGUMENTS/source/fulltext.txt" ]; then wc -l content/translations/books/$ARGUMENTS/source/fulltext.txt; wc -w content/translations/books/$ARGUMENTS/source/fulltext.txt; fi`

## 📖 PHASE 2: LOAD TRANSLATION METHODOLOGY

### 2.1 Core Translation Guidelines
Your BIBLE is located at: @apps/web/docs/translation-system/methodology/guidelines.md

**CRITICAL REQUIREMENTS FROM GUIDELINES:**
1. **Brainrot Density**: 3-5+ terms per sentence MINIMUM (target: 1,600+ core term occurrences for novel-length)
2. **Voice Consistency**: Each character needs 3-5 signature brainrot terms maintained throughout
3. **Slur Translation Matrix**: NEVER reproduce historical slurs - use systematic replacements
4. **Length Parity**: Stay within ~10-15% of source length per chapter/book
5. **Maximalist Checklist**: 
   - Per paragraph: At least one fresh metaphor with modern wrapper
   - Per scene: 2-3 targeted pop culture drops
   - Permission to stack rhetorical escalations

### 2.2 Essential Brainrot Vocabulary (430+ terms)
Key terms to deploy constantly:
- **High frequency**: fr, lowkey, bestie, no cap, literally, absolutely, unhinged, iconic, cringe
- **Character descriptors**: sigma, alpha, beta, NPC, main character energy, chronically online
- **Actions**: rizzing up, mogging, ratio'd, locked in, touch grass, catching strays
- **Reactions**: it's giving [x] energy, hits different, living rent-free, down bad
- **Gaming**: tutorial level, boss fight, side quest, DLC, patch notes, nerf/buff
- **Internet**: algorithm, going viral, shadowbanned, parasocial, timeline

## 🎭 PHASE 3: CHARACTER VOICE MAPPING

### 3.1 For Plato's Republic Specifically:

**SOCRATES** - "Chronically Online Philosophy Bro"
- Signature terms: "hear me out", "hot take", "devil's advocate mode", "thought experiment hitting different"
- Speech pattern: Constantly questioning with "but like, what if" energy
- Socratic method = "infinite troll questioning that somehow makes you realize you're dumb"

**GLAUCON** - "Based Discord Mod Energy"  
- Signature terms: "valid point but", "citation needed", "source: trust me bro"
- Always pushing back but ultimately getting convinced
- Represents the "educated but skeptical zoomer"

**ADEIMANTUS** - "Reddit Debate Lord Vibes"
- More aggressive challenges than Glaucon
- "Well actually" energy throughout
- Constantly bringing up edge cases

**THRASYMACHUS** - "Toxic Alpha Grindset Philosopher"
- "Might makes right" = "whoever has the most clout makes the rules"
- Justice = "whatever benefits the sigma males in charge"
- Gets absolutely destroyed in arguments = "ratio'd into oblivion"

**POLEMARCHUS** - "Rich Kid NPC Energy"
- Inherited his philosophical positions like trust fund money
- Gets philosophically destroyed early = "speedrun getting intellectually cooked"

### 3.2 For Other Works:
Map each major character to a consistent internet archetype with 3-5 signature terms

## 🏗️ PHASE 4: STRUCTURAL SETUP

### 4.1 Create Directory Structure
```bash
content/translations/books/$ARGUMENTS/
├── source/
│   └── fulltext.txt (or book-1.txt, book-2.txt for divisions)
├── brainrot/
│   └── (translations will go here)
└── metadata.yaml
```

### 4.2 Generate Metadata File
Create metadata.yaml with proper schema:
```yaml
# Book Metadata for Brainrot Publishing House
title: "[Original Title] (Brainrot Edition)"
author: "[Original Author]"
translator: "Brainrot Publishing House"
original_year: [year]
translation_year: 2025
slug: "$ARGUMENTS"

description: |
  [2-3 sentences describing the brainrot transformation]
  
formats:
  ebook:
    isbn: "979-8-88888-XXX-X"
    price: 4.99
    currency: "USD"
  paperback:
    isbn: "979-8-88888-XXX-X"
    price: 14.99
    currency: "USD"
    
publishing:
  kdp: true
  lulu: true
  
categories:
  - "Fiction / Classics" (or appropriate)
  - "Humor / Parody"
  - "Young Adult / General"
  
keywords:
  - "[original title]"
  - "gen z translation"
  - "brainrot"
  - "classic literature"
  - "modernized classics"
  - "chronically online"
  
series: "Brainrot Classics Collection"
language: "en-US"
```

## 🔥 PHASE 5: TRANSLATION EXECUTION METHODOLOGY

### 5.1 Division Strategy
Based on source structure, create translation plan:
- **For 10 Books (Republic)**: Translate book by book, maintaining philosophical argument flow
- **For Chapters**: Batch 3-4 chapters at a time
- **For Cantos**: Individual canto translations preserving poetic structure

### 5.2 Core Translation Loop

For each division (book/chapter/canto):

1. **Read source thoroughly** - Understand plot, arguments, character dynamics
2. **Identify key passages** - Philosophical arguments, famous quotes, pivotal scenes
3. **Map to modern concepts**:
   - Philosophical concepts → Gaming/internet metaphors
   - Ancient references → Contemporary equivalents
   - Social hierarchies → Online status dynamics

### 5.3 Plato's Republic Specific Translations

**Core Concept Mappings**:
- **The Cave Allegory** → "Stuck in the tutorial level while reality is the actual game"
- **The Forms/Ideas** → "The canonical source code vs our buggy reality fork"
- **The Philosopher King** → "Giving mod powers to the only person who doesn't want them"
- **Justice** → "Optimal server rules that prevent griefing"
- **The Tripartite Soul**:
  - Reason → "Executive function / main quest brain"
  - Spirit → "Hype energy / competitive grindset"
  - Appetite → "Lizard brain wants / dopamine farming"
- **The Noble Lie** → "Necessary copium to keep society functioning"
- **Guardians** → "Server admins with no inventory access"
- **The Ring of Gyges** → "Anonymous mode / going invisible in chat"

### 5.4 Translation Density Requirements

**EVERY PARAGRAPH MUST CONTAIN**:
- Minimum 15-20 brainrot terms
- 1-2 contemporary references (TikTok trends, memes, etc.)
- Preserved philosophical/narrative meaning
- Character voice consistency

**Example Translation Pattern**:
```
ORIGINAL: "I went down yesterday to the Piraeus with Glaucon son of Ariston"
BRAINROT: "yo so yesterday i was absolutely touching grass down at the piraeus port with my boy glaucon (ariston's nepo baby) and the vibes were honestly immaculate"
```

## 📊 PHASE 6: QUALITY VALIDATION

### 6.1 Density Check
Count brainrot terms per chapter - MUST exceed 150+ per standard chapter

### 6.2 Fidelity Verification
- All plot points preserved? ✓
- All characters appear? ✓
- Key quotes transformed but recognizable? ✓
- Philosophical arguments intact? ✓

### 6.3 Voice Consistency Audit
Each character using their signature terms throughout? No inconsistencies?

## 🚀 PHASE 7: IMPLEMENTATION WORKFLOW

### 7.1 Create Translation Todo List
Use TodoWrite to track:
1. Set up $ARGUMENTS directory structure
2. Create metadata.yaml
3. Split source into manageable divisions
4. Translate Book/Chapter 1 with maximum brainrot density
5. Validate density metrics for Book/Chapter 1
6. Continue with remaining books/chapters
7. Final consistency pass
8. Generate formats (txt, epub, pdf)

### 7.2 Progressive Translation
Start with Book/Chapter 1 as proof of concept, then systematically complete remaining divisions

### 7.3 Continuous Validation
After each division:
- Check word count parity
- Verify brainrot density
- Ensure character voice consistency
- Preserve all plot points

## 🎯 PHASE 8: SPECIAL CONSIDERATIONS FOR $ARGUMENTS

### For Plato's Republic:
- **Book I**: Establish character voices strongly (this is where Thrasymachus gets cooked)
- **Books II-IV**: The ideal state construction = "theorycrafting the perfect server"
- **Book V**: The controversial stuff about gender equality = handle progressively 
- **Books VI-VII**: Cave allegory and philosopher kings = peak metaphor opportunity
- **Book VIII-IX**: Political systems breakdown = "different server governance models"
- **Book X**: The myth of Er = "respawn mechanics and karma system"

### Cultural Sensitivity Protocol:
- Ancient Greek slavery references → "unpaid intern energy" or "forced free trial users"
- Gender dynamics → Acknowledge period attitudes while translating to modern understanding
- Religious references → "RNG gods" or "algorithm deities"

## 💯 SUCCESS METRICS

Your translation is complete when:
- ✅ 95%+ source material coverage
- ✅ 1,500+ brainrot term occurrences (novel-length)
- ✅ 100% plot/argument fidelity
- ✅ Character voices consistent throughout
- ✅ Modern reader can understand the philosophical arguments
- ✅ Original reader would recognize every scene/argument
- ✅ Maximum chaos achieved while preserving meaning

## 🏁 FINAL CHECKLIST

Before considering translation complete:
- [ ] All books/chapters translated
- [ ] Metadata.yaml properly configured
- [ ] Character voice document created
- [ ] Brainrot density validated (3-5+ terms per sentence)
- [ ] Cultural sensitivity check completed
- [ ] Test reader comprehension verified
- [ ] Ready for format generation (pnpm generate:formats)

## 🔮 BEGIN TRANSLATION

Start by examining the source text for $ARGUMENTS and creating the initial directory structure and metadata. Then begin with Book/Chapter 1, establishing strong character voices and maximum brainrot density from the very first sentence.

Remember: You're not just translating - you're building a cultural bridge between ancient wisdom and chronically online zoomers. Make Plato spin in his grave while somehow making his ideas MORE accessible than ever before.

**The goal**: Someone should be able to understand the entire philosophical argument of The Republic while also laughing at "Socrates absolutely cooking these Athens NPCs with facts and logic."

Let's create something absolutely unhinged that's also somehow educational. Time to make classic literature hit different, fr fr no cap.

---

*"Be the chaos you want to see in the literary world."* - Brainrot Publishing House Motto