# TODO

## 🚨 URGENT: CI PIPELINE FIX REQUIRED 🚨

### CI Infrastructure Failure - Broken Lockfile
PR #136 CI is blocked due to duplicate key in pnpm-lock.yaml

#### Immediate Tasks
- [x] [CI FIX] Backup current pnpm-lock.yaml to pnpm-lock.yaml.backup
- [x] [CI FIX] Remove broken pnpm-lock.yaml file
- [x] [CI FIX] Regenerate fresh lockfile with `pnpm install`
- [x] [CI FIX] Verify no duplicate keys with `grep -c "/debug@4.4.3:" pnpm-lock.yaml`
- [x] [CI FIX] Test lockfile locally with `pnpm install --frozen-lockfile`
- [x] [CI FIX] Run local quality checks: `npm run lint` and `npm run build`
- [ ] [CI FIX] Commit fixed lockfile with message "fix: regenerate pnpm-lock.yaml to resolve duplicate key"
- [ ] [CI FIX] Push to trigger CI and verify all jobs pass

#### Prevention Tasks
- [ ] [CI FIX] Document this issue in troubleshooting guide
- [ ] [CI FIX] Consider adding lockfile validation to pre-commit hooks

## ⚠️ CRITICAL: READ BEFORE TRANSLATING ⚠️

**ALL TRANSLATIONS MUST FOLLOW: `TRANSLATION_GUIDELINES.md`**
- 1000+ lines of specific methodology
- "maximalist gremlin mode" requirements
- all lowercase, 3-5+ brainrot terms per sentence MINIMUM
- 400+ term vocabulary (skibidi, gyatt, rizz, fr fr ong, etc.)
- Character voice mapping with signature terms
- Systematic slur replacement matrix

## Plato's Republic Translation - COMPLETE! 🎉

### ✅ Phase 1: Setup (COMPLETE)
- [x] Parse source text into 35 chapters (118,430 words total)
- [x] Create basic translation style guide
- [x] Set up chapter structure in `/content/translations/books/platos-republic/chapters/`

### ✅ Phase 2: Manual Translation (35 chapters) - COMPLETE

All 35 chapters translated following TRANSLATION_GUIDELINES.md methodology.

#### Book 1: The Justice Debate (3 chapters)
- [x] Chapter 1: Piraeus festival & meeting Cephalus (3,438 words)
- [x] Chapter 2: Polemarchus on helping friends/harming enemies (5,530 words)
- [x] Chapter 3: Thrasymachus - might makes right (3,372 words)

#### Book 2: Building the State (3 chapters)
- [x] Chapter 1: Glaucon's challenge & Ring of Gyges (5,737 words)
- [x] Chapter 2: Building the just city (2,610 words)
- [x] Chapter 3: Guardian class & early education (3,193 words)

#### Book 3: Guardian Education (4 chapters)
- [x] Chapter 1: Censorship of poetry & stories (4,371 words)
- [x] Chapter 2: Musical & physical education (4,536 words)
- [x] Chapter 3: Selection of guardians (2,393 words)
- [x] Chapter 4: The Noble Lie (2,601 words)

#### Book 4: The Just Soul (3 chapters)
- [x] Chapter 1: Guardian lifestyle & common property (4,202 words)
- [x] Chapter 2: City's virtues (4,309 words)
- [x] Chapter 3: The tripartite soul (2,909 words)

#### Book 5: Revolutionary Ideas (4 chapters)
- [x] Chapter 1: Women guardians & gender equality (4,925 words) [FIXED: was split mid-sentence]
- [x] Chapter 2: Communal marriage & children (4,862 words)
- [x] Chapter 3: War & unity among Greeks (2,423 words)
- [x] Chapter 4: Philosopher kings revealed (1,717 words)

#### Book 6: The Philosopher (4 chapters)
- [x] Chapter 1: The philosopher's nature (3,672 words)
- [x] Chapter 2: Corruption of philosophy (3,410 words)
- [x] Chapter 3: Form of the Good & Sun analogy (2,138 words)
- [x] Chapter 4: The Divided Line (2,636 words)

#### Book 7: Education & The Cave (4 chapters)
- [x] Chapter 1: The Cave Allegory (4,255 words)
- [x] Chapter 2: Return to the cave (2,984 words)
- [x] Chapter 3: Mathematical education (2,428 words)
- [x] Chapter 4: Dialectic & philosopher training (1,860 words)

#### Book 8: Political Decline (4 chapters)
- [x] Chapter 1: Review & decline of states (3,130 words)
- [x] Chapter 2: Oligarchy - rule by wealth (2,525 words) [NOTE: content was mislabeled in source]
- [x] Chapter 3: Democracy content (2,822 words) [NOTE: labeled as oligarchy in source file]
- [x] Chapter 4: Democracy & tyranny (2,836 words)

#### Book 9: The Tyrant (3 chapters)
- [x] Chapter 1: The tyrannical man (2,760 words)
- [x] Chapter 2: Comparing just vs unjust lives (2,485 words)
- [x] Chapter 3: Three proofs of justice's superiority (3,711 words)

#### Book 10: Poetry & The Afterlife (3 chapters)
- [x] Chapter 1: Poetry & imitation critique (2,426 words)
- [x] Chapter 2: Immortality of the soul (2,680 words)
- [x] Chapter 3: The Myth of Er (6,550 words)

### ✅ Phase 3: Publishing (COMPLETE)
- [x] Run `pnpm generate:formats` to create EPUB/PDF - ✅ Generated 35 text files successfully
- [x] Run `pnpm sync:blob` to upload to web - ✅ Files uploaded to blob storage
- [x] Test reading experience - ✅ Web app and publishing pipeline verified
- [x] Ship it - ✅ SHIPPED! Plato's Republic translation complete and ready

## Translation Guidelines

### Core Philosophy → Gen Z Mapping
- Justice → "being based and fair"
- Virtue → "being goated"
- Knowledge → "being actually woke"
- The Good → "the ultimate W"
- Forms → "eternal blueprints"
- Soul → "your whole vibe"

### Character Voices
- **Socrates**: Philosophical troll/streamer who acts dumb but is galaxy brain
- **Glaucon**: Devil's advocate hypebeast, always pushing boundaries
- **Thrasymachus**: Edgelord grindset coach, sigma energy
- **Adeimantus**: Practical skeptic, concerned with optics
- **Polemarchus**: Loyalty stan, ride or die energy
- **Cephalus**: Boomer wisdom, old money vibes

### Style Notes
- Target 10-15% slang density (don't overthink it)
- Use internet culture references where natural
- Keep philosophical accuracy while making it accessible
- Make Socratic trolling obvious and funny
- Preserve argument structure but modernize examples

## Old Overengineered Tasks (REMOVED)

All the complex automation has been deleted:
- ~~Translation preprocessing pipeline~~
- ~~Slang frequency governors~~
- ~~Tone modulators~~
- ~~Automated injection systems~~
- ~~Complex validation suites~~

This is now just simple manual translation work. Read → Translate → Save → Next.
