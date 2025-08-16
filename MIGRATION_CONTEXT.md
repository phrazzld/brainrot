# Migration Context & Rationale

## Why This Migration?

### The Problem We're Solving
We have two separate repositories that are tightly coupled:
1. **Web app** needs translations to display
2. **Translations** need conversion and publishing infrastructure
3. Changes often span both repos (new book = update both)
4. Duplicate code for handling translations
5. Manual process for publishing to multiple platforms

### The Monorepo Solution
By combining everything into a monorepo with Turborepo, we get:
- **Atomic commits**: Add a book and make it available in one PR
- **Shared utilities**: One converter package used everywhere  
- **Coordinated releases**: Deploy web and sync content together
- **Unified CI/CD**: One pipeline for everything
- **Better DX**: See everything in one place

## The Publishing Vision

### Current Process (Manual)
1. Generate translation (days of work)
2. Save as markdown files
3. Manually copy to web app
4. Manually convert for Kindle Create
5. Manually upload to KDP
6. Manually create covers
7. Manually set pricing
8. Repeat for each platform

### Future Process (Automated)
```bash
pnpm translate "war-and-peace"        # AI generates translation
pnpm generate:formats war-and-peace   # Creates all formats
pnpm publish:all war-and-peace       # Publishes everywhere
```

One command publishes to:
- Web app (via blob storage)
- Amazon KDP (ebook & print)
- Lulu (print-on-demand)
- IngramSpark (bookstores)
- Apple Books
- Google Play Books

## Technical Decisions Explained

### Why Turborepo?
- Built by Vercel (same team as Next.js)
- Excellent caching (only rebuilds what changed)
- Parallel execution
- Perfect for our Next.js app
- Remote caching for team collaboration

### Why pnpm?
- Efficient disk usage (shared dependencies)
- Strict dependency resolution
- Great workspace support
- Fast installation
- Used by many monorepos

### Why Pandoc?
- Industry standard for document conversion
- Supports all formats we need
- Highly customizable
- Command-line friendly
- LaTeX integration for beautiful PDFs

### Why Not Alternatives?

**Why not Nx?**
- More complex than needed
- Turborepo is simpler and Vercel-native

**Why not Lerna?**
- Deprecated/maintenance mode
- Turborepo is more modern

**Why not Yarn workspaces alone?**
- No built-in task orchestration
- Turborepo adds the build pipeline

**Why not separate repos with Git submodules?**
- Submodules are notoriously difficult
- Poor developer experience
- Complex to maintain

## Content Strategy

### The Value of Translations
These aren't just translations - they're complete cultural reinterpretations that make classic literature accessible and entertaining for Gen Z readers.

Example from The Great Gatsby:
- Original: "In my younger and more vulnerable years, my father gave me some advice that I've been turning over in my mind ever since."
- Brainrot: "back when i was a lil sus beta and way more vulnerable to getting absolutely ratio'd by life, my sigma dad dropped some hardcore gyat wisdom that's been living rent-free in my brainrot ever since."

This is original creative work that:
- Takes days to generate properly
- Requires deep understanding of both the source and target culture
- Has genuine market value
- Could scale to hundreds of books

### Preservation Strategy
1. **Git history**: Full version control with meaningful commits
2. **Multiple backups**: GitHub + S3 + local
3. **Structured format**: Consistent markdown structure
4. **Metadata**: Complete book information in YAML
5. **Generated formats**: Keep source (MD) and generate others

## Migration Strategy

### Phase 1: Structure (Current)
- Set up monorepo skeleton
- Migrate repos with history
- Basic Turborepo configuration

### Phase 2: Packages
- Extract shared code
- Create converter utilities
- Set up templates

### Phase 3: Integration
- Update imports
- Test everything works
- Fix Great Gatsby

### Phase 4: Pipeline
- Format generation
- Blob storage sync
- Publishing automation

### Phase 5: Publishing
- Lulu API integration
- KDP automation
- Distribution setup

## Risk Mitigation

### What Could Go Wrong?
1. **Lost git history** → Using subtree merge to preserve
2. **Broken web app** → Testing at each step
3. **Lost translations** → Multiple backups before starting
4. **Failed migration** → Original repos remain intact
5. **Merge conflicts** → Clean repos before merging

### Rollback Plan
If migration fails:
1. Original repos are untouched
2. Can continue using separate repos
3. Can try alternative approaches
4. No data loss possible

## Success Metrics

### Technical Success
- ✅ Git history preserved
- ✅ All tests passing
- ✅ Build time < 60 seconds
- ✅ Zero data loss
- ✅ Great Gatsby working

### Business Success  
- ✅ Faster book releases
- ✅ Multi-platform publishing
- ✅ Reduced manual work
- ✅ Better content management
- ✅ Scale to 100+ books

## Long-term Vision

### Year 1
- 50 classic books translated
- Automated publishing pipeline
- Web app with subscriptions
- Print books on Amazon

### Year 2
- 200 books translated
- AI-assisted translation
- Mobile apps
- International expansion

### Year 3
- 500+ books
- Original content
- Educational partnerships
- Brainrot Press imprint

## The Philosophy

We're not just making silly translations. We're:
- Making literature accessible
- Preserving classics in modern language
- Creating a new genre
- Building a publishing platform
- Demonstrating language evolution

The monorepo is the technical foundation for this vision. It's not just about organizing code - it's about building infrastructure for a new kind of publishing house.

## Who's Involved

- **Development**: Single developer (you/Claude + user)
- **Content**: AI-assisted generation
- **Publishing**: Automated to platforms
- **Future**: May expand team

## Timeline

- **Week 1**: Monorepo setup and migration
- **Week 2**: Publishing pipeline
- **Month 1**: 10 books published
- **Month 3**: 50 books published
- **Month 6**: 100+ books, subscription service

## Dependencies We're Managing

### Current Web App
- Next.js 15.3.3
- React 19
- Vercel Blob Storage
- TypeScript 5.5

### Publishing Pipeline
- Pandoc (external binary)
- LaTeX (for PDFs)
- Lulu API
- Playwright (for KDP)

### Development Tools
- Turborepo
- pnpm
- Git (with subtree support)
- GitHub Actions

## Questions This Migration Answers

**Q: How do we add a new book?**
A: Add to content/translations, run generate, deploy

**Q: How do we publish to a new platform?**
A: Add adapter in publisher app

**Q: How do we update all books?**
A: Update template, regenerate all

**Q: How do we scale to 1000 books?**
A: Monorepo structure handles it

**Q: How do we ensure quality?**
A: Shared validation and testing

## The Bottom Line

This migration transforms a hacky two-repo setup into a professional publishing platform. It's the difference between a hobby project and a real business.

The immediate pain (Great Gatsby not working) is just the tip of the iceberg. The real value is in building a system that can scale to hundreds of books and multiple distribution channels with minimal manual intervention.

This is infrastructure as competitive advantage.