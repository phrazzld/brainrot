# TODO: Bible Translation (Brainrot Edition)

> **Project Scope**: Translate complete KJV Bible (66 books, ~700k words) following TRANSLATION_GUIDELINES.md methodology
> **Source**: `content/translations/books/the-bible/source-kjv.txt` (4.5MB, 100k lines)
> **Target**: All lowercase, 3-5+ brainrot terms/sentence, character voice consistency
> **Timeline**: ~14 months (2 days tooling + 1 week pilot + 58 weeks main translation + 2 weeks integration)

---

## Phase 1: Infrastructure & Tooling (Est. 2 days)

### Source Material Processing

- [x] Write `scripts/parse-bible-kjv.ts` to extract 66 individual books from monolithic source file - Script should identify book boundaries using regex patterns matching "The.*Book of", "The Gospel", "The.*Epistle", etc. Extract line ranges for each book. Success: 66 separate raw text outputs in `content/translations/books/the-bible/source/[book-slug]/raw.txt`
  ```
  Implementation Approach:
  - Model after scripts/parse-republic-chapters.ts (proven line-based parsing pattern)
  - Use synchronous fs operations (readFileSync/writeFileSync/mkdirSync) - appropriate for one-time setup script
  - Read source-kjv.txt (99,968 lines) as string, split on '\n', handle CRLF endings
  - Skip Project Gutenberg header (lines 1-98) and footer (lines 99618+)
  - Use state machine: scan for book title lines, track current book, extract line ranges
  - CRITICAL: Skip alternative book titles (lines 23709, 26699, 29152, 32048) - use "Otherwise Called:" marker detection
  - Build book registry: Map<slug, {title, startLine, endLine, testament}>
  - For each book: extract lines, clean CRLF, write to content/translations/books/the-bible/source/{slug}/raw.txt
  - Generate books-index.json with all 66 book metadata for downstream scripts
  - Files to reference: scripts/parse-republic-chapters.ts:1-150 (line-based parsing), scripts/generate-formats.ts:1-50 (directory ops)

  Modularity Analysis:
  - Component 1: Book boundary detector (pure function: string[] → BookBoundary[])
    - Input: Array of lines from source file
    - Output: Array of {slug, title, startLine, endLine, testament}
    - Testable independently with sample lines
  - Component 2: Slug normalizer (pure function: string → string)
    - Input: Book title like "The First Book of Moses: Called Genesis"
    - Output: URL-safe slug "genesis"
    - Testable with 66 known title→slug mappings
  - Component 3: Alternative title filter (stateful: detects "Otherwise Called:" patterns)
    - Input: Lines with context (previous line lookbehind)
    - Output: Boolean shouldSkip flag
    - Testable with known edge case lines (23709, 26699, 29152, 32048)
  - Component 4: File writer (I/O: BookBoundary[] → void)
    - Input: Book boundaries + source lines
    - Output: 66 files written to disk
    - Integration test with temp directory
  - Interfaces: BookBoundary { slug, title, startLine, endLine, testament, bookNumber }
  - Can parallelize: Book detection + slug normalization are pure functions (no shared state)
  - Integration: Final component chains all outputs sequentially

  Test Strategy:
  - Unit test: Slug normalization with all 66 known mappings (ensure "The Gospel According to Saint Matthew" → "matthew")
  - Unit test: Alternative title detection (mock lines 23708-23710 to verify skip logic)
  - Unit test: Book boundary regex against known patterns (10 distinct header formats)
  - Unit test: Verse marker detection (/^\d+:\d+ /) with edge cases (multi-verse lines, multi-line verses)
  - Integration test: Run on first 5,000 lines (Genesis + Exodus), verify 2 books extracted correctly
  - Integration test: Run on full file, verify exactly 66 books with correct line ranges
  - Edge case test: Verify Psalms (longest: 7,303 lines) extracts completely
  - Edge case test: Verify 2 John (shortest: 46 lines) extracts correctly
  - Edge case test: Verify alternative titles skipped (only 62 output files, not 66+4)
  - Validation test: Cross-check extracted line counts vs known book lengths
  - Test data: Create fixtures/kjv-sample.txt with first 500 lines for fast unit testing
  - Coverage target: 100% for pure functions (boundary detection, slug normalization), 80% overall

  Automation Opportunities:
  - Generate TypeScript interfaces from book registry (BookBoundary type → 66 book-specific types)
  - Auto-generate slug constants: export const GENESIS = 'genesis'; (66 constants for type safety)
  - Create book metadata template generator (reuse output for metadata.yaml scaffolding in next task)
  - Build validation script to verify extracted books against known chapter counts (Genesis should have 50 chapters, etc.)

  Success Criteria:
  - Exactly 66 individual book files created in content/translations/books/the-bible/source/{slug}/raw.txt
  - Each file starts with correct book title, no Project Gutenberg headers
  - Genesis file is 4,770 lines (verified from line range 99-4869)
  - 2 John file is 46 lines (verified from line range 98011-98056)
  - Psalms file is 7,303 lines (verified from line range 45995-53298)
  - No duplicate books (alternative titles properly skipped)
  - books-index.json contains accurate metadata: {slug, title, startLine, endLine, testament, bookNumber} for all 66
  - All slugs match existing naming convention (lowercase, hyphenated, e.g. "1-corinthians")
  - Testament field correctly set: 39 OT books, 27 NT books
  - Book numbers sequential 1-66 in canonical order (Genesis=1, Revelation=66)
  - Line endings normalized to LF (\n) from source CRLF (\r\n)
  - UTF-8 encoding preserved (handles BOM from source)

  Constraints & Risks:
  - CRITICAL GOTCHA: Alternative book titles at lines 23709, 26699, 29152, 32048 MUST be skipped or we get 70 books instead of 66
  - Source file uses CRLF (\r\n) line endings - must handle Windows format consistently
  - UTF-8 BOM at file start - must strip or handle gracefully
  - Multi-line verses (verse text continues on next line without marker) - preserve in extraction but flag for chapter parsing
  - Multi-verse lines (5:6 text... 5:7 more text...) - preserve as-is, will be split in chapter parsing task
  - Hardcoded line numbers are fragile - if source file changes, script breaks (acceptable for one-time migration)
  - Memory usage: 4.5MB file read into memory is acceptable for script (not a production service)
  - Slug collision risk: Verify no duplicate slugs across 66 books (Ruth vs Titus vs Jude all different)
  - Existing directory collision: Check if content/translations/books/the-bible/source/ already exists (overwrite or error?)

  Dependencies:
  - Requires: content/translations/books/the-bible/source-kjv.txt exists (already present)
  - Requires: Node.js fs, path modules (built-in, no install needed)
  - Requires: TypeScript compiler or tsx runtime (already in devDependencies)
  - Blocks: All downstream tasks (chapter splitting, translation, metadata generation)
  - Blocks: scripts/generate-bible-structure.ts (needs book slugs from this output)

  Estimated Complexity: MEDIUM
  - Simple line-based parsing but 10 distinct regex patterns
  - Edge case handling (alternative titles) adds complexity
  - Well-defined input/output, proven patterns from parse-republic-chapters.ts
  - Main complexity: Ensuring all 66 books detected with zero false positives/negatives

  Estimated Time: 2 hours
  - 30min: Script structure + slug normalization (steal from parse-republic-chapters.ts)
  - 45min: Book boundary detection with 10 regex patterns + alternative title filtering
  - 30min: File I/O + books-index.json generation
  - 15min: Testing with full file + edge case validation
  ```

- [x] Implement chapter splitting logic in parse-bible-kjv.ts - Parse verse markers (N:1 patterns) to identify chapter boundaries. Write each chapter to separate file `chapter-NN.txt`. Success: Genesis yields 50 chapter files, Exodus yields 40, etc.
  ```
  Implementation Approach:
  - Extend existing parse-bible-kjv.ts script with chapter splitting function
  - Use verse marker pattern /^(\d+):1\s/ to detect chapter boundaries
  - Extract verses for each chapter by tracking current chapter number
  - Handle multi-line verses (verse text continues on next line without marker)
  - Write to {book-slug}/chapters/chapter-{NN}.txt (zero-padded for sorting)
  - Generate chapter-index.json with metadata: {bookSlug, totalChapters, chapters[{chapterNumber, verseCount, wordCount}]}
  - Pattern from parse-republic-chapters.ts: line-based extraction, metadata generation, validation
  - Files to modify: scripts/parse-bible-kjv.ts (add splitChapters function after extractBooks)

  Modularity Analysis:
  - Component 1: Chapter boundary detector (pure function: string[] → Map<number, number[]>)
    - Input: Array of verse lines from single book
    - Output: Map of chapter number to verse line indices
    - Testable with Genesis sample (50 chapters)
  - Component 2: Verse aggregator (pure function: string[] × Map<number, number[]> → Chapter[])
    - Input: Verse lines + chapter boundaries map
    - Output: Array of Chapter objects with text content
    - Handles multi-line verses (lines without verse marker belong to previous verse)
  - Component 3: Chapter file writer (I/O: Chapter[] × bookSlug → void)
    - Input: Chapters + book slug
    - Output: Files written to {slug}/chapters/chapter-{NN}.txt
    - Creates directory if needed
  - Component 4: Chapter metadata generator (pure function: Chapter[] → ChapterIndex)
    - Input: Processed chapters
    - Output: JSON with validation metadata
    - Integration test: verify total chapters = 1,189 across all 66 books
  - Interfaces: Chapter { chapterNumber, verses: Verse[], wordCount }, Verse { verseNumber, text }
  - Can parallelize: After book extraction, each book's chapter splitting is independent
  - Integration: Runs after extractBooks() in main() function

  Test Strategy:
  - Unit test: Chapter boundary detection on Genesis raw.txt (should find exactly 50 chapters)
  - Unit test: Single-chapter books (Obadiah, Philemon, 2 John, 3 John, Jude) yield 1 chapter each
  - Unit test: Psalms yields exactly 150 chapters (longest book)
  - Unit test: Multi-line verse handling (verse 1:2 continues on next line without "1:3" marker)
  - Integration test: Run on all 66 books, verify total = 1,189 chapters (929 OT + 260 NT)
  - Validation test: Compare chapter counts against canonical KJV structure (Genesis=50, Exodus=40, etc.)
  - Edge case test: Handle books with <10 chapters (zero-padding: chapter-01.txt not chapter-1.txt)
  - Edge case test: Handle chapter 150 in Psalms (3-digit padding: chapter-150.txt)
  - Performance test: Process all 66 books in <30 seconds
  - Test data: Use Genesis (50 chapters), 2 John (1 chapter), Psalms (150 chapters) as fixtures
  - Coverage target: 95% for chapter detection logic (critical for accuracy)

  Automation Opportunities:
  - Generate ChapterIndex TypeScript interface from validation data
  - Auto-generate expected chapter counts constant: EXPECTED_CHAPTERS = {genesis: 50, exodus: 40, ...}
  - Create validation script that compares actual vs expected chapter counts (warns on mismatch)
  - Build chapter content validator (checks verse numbers are sequential within chapter)

  Success Criteria:
  - Exactly 1,189 chapter files created across all 66 books
  - Genesis yields exactly 50 files: chapter-01.txt through chapter-50.txt
  - Exodus yields exactly 40 files: chapter-01.txt through chapter-40.txt
  - Psalms yields exactly 150 files: chapter-001.txt through chapter-150.txt (3-digit padding)
  - Single-chapter books (5 total: Obadiah, Philemon, 2 John, 3 John, Jude) yield chapter-01.txt only
  - Each chapter file starts with verse marker (1:1, 2:1, etc.) and ends with last verse of chapter
  - All verse numbers sequential within each chapter (no gaps, no duplicates)
  - chapter-index.json generated for each book with accurate verse counts
  - Total OT chapters = 929, total NT chapters = 260
  - All file paths follow pattern: content/translations/books/the-bible/{slug}/chapters/chapter-{NN}.txt
  - Zero-padding consistent: 2 digits for <100 chapters, 3 digits for Psalms (150 chapters)
  - Line endings normalized to LF (not CRLF)
  - UTF-8 encoding preserved

  Constraints & Risks:
  - Multi-line verses MUST be handled correctly (KJV format has text continuing on next line)
  - Verse markers are NOT always on separate lines (e.g., "1:1 Text here 1:2 More text")
  - Some verses span multiple lines without markers (belong to previous verse number)
  - Psalms requires 3-digit padding (chapter-001.txt to chapter-150.txt) while other books use 2-digit
  - Single-chapter books still need chapter-01.txt (not chapter-1.txt) for consistency
  - Chapter numbering starts at 1 (not 0) - verify no off-by-one errors
  - Empty chapters should not exist (all chapters have at least verse 1)
  - Some books have chapter 0 in other translations (KJV does not - all start at chapter 1)
  - Performance: Processing 1,189 chapters should be fast (all in-memory operations)
  - Memory: Largest book is Psalms (7,296 lines) - acceptable to load per-book in memory

  Dependencies:
  - Requires: scripts/parse-bible-kjv.ts already extracts 66 books to {slug}/source/raw.txt ✓
  - Requires: books-index.json exists with all 66 book slugs ✓
  - Requires: Node.js fs, path modules (built-in) ✓
  - Blocks: Translation tasks (need chapter files as translation units)
  - Blocks: Metadata generation tasks (need chapter counts)

  Estimated Complexity: MEDIUM
  - Verse parsing has edge cases (multi-line verses, multiple verses per line)
  - Need to handle variable chapter counts (1 to 150)
  - Directory creation and file I/O straightforward
  - Validation against 1,189 expected chapters required
  - Similar complexity to book extraction but with more edge cases

  Estimated Time: 2 hours
  - 30min: Chapter boundary detection logic + multi-line verse handling
  - 45min: Chapter file writing with correct padding logic (2-digit vs 3-digit)
  - 30min: Chapter metadata generation + validation
  - 15min: Testing with Genesis/Psalms/single-chapter books + full 66-book run
  ```

- [x] Add book slug normalization function - Convert "The First Book of Moses: Called Genesis" → "genesis", "The Gospel According to Saint Matthew" → "matthew", etc. Handle special cases (1-2 Samuel, 1-2 Kings, etc.). Success: All 66 books have URL-safe slugs matching existing naming convention.

- [x] Create book metadata extraction - Parse Project Gutenberg headers, count chapters/verses per book, estimate word counts. Output as structured JSON for metadata.yaml generation. Success: Accurate chapter counts for all 66 books.

### Directory Structure Generation

- [x] Write `scripts/generate-bible-structure.ts` to scaffold all 66 book directories - For each book slug, create `source/`, `brainrot/`, `chapters/`, `translation-memory/` subdirectories. Success: 66 x 4 = 264 directories created under `content/translations/books/the-bible/`.

- [x] Implement metadata.yaml template generator - Create function accepting book name, testament (OT/NT), chapter count, estimated words. Generate YAML with title, description, format specs, ISBN placeholders. Success: Each of 66 books has valid metadata.yaml following the-republic pattern.

- [x] Add translation-memory/character-tracking.json scaffolding - Create empty JSON structure with arrays for character mentions, signature terms usage, voice consistency notes. Success: Template ready for tracking per-book character voice usage.

### Documentation & Voice Mapping

- [x] Write `content/translations/books/the-bible/BIBLICAL_VOICES.md` with character voice mappings - Define tone, signature terms (3-5 each), and speech patterns for: God/Yahweh, Jesus, Prophets (Isaiah/Jeremiah/Ezekiel), Apostles (Paul/Peter/John), Pharisees/Religious Leaders, Disciples, Satan/Adversary. Success: Minimum 10 major characters mapped with concrete brainrot term assignments.

- [x] Create `content/translations/books/the-bible/THEOLOGY_TERMS.md` glossary - Map 50+ theological terms to brainrot equivalents following TRANSLATION_GUIDELINES.md density requirements. Include: covenant, righteousness, sin, salvation, faith, grace, redemption, prophecy, sacrifice, resurrection, atonement, sanctification, justification, etc. Success: Comprehensive glossary covering all major theological concepts across OT/NT.

- [x] Add genre-specific translation patterns to BIBLICAL_VOICES.md - Document approaches for: Narrative (Genesis/Exodus), Law (Leviticus/Deuteronomy), Poetry (Psalms/Proverbs), Prophecy (Isaiah/Jeremiah), Gospels (Matthew/Mark/Luke/John), Epistles (Romans/Corinthians), Apocalyptic (Daniel/Revelation). Success: Clear guidance for maintaining voice across diverse literary styles.

### Translation Approach (Keep It Simple)

**Infrastructure complete. Now just translate:**

1. Pick a book/chapter from Phase 2 pilot translations below
2. Read the source chapter from `content/translations/books/the-bible/{book}/chapters/chapter-XX.txt`
3. Translate using BIBLICAL_VOICES.md, THEOLOGY_TERMS.md, and TRANSLATION_GUIDELINES.md
4. **CRITICAL: Verse-Level Fidelity**
   - **Atomic unit = the verse** (not chapter, not paragraph)
   - Each translated chapter MUST have exact same number of verses as source
   - Each verse MUST be numbered (e.g., `1:1`, `1:2`, etc.)
   - Each verse translation corresponds 1:1 with source verse
   - This enables cross-referencing (people cite "3 John 1:9" not "3 John chapter 1")
5. Check against guidelines:
   - 3-5+ brainrot terms per sentence
   - Character voices consistent with BIBLICAL_VOICES.md
   - Theological accuracy maintained
   - Verse-level correspondence maintained
   - Each verse preserves its source theological content
6. Save to `content/translations/books/the-bible/{book}/brainrot/chapter-XX.md`
7. Iterate until good
8. Track progress with: `pnpm tsx scripts/bible-translation-helper.ts {book} --mark {chapter} completed`

**No more tooling needed** - we have everything to start translating.

---

## Phase 2: Pilot Translation - Voice Establishment (Est. 1 week)

**Goal**: Translate 4 shortest NT books to validate methodology, establish baseline voice patterns, test tooling.

### 3 John (1 chapter, ~300 words)

- [x] Translate 3 John chapter 1 establishing John's voice as "The Elder Mentor" - Use signature terms: "fam", "keeping it 100", "real talk", "the actual tea". Maintain epistle's warm personal tone while hitting 3-5+ brainrot terms/sentence. **CRITICAL**: Maintain verse-level fidelity - 14 verses in source = 14 numbered verses in translation (1:1 through 1:14). Success: Voice feels authentic, verse structure preserved, theological accuracy on truth/hospitality themes maintained.

### 2 John (1 chapter, ~250 words)

- [~] Translate 2 John chapter 1 maintaining John's established voice from 3 John - Apply same "Elder Mentor" signature terms for consistency test. Preserve warning about deceivers while maintaining brainrot density. **CRITICAL**: Maintain verse-level fidelity - 13 verses in source = 13 numbered verses in translation (1:1 through 1:13). Success: Voice consistent with 3 John, verse structure preserved, deception/truth themes clear.

### Philemon (1 chapter, ~450 words)

- [ ] Translate Philemon chapter 1 establishing Paul's voice as "The Squad Leader" - Use signature terms: "bestie", "no cap", "fr fr", "absolutely". Maintain Paul's diplomatic tone regarding Onesimus while hitting density targets. Success: Paul's unique voice distinct from John's, ~450 words, slavery/reconciliation themes handled sensitively per TRANSLATION_GUIDELINES.md section 3.1.

### Jude (1 chapter, ~600 words)

- [ ] Translate Jude chapter 1 using intense prophetic warning voice - Apply "Unhinged Truthteller" archetype from BIBLICAL_VOICES.md: "y'all are cooked", "the tea is", "absolutely unhinged". Preserve apocalyptic imagery and theological warnings. Success: Most challenging pilot book completed, ~600 words, false teacher warnings preserved, Michael/Satan narrative intact.

### Pilot Phase Validation

- [ ] Run brainrot density validator across all 4 pilot books - Verify 3-5+ terms/sentence average. Generate density report showing term distribution. Adjust BIBLICAL_VOICES.md if patterns don't achieve target density naturally. Success: All 4 books meet density threshold, voice feels authentic not forced.

- [ ] Run length parity checker on pilot translations - Compare pilot book word counts vs KJV source. Validate ±15% target. Identify if certain book types consistently over/under target. Success: All 4 books within acceptable range, baseline established for future books.

- [ ] Validate character voice consistency across pilot books - Verify John's voice identical in 2 John vs 3 John. Confirm Paul's voice distinct from John's. Document successful patterns in BIBLICAL_VOICES.md. Success: Voice mapping methodology validated, ready to scale to 62 remaining books.

---

## Phase 3: Systematic Translation (Est. 58 weeks, ~1 book/week)

**Organization**: 62 remaining books grouped by type for workflow optimization. Each book is atomic task.

### Tier 1: Short Epistles (6 books, Est. 6 weeks)

- [ ] Translate James (5 chapters, ~2,300 words) - James voice: "The Practical Wisdom Teacher" using "real talk", "keeping it 100", "faith without works is giving performative energy". Cover faith/works balance, tongue control, rich/poor treatment themes. Success: 5 chapters in brainrot/, ~2,300 words total, practical wisdom tone preserved.

- [ ] Translate 1 Peter (5 chapters, ~2,500 words) - Peter voice: "The Suffering Encourager" using "fam", "stay based through the L's", "respawn arc coming". Maintain suffering/persecution encouragement themes. Success: 5 chapters maintaining Peter's distinct voice vs Paul/John/James.

- [ ] Translate 2 Peter (3 chapters, ~1,550 words) - Continue Peter's established voice from 1 Peter. Handle false teachers, end times, day of the Lord themes. Success: Voice consistent with 1 Peter, apocalyptic imagery translated effectively.

- [ ] Translate 1 John (5 chapters, ~2,500 words) - Apply established John voice from pilot books. Cover love/truth/light themes, antichrist warnings. Success: Voice perfectly consistent with 2 John and 3 John pilot translations.

- [ ] Translate Titus (3 chapters, ~900 words) - Apply Paul's "Squad Leader" voice from Philemon. Handle church leadership, sound doctrine, godly living instructions. Success: Paul's voice consistent, pastoral tone maintained.

- [ ] Run Tier 1 cross-book voice validation - Verify John's voice identical across 1 John, 2 John, 3 John. Verify Paul's voice consistent across Philemon, Titus. Peter voice distinct from both. Success: Character consistency across 10 books (4 pilot + 6 tier 1).

### Tier 2: Narrative Books (8 books, Est. 8 weeks)

- [ ] Translate Ruth (4 chapters, ~2,500 words) - Narrator voice: "Wholesome Romance Chronicler" with emphasis on loyalty/redemption themes. Character voices: Ruth (devoted), Naomi (bitter→hopeful), Boaz (rizz king energy). Success: Beautiful story preserved, kinsman-redeemer theology clear, all lowercase formatting maintained.

- [ ] Translate Jonah (4 chapters, ~1,300 words) - Narrator voice: "Reluctant Prophet Comedy" emphasizing Jonah's L's. Jonah voice: "The Runner" using "this is mid", "absolutely not", "god caught me in 4k". Success: Comedic tone enhanced, fish narrative preserved, Nineveh repentance clear.

- [ ] Translate Esther (10 chapters, ~5,600 words) - Narrator: "Palace Drama Reporter". Esther voice: "Hidden Identity Queen" signature terms TBD. Mordecai: "The Based Advisor". Haman: "Toxic Egomaniac". Success: Persian court intrigue translated, purim origin story clear, 10 chapters maintaining momentum.

- [ ] Translate Haggai (2 chapters, ~1,100 words) - Prophet voice: "Construction Project Manager Energy" emphasizing temple rebuilding. Signature terms: "priorities are cooked", "check the foundation", "glory incoming". Success: Temple rebuilding urgency preserved, messianic prophecy clear.

- [ ] Translate Obadiah (1 chapter, ~670 words) - Prophet voice: "Edom Roast Session" with judgment oracle intensity. Signature terms: "pride before the fall", "absolutely cooked", "karma hitting different". Success: Shortest OT book complete, Edom judgment clear, Jacob/Esau context preserved.

- [ ] Translate Nahum (3 chapters, ~1,200 words) - Prophet voice: "Nineveh Judgment Bringer" with apocalyptic warfare imagery. More intense than Obadiah. Success: Assyria fall prophecy clear, violent imagery handled per sensitivity guidelines, poetic structure maintained.

- [ ] Translate Habakkuk (3 chapters, ~1,500 words) - Prophet voice: "The Questioning Philosopher" dialogue with God about justice. Habakkuk: "why the wicked prosper fr fr?". God: "trust the process bestie". Success: Theodicy dialogue preserved, faith chapter 3 psalm maintained.

- [ ] Translate Zephaniah (3 chapters, ~1,600 words) - Prophet voice: "Day of the Lord Announcer" with judgment→restoration arc. Intense warnings followed by hope. Success: Apocalyptic tone preserved, zion restoration clear, judgment themes handled.

### Tier 3: Gospels (4 books, Est. 16 weeks - most critical for voice consistency)

- [ ] Translate Mark (16 chapters, ~11,300 words) - Shortest gospel, action-focused. Jesus voice: "The Based Teacher" from BIBLICAL_VOICES.md using "bestie", "real talk", "it's giving [x] energy". Narrator: "Chronically Online Reporter" emphasizing speed/urgency. Success: Jesus' voice baseline established for other gospels, miracles preserved, passion narrative theologically accurate.

- [ ] Translate John (21 chapters, ~15,600 words) - Philosophical gospel. Same Jesus voice as Mark but higher density of teaching dialogues. Narrator: John's "Elder Mentor" voice from epistles. "I am" statements preserved with brainrot wrapper. Success: Jesus voice consistent with Mark, John's unique theological emphasis clear, Logos theology preserved.

- [ ] Translate Matthew (28 chapters, ~18,300 words) - Teaching-heavy gospel. Jesus voice consistent with Mark/John. Heavy Pharisee interactions using "Cringe Rules Lawyers" voice. Sermon on the Mount = longest sustained Jesus teaching passage. Success: Jesus voice perfectly consistent across 3 gospels, Pharisee voice established for reuse, Jewish context preserved.

- [ ] Translate Luke (24 chapters, ~19,500 words) - Most detailed narrative. Jesus voice maintained from previous 3 gospels. Luke narrator: "The Investigative Journalist" with medical precision. Unique parables (Good Samaritan, Prodigal Son) require careful handling. Success: Jesus voice 100% consistent across all 4 gospels, unique Lukan material preserved, resurrection narrative theologically sound.

- [ ] Run Gospels cross-reference validation - Compare Jesus' voice across all 4 gospels for identical signature terms and speech patterns. Verify Sermon on the Mount (Matthew) voice matches Sermon on the Plain (Luke). Success: Perfect consistency proving voice mapping methodology works at scale.

### Tier 4: Major Epistles (10 books, Est. 18 weeks)

- [ ] Translate Galatians (6 chapters, ~2,900 words) - Paul's angry letter. Voice: "Squad Leader" but intense/defensive. Signature add: "absolutely unhinged" for opponents. Justification by faith theme central. Success: Paul's most heated tone preserved, faith vs works clear, opponents roasted appropriately.

- [ ] Translate Ephesians (6 chapters, ~3,000 words) - Paul's unity letter. Voice: "Squad Leader" but elevated/cosmic. Armor of God passage = key translation challenge. Success: Cosmic Christ theology preserved, armor metaphor translated with gaming/battle terminology, church unity emphasized.

- [ ] Translate Philippians (4 chapters, ~2,100 words) - Paul's joy letter from prison. Voice: "Squad Leader" with gratitude energy. "Rejoice always" = signature refrain. Christ hymn (2:5-11) = theological precision required. Success: Joy tone maintained despite prison context, Christ hymn theology intact.

- [ ] Translate Colossians (4 chapters, ~1,900 words) - Paul's Christ supremacy letter. Voice: "Squad Leader" with cosmic scope like Ephesians. Christ preeminence theme central. Success: Christology preserved, false teaching warnings clear, practical living instructions maintained.

- [ ] Translate 1 Thessalonians (5 chapters, ~1,800 words) - Paul's earliest letter. Voice: "Squad Leader" with end times anticipation. Rapture passage (4:13-18) = key theological section. Success: Eschatology clear, pastoral concern evident, sexual ethics preserved.

- [ ] Translate 2 Thessalonians (3 chapters, ~1,000 words) - Paul's clarification on end times. Voice: consistent with 1 Thessalonians. Man of lawlessness passage requires apocalyptic terminology. Success: Eschatology refined from 1 Thess, work ethic teaching clear.

- [ ] Translate 1 Timothy (6 chapters, ~2,500 words) - Paul's pastoral letter. Voice: "Squad Leader" mentoring younger leader. Elder qualifications = precision required. Success: Leadership qualifications clear, false teaching warnings preserved, pastoral tone maintained.

- [ ] Translate 2 Timothy (4 chapters, ~1,700 words) - Paul's final letter. Voice: "Squad Leader" with legacy energy. "I have fought the good fight" = emotional peak. Success: Paul's farewell tone preserved, legacy instructions clear, emotional weight maintained.

- [ ] Translate Romans (16 chapters, ~9,400 words) - Paul's theological masterpiece. Voice: "Squad Leader" at maximum theological precision. Justification by faith = central argument requiring careful density balance. Success: Most complex Pauline theology preserved, Abraham/Adam typology clear, salvation structure intact.

- [ ] Translate 1 Corinthians (16 chapters, ~9,500 words) - Paul's church problems letter. Voice: "Squad Leader" addressing dysfunction. Love chapter (13) = most famous passage. Resurrection chapter (15) = theological precision. Success: Diverse issues addressed (division, immorality, gifts, resurrection), love chapter beautiful, resurrection apologetic intact.

- [ ] Translate 2 Corinthians (13 chapters, ~6,100 words) - Paul's defense letter. Voice: "Squad Leader" but vulnerable/defending. Most personal Pauline letter. Success: Paul's emotional intensity preserved, apostolic defense clear, collection motivation maintained.

- [ ] Translate Hebrews (13 chapters, ~6,900 words) - Author unknown, possibly Apollos. Voice: "The Theological Preacher" with superior Christology emphasis. Christ > angels, Moses, priests = central theme. Success: Sophisticated theology preserved, OT typology clear, warning passages intense.

- [ ] Run Tier 4 Paul voice validation - Verify Paul's "Squad Leader" voice identical across 10 letters (Philemon, Titus, Galatians, Ephesians, Philippians, Colossians, 1-2 Thess, 1-2 Tim, Romans, 1-2 Cor). Verify Hebrews voice distinct from Paul. Success: Perfect Pauline consistency, Hebrews appropriately different.

### Tier 5: Acts & OT Narratives (7 books, Est. 14 weeks)

- [ ] Translate Acts (28 chapters, ~24,200 words) - Luke's sequel to his gospel. Narrator: same "Investigative Journalist" voice as Luke gospel. Peter voice from 1-2 Peter epistles. Paul voice from epistles. Success: Largest single NT book complete, early church narrative preserved, speeches theologically accurate, Luke voice consistent with gospel.

- [ ] Translate 1 Samuel (31 chapters, ~25,000 words) - Narrator: "Kingdom Origins Reporter". Saul voice: "The Tragic King" with downfall arc. David voice: "The Underdog Champion" establishing voice for 2 Samuel, Psalms. Success: Saul's tragedy preserved, David's rise clear, Samuel's prophetic role maintained.

- [ ] Translate 2 Samuel (24 chapters, ~20,600 words) - Narrator: continuing from 1 Samuel. David voice: now "The Established King" with adultery/murder scandal. Success: David's golden age + fall preserved, Bathsheba incident handled per sensitivity guidelines, covenant theology clear.

- [ ] Translate 1 Kings (22 chapters, ~24,500 words) - Narrator: "Dynasty Chronicler". Solomon voice: "The Wisdom King" with decline arc. Elijah voice: "The Fire Prophet" with dramatic miracles. Success: Solomon's wisdom + folly clear, kingdom division explained, Elijah's miracles preserved.

- [ ] Translate 2 Kings (25 chapters, ~23,500 words) - Narrator: continuing from 1 Kings. Elisha voice: "Elijah 2.0" with double portion miracles. Final kings downfall narrative. Success: Elisha's miracles preserved, kingdom falls explained theologically, exile foreshadowed.

- [ ] Translate Joshua (24 chapters, ~18,900 words) - Narrator: "Conquest Chronicler". Joshua voice: "Moses 2.0 The Commander". Rahab, Caleb voices as needed. Success: Conquest narrative preserved, Jericho story clear, land division explained, violence handled per sensitivity guidelines.

- [ ] Translate Judges (21 chapters, ~18,600 words) - Narrator: "Cycle Documentarian" emphasizing sin→oppression→deliverance cycle. Deborah, Gideon, Samson voices distinct. Success: Cyclical structure clear, judge personalities preserved, descent into chaos evident, "everyone did what was right in their own eyes" refrain maintained.

### Tier 6: Wisdom & Poetry (5 books, Est. 12 weeks)

- [ ] Translate Ecclesiastes (12 chapters, ~5,600 words) - Qoheleth voice: "The Existential Crisis King" signature terms: "absolutely meaningless fr fr", "vanity of vanities", "chasing the algorithm". Success: Existential despair + wisdom synthesis preserved, "under the sun" refrain maintained, fear God conclusion clear.

- [ ] Translate Song of Solomon (8 chapters, ~2,600 words) - Voices: "The Lovers" with romantic poetry. Handle sexuality per TRANSLATION_GUIDELINES.md sensitivity. Success: Love poetry beauty preserved, metaphors translated not sanitized, allegorical interpretation possible but literal love primary.

- [ ] Translate Lamentations (5 chapters, ~3,400 words) - Jeremiah voice: "The Weeping Prophet" with acrostic poetry structure. Jerusalem destruction grief central. Success: Emotional intensity preserved, acrostic structure acknowledged in notes, suffering theology clear.

- [ ] Translate Proverbs (31 chapters, ~15,800 words) - Solomon voice: "The Wisdom Compiler" with bite-sized sayings. Chapter 31 = Proverbs 31 woman poetry. Success: Proverbial wisdom preserved, contrast parallelism maintained, Lady Wisdom personification clear, Proverbs 31 woman not weaponized.

- [ ] Translate Job (42 chapters, ~18,100 words) - Job voice: "The Suffering Questioner". Friends: "Toxic Advice Gang". God: "The OG Creator" with hurricane theophany. Success: Longest wisdom book complete, theodicy dialogue preserved, God's speeches magnificent, Job's restoration theologically handled.

### Tier 7: Major Prophets (4 books, Est. 16 weeks - longest sustained theological content)

- [ ] Translate Daniel (12 chapters, ~11,600 words) - Daniel voice: "The Exile Sage". Apocalyptic visions require specialized terminology. Success: Court narratives (lions den, furnace) preserved, apocalyptic visions (beasts, son of man) translated with appropriate intensity, exile context clear.

- [ ] Translate Ezekiel (48 chapters, ~39,400 words) - Ezekiel voice: "The Visionary Prophet" with bizarre visions. Dry bones, temple visions require precision. Success: Longest prophetic book complete, vision theology preserved, temple measurements detailed, glory of God departure/return clear.

- [ ] Translate Isaiah (66 chapters, ~37,000 words) - Isaiah voice: "The Messianic Prophet" with suffering servant songs. Chapters 40-55 = theological peak. Success: Second longest book complete, messianic prophecies preserved, suffering servant (53) theologically precise, new creation vision clear.

- [ ] Translate Jeremiah (52 chapters, ~42,600 words) - Jeremiah voice: "The Weeping Prophet" with new covenant theology. Most personal prophet narrative. Success: Longest book complete, Jeremiah's suffering preserved, new covenant (31:31-34) theologically precise, fall of Jerusalem narrative clear.

### Tier 8: Minor Prophets (8 books, Est. 8 weeks)

- [ ] Translate Hosea (14 chapters, ~5,400 words) - Hosea voice: "The Heartbroken Prophet" with marriage metaphor. Gomer narrative = central illustration. Success: Marriage metaphor preserved, Israel's adultery theme clear, restoration hope maintained.

- [ ] Translate Joel (3 chapters, ~2,300 words) - Joel voice: "The Locust Prophet" with day of the Lord emphasis. Pentecost prophecy (2:28-32) = key passage. Success: Locust plague imagery preserved, Spirit outpouring prophecy clear, day of the Lord theology maintained.

- [ ] Translate Amos (9 chapters, ~4,200 words) - Amos voice: "The Social Justice Prophet" with oracles against nations. Success: Social justice emphasis preserved, judgment oracles clear, "let justice roll down" passage iconic.

- [ ] Translate Micah (7 chapters, ~3,800 words) - Micah voice: "The Justice Prophet" with Bethlehem prophecy. Micah 6:8 = famous verse. Success: Justice requirement clear, Bethlehem prophecy preserved, "act justly, love mercy, walk humbly" maintained.

- [ ] Translate Zechariah (14 chapters, ~6,400 words) - Zechariah voice: "The Vision Prophet" with apocalyptic imagery. Success: Night visions preserved, messianic prophecies clear, apocalyptic sections handled.

- [ ] Translate Malachi (4 chapters, ~1,800 words) - Malachi voice: "The Final OT Prophet" with Elijah return prophecy. Last OT book before 400 years silence. Success: Covenant faithfulness emphasis preserved, Elijah prophecy clear, tithing teaching maintained.

- [ ] Run Tier 8 minor prophets voice validation - Verify prophetic voices distinct but consistent with "Unhinged Truthteller" archetype. Cross-check messianic prophecies for theological precision. Success: 8 prophets complete, prophetic voice established.

### Tier 9: Torah & Chronicles (10 books, Est. 20 weeks - foundational narratives)

- [ ] Translate Leviticus (27 chapters, ~24,500 words) - Narrator: "The Law Compiler". God voice: "The OG Creator" giving detailed laws. Success: Law categories preserved (sacrifice, purity, holiness), theological significance clear despite density of regulations, Day of Atonement theology precise.

- [ ] Translate Numbers (36 chapters, ~32,900 words) - Narrator: "The Wilderness Chronicler". Moses voice established from Exodus. Rebellion narratives central. Success: Census data handled, wilderness wandering narrative preserved, rebellion stories (Korah, spies) theologically clear, Balaam oracles maintained.

- [ ] Translate Deuteronomy (34 chapters, ~34,400 words) - Moses voice: "The Farewell Teacher" with sermon tone. Shema (6:4-9) = central confession. Success: Moses' speeches preserved, covenant renewal clear, Shema theologically precise, Moses' death handled reverently.

- [ ] Translate Exodus (40 chapters, ~32,600 words) - Narrator: "The Liberation Chronicler". Moses voice: "The Reluctant Leader" with burning bush, plagues, exodus narrative. God: "The OG Creator" with covenant emphasis. Success: Exodus narrative preserved, plagues dramatic, Red Sea parting clear, Ten Commandments precise, tabernacle details maintained.

- [ ] Translate Genesis (50 chapters, ~38,300 words) - Narrator: "The Origins Storyteller". God: "The OG Creator" creating ex nihilo. Abraham, Isaac, Jacob, Joseph voices distinct. Success: Creation narrative theologically precise, Fall preserved, covenant with Abraham clear, Joseph saga complete, theological foundation for entire Bible solid.

- [ ] Translate 1 Chronicles (29 chapters, ~20,400 words) - Narrator: "The Priestly Historian" with genealogy emphasis. David voice consistent with 1-2 Samuel. Success: Genealogies preserved (handle with TRANSLATION_GUIDELINES.md), David's preparations for temple clear, priestly perspective evident.

- [ ] Translate 2 Chronicles (36 chapters, ~26,100 words) - Narrator: continuing from 1 Chronicles. Solomon, subsequent kings voices. Success: Solomon's temple building detailed, kingdom history from priestly lens preserved, exile conclusion theologically clear.

- [ ] Translate Ezra (10 chapters, ~7,400 words) - Ezra voice: "The Scribe Reformer" with return from exile. Success: Return narrative preserved, temple rebuilding clear, Torah reading emphasis maintained.

- [ ] Translate Nehemiah (13 chapters, ~10,700 words) - Nehemiah voice: "The Wall Builder" with first-person memoir sections. Success: Wall rebuilding narrative preserved, opposition overcome, reforms instituted, Ezra-Nehemiah connection clear.

- [ ] Run Torah validation - Verify God's voice consistent across Genesis, Exodus, Leviticus, Numbers, Deuteronomy. Moses voice consistent Exodus through Deuteronomy. Success: Pentateuch (first 5 books) theologically coherent, voices consistent.

### Tier 10: Final Boss (2 books, Est. 8 weeks - highest difficulty)

- [ ] Translate Psalms (150 chapters, ~42,700 words) - Multiple voices: David (73 psalms), Asaph (12), Sons of Korah (11), Solomon (2), Moses (1), others anonymous. Each psalm = unique poem requiring voice matching. Success: All 150 psalms complete, worship diversity preserved, lament psalms emotionally authentic, messianic psalms theologically precise, Psalm 23 iconic, Psalm 119 (longest chapter in Bible) complete.

- [ ] Translate Revelation (22 chapters, ~12,000 words) - John voice: "The Apocalyptic Seer" from epistles but with visions. Beast, dragon, lamb imagery requires specialized apocalyptic terminology. Success: Final book of Bible complete, apocalyptic visions preserved, new heaven/earth theology clear, worship scenes magnificent, number symbolism maintained, theological precision on final judgment/resurrection.

---

## Phase 4: Quality & Integration (Est. 2 weeks)

### Cross-Book Validation

- [ ] Write `scripts/validate-character-voices.ts` to scan all 66 books for character consistency - Parse all brainrot/ markdown files. Extract character dialogue. Cross-reference against BIBLICAL_VOICES.md signature terms. Generate consistency report showing any deviations. Success: Script identifies character voice inconsistencies across 66 books for manual review.

- [ ] Write `scripts/validate-theology-terms.ts` to verify terminology consistency - Scan all 66 books for theological terms. Cross-reference against THEOLOGY_TERMS.md. Flag any instances where same source concept translated differently. Success: Script ensures "covenant" always becomes "sacred contract" across all 66 books, etc.

- [ ] Run full Bible brainrot density analysis - Execute density validator across all 66 books. Generate aggregate report showing average terms/sentence by book, testament, genre. Identify outliers. Success: Bible-wide density meets 3-5+ terms/sentence target, variance understood.

- [ ] Run full Bible length parity analysis - Execute length checker across all 66 books. Compare total KJV word count vs total brainrot word count. Verify ±15% target for complete Bible. Success: ~700k word target achieved, parity maintained.

### Metadata Generation

- [ ] Write `content/translations/books/the-bible/metadata.yaml` for complete unified Bible - Aggregate data from all 66 individual book metadata files. Calculate total chapters (1,189), total verses (~31,000), total words (~700k). Add ISBN placeholder for complete Bible in multiple formats. Success: Master metadata file complete, ready for format generation.

- [ ] Update all 66 individual book metadata.yaml files with testament/category info - Add "testament: Old" or "testament: New" field. Add category: "Law", "History", "Wisdom", "Major Prophet", "Minor Prophet", "Gospel", "History", "Epistle", "Apocalyptic". Success: All metadata files enhanced for better organization.

- [ ] Generate ISBN assignment plan for Bible publishing - Research ISBN requirements for: complete Bible (ebook/paperback/hardcover), Old Testament only (3 formats), New Testament only (3 formats), individual books (66 x 3 formats = 198 ISBNs). Document in `docs/BIBLE_ISBN_STRATEGY.md`. Success: Publishing strategy documented, ISBN needs quantified.

### Format Generation

- [ ] Create `scripts/generate-complete-bible.ts` to combine all 66 books - Read all brainrot/ markdown files in canonical order (Genesis→Revelation). Concatenate with book headers. Output single markdown file `content/translations/books/the-bible/brainrot/complete-bible.md`. Success: Single 700k word markdown file created.

- [ ] Create OT-only compilation script - Combine Genesis through Malachi (39 books). Output `content/translations/books/the-bible/brainrot/old-testament.md`. Success: ~500k word OT-only file created.

- [ ] Create NT-only compilation script - Combine Matthew through Revelation (27 books). Output `content/translations/books/the-bible/brainrot/new-testament.md`. Success: ~200k word NT-only file created.

- [ ] Update `scripts/generate-formats.ts` to handle Bible multi-format generation - Add logic to process complete Bible, OT-only, NT-only, plus all 66 individual books. Generate TXT/EPUB/PDF for each variant. Success: Format generator produces Bible in all required formats.

### Web App Integration

- [ ] Update `apps/web/app/books/page.tsx` to add Bible category section - Create new section "The Bible (Brainrot Edition)" with subsections for "Complete Bible", "Old Testament", "New Testament", "Individual Books (66)". Success: Bible discoverable on books page.

- [ ] Create `apps/web/app/books/the-bible/page.tsx` Bible landing page - Display Bible overview, format options (complete/OT/NT/individual), read online or download options. Include BIBLICAL_VOICES.md and THEOLOGY_TERMS.md as companion guides. Success: Dedicated Bible landing page with clear navigation.

- [ ] Create book navigation component for 66 individual books - Build collapsible tree structure: Old Testament (Law→History→Wisdom→Major Prophets→Minor Prophets), New Testament (Gospels→Acts→Epistles→Revelation). Success: Users can easily navigate to any of 66 books.

- [ ] Update `apps/web/app/books/[bookSlug]/page.tsx` dynamic route to handle Bible books - Extend existing book page logic to load Bible books from correct path structure. Handle chapter navigation for books with many chapters (Psalms = 150). Success: All 66 books readable online via web app.

### Documentation

- [ ] Write `content/translations/books/the-bible/README.md` project documentation - Document translation methodology, character voices, theology terms, timeline, challenges, lessons learned. Include statistics (66 books, 1,189 chapters, ~700k words, ~14 months). Success: Comprehensive project documentation for future translators.

- [ ] Create `content/translations/books/the-bible/TRANSLATION_NOTES.md` for theological decisions - Document key theological translation choices, controversial passages handled, sensitivity decisions made. Cross-reference with TRANSLATION_GUIDELINES.md sections used. Success: Theological integrity documentation complete.

- [ ] Update root `CLAUDE.md` to reflect Bible translation completion - Add Bible to list of completed books. Update project status percentage. Add lessons learned for future large-scale translations. Success: Project documentation reflects completed Bible.

---

## Progress Tracking

**Phase 1: Infrastructure** (0/9 tasks complete)
**Phase 2: Pilot Books** (0/7 tasks complete)
**Phase 3: Main Translation** (0/62 books complete)
- Tier 1: Short Epistles (0/6 complete)
- Tier 2: Narrative Books (0/8 complete)
- Tier 3: Gospels (0/4 complete)
- Tier 4: Major Epistles (0/10 complete)
- Tier 5: Acts & OT Narratives (0/7 complete)
- Tier 6: Wisdom & Poetry (0/5 complete)
- Tier 7: Major Prophets (0/4 complete)
- Tier 8: Minor Prophets (0/8 complete)
- Tier 9: Torah & Chronicles (0/10 complete)
- Tier 10: Final Boss (0/2 complete)

**Phase 4: Integration** (0/16 tasks complete)

**Total: 0/94 implementation tasks complete**

---

## Notes

- All translation tasks assume AI-assisted drafts with human review/refinement for quality
- Character voice consistency is THE critical success factor across 66 books
- Theological accuracy must never be sacrificed for brainrot density
- Sensitivity guidelines (section 3.1) apply especially to OT violence, slavery, patriarchy
- Each book completion should be committed to git for incremental progress tracking
- Estimated timeline assumes consistent ~1 book/week pace after infrastructure/pilot phases
- Large books (Psalms, Isaiah, Jeremiah, Ezekiel) will require 2-3 weeks each
- Gospel voice consistency is critical - Jesus must sound identical across Matthew/Mark/Luke/John
- Paul's voice must be consistent across 13 epistles (Philemon through Hebrews questionable)
- Backup BIBLICAL_VOICES.md and THEOLOGY_TERMS.md frequently as they're living documents
