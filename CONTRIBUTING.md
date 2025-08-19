# Contributing to Brainrot Publishing House

Welcome to the Brainrot Publishing House monorepo! We're excited you want to contribute to making classic literature absolutely bussin' for Gen Z. This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Making Contributions](#making-contributions)
- [Translation Guidelines](#translation-guidelines)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Security](#security)

## Code of Conduct

### Our Standards

- Be respectful and inclusive
- Keep the vibes positive, no cap
- Constructive criticism only - we're all learning
- Respect the artistic vision while improving quality
- No gatekeeping - help newcomers get started

### Unacceptable Behavior

- Harassment, discrimination, or hate speech
- Publishing others' private information
- Trolling or insulting comments
- Any form of inappropriate content beyond our Gen Z translations

## Getting Started

### Prerequisites

- Node.js >= 22.0.0
- pnpm >= 8.15.0
- Git
- A sense of humor about classic literature

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/phrazzld/brainrot.git
cd brainrot

# Install dependencies
pnpm install

# Set up git hooks for security
./scripts/setup-git-hooks.sh

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your tokens (see README for required vars)

# Build all packages
pnpm build

# Start development server
pnpm dev
```

## Project Structure

```
brainrot/
├── apps/
│   ├── web/                 # Next.js web application
│   └── publisher/           # CLI for automated publishing
├── content/
│   └── translations/       # Book translations (our crown jewels!)
├── packages/
│   ├── @brainrot/types/       # TypeScript type definitions
│   ├── @brainrot/converter/   # Format conversion utilities
│   ├── @brainrot/blob-client/ # Storage utilities
│   ├── @brainrot/metadata/    # Book metadata handling
│   └── @brainrot/templates/   # Publishing templates
└── scripts/                    # Automation scripts
```

## Development Workflow

### Working with the Monorepo

We use Turborepo for managing our monorepo. Key commands:

```bash
# Run all development servers
pnpm dev

# Build everything
pnpm build

# Build specific workspace
pnpm build --filter=@brainrot/web

# Run tests
pnpm test

# Lint code
pnpm lint

# Format code
pnpm format
```

### Working on Specific Packages

```bash
# Work on the web app
cd apps/web
pnpm dev

# Work on a package
cd packages/@brainrot/converter
pnpm build
pnpm test
```

### Managing Dependencies

```bash
# Add dependency to root
pnpm add -D typescript

# Add to specific workspace
pnpm add react --filter=@brainrot/web

# Add workspace dependency
pnpm add @brainrot/types --filter=@brainrot/web --workspace
```

## Making Contributions

### Types of Contributions

#### 1. Bug Fixes
- Fix typos in translations
- Resolve technical issues
- Improve performance
- Fix broken links or features

#### 2. New Features
- Add new books for translation
- Improve the reading experience
- Add new publishing platforms
- Enhance the translation pipeline

#### 3. Translations
- Create new "brainrot" translations
- Improve existing translations
- Add chapter summaries
- Create marketing copy

#### 4. Documentation
- Improve README files
- Add code comments
- Create tutorials
- Document APIs

### Branch Naming

Use descriptive branch names:
- `feature/add-pride-prejudice-translation`
- `fix/great-gatsby-chapter-3-typo`
- `docs/improve-setup-guide`
- `refactor/simplify-blob-storage`

### Commit Messages

Follow conventional commits:

```
feat: add Iliad book 2 translation
fix: correct chapter numbering in Odyssey
docs: update translation guidelines
refactor: simplify text processing pipeline
test: add converter package tests
chore: update dependencies
```

## Translation Guidelines

### The Brainrot Style

When creating translations:

1. **Keep the plot intact** - We're translating language, not changing stories
2. **Use Gen Z slang naturally** - Don't force it where it doesn't fit
3. **Be funny but respectful** - We're celebrating these works, not mocking them
4. **Maintain readability** - It should still flow as a story
5. **Stay consistent** - Character voices should remain consistent

### Translation Structure

```markdown
# Chapter Title

*[Optional author note or context]*

Main text with Gen Z translation...

---

*[Optional end note or meme reference]*
```

### Example Translation

Original:
> "In my younger and more vulnerable years my father gave me some advice that I've been turning over in my mind ever since."

Brainrot:
> "back when i was a lil sus beta and way more vulnerable to getting absolutely ratio'd by life, my dad dropped some wisdom that's been living rent-free in my head ever since no cap"

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm test --filter=@brainrot/converter

# Run tests in watch mode
pnpm test:watch

# Generate coverage report
pnpm test:coverage
```

### Writing Tests

- Test files should be colocated with source files
- Use `.test.ts` or `.spec.ts` extensions
- Write descriptive test names
- Test edge cases and error conditions

Example:
```typescript
describe('stripMarkdown', () => {
  it('should remove markdown formatting while preserving text', () => {
    const input = '**bold** and *italic*';
    const output = stripMarkdown(input);
    expect(output).toBe('bold and italic');
  });
});
```

## Pull Request Process

### Before Submitting

1. **Test your changes**
   ```bash
   pnpm test
   pnpm lint
   pnpm build
   ```

2. **Check for secrets**
   ```bash
   # Our pre-commit hooks should catch these
   gitleaks detect --source . -v
   ```

3. **Update documentation** if needed

4. **Add tests** for new features

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Translation
- [ ] Documentation

## Testing
- [ ] Tests pass locally
- [ ] Added new tests (if applicable)
- [ ] Manually tested changes

## Screenshots (if applicable)
Add screenshots for UI changes

## Related Issues
Closes #123
```

### Review Process

1. Submit PR against `main` branch
2. Automated checks will run (tests, linting, security)
3. Wait for code review from maintainers
4. Address feedback
5. PR will be merged once approved

## Code Style

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow ESLint configuration
- Use functional components in React
- Prefer async/await over callbacks
- Use meaningful variable names

### CSS/Styling

- Use Tailwind CSS classes
- Follow mobile-first design
- Maintain consistent spacing
- Use CSS variables for theming

### File Organization

```typescript
// 1. Imports (sorted automatically)
import React from 'react';
import { useEffect } from 'react';
import axios from 'axios';
import { BookType } from '@/types';

// 2. Types/Interfaces
interface Props {
  book: BookType;
}

// 3. Component/Function
export function BookReader({ book }: Props) {
  // Implementation
}

// 4. Exports
export default BookReader;
```

## Security

### Important Security Practices

1. **Never commit secrets**
   - Use `.env.local` for local secrets
   - Check `.env.example` for required variables
   - Run `./scripts/setup-git-hooks.sh` to enable pre-commit scanning

2. **Validate inputs**
   - Sanitize user inputs
   - Validate file uploads
   - Check URL parameters

3. **Dependencies**
   - Keep dependencies updated
   - Review security advisories
   - Use `pnpm audit` regularly

4. **Report vulnerabilities**
   - Email security issues to: security@brainrot.pub
   - Do NOT open public issues for security problems
   - Include steps to reproduce

## Development Tips

### Useful Scripts

```bash
# Generate formats for a book
pnpm generate:formats great-gatsby

# Sync to blob storage
pnpm sync:blob --all

# Monitor API usage
pnpm monitor

# Open monitoring dashboard
pnpm monitor:dashboard
```

### Environment Variables

See `.env.example` for all available variables. Key ones:
- `BLOB_READ_WRITE_TOKEN` - Required for content storage
- `NEXT_PUBLIC_BLOB_BASE_URL` - Content delivery URL
- `LULU_API_KEY` - For publishing automation
- `KDP_EMAIL/PASSWORD` - For Amazon publishing

### Debugging

1. Use browser DevTools for frontend issues
2. Add `console.log` or use debugger statements
3. Check `pnpm dev` output for server errors
4. Use `--verbose` flag on CLI commands
5. Check GitHub Actions logs for CI/CD issues

## Getting Help

### Resources

- [README.md](README.md) - Project overview
- [docs/SECRETS.md](docs/SECRETS.md) - Secret management
- [TODO.md](TODO.md) - Current project status
- [Discord](https://discord.gg/brainrot) - Community chat
- [Issues](https://github.com/phrazzld/brainrot/issues) - Bug reports

### Contact

- General questions: Open a GitHub Discussion
- Bug reports: Open a GitHub Issue
- Security issues: security@brainrot.pub
- Business inquiries: business@brainrot.pub

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Acknowledgments

Thanks to all contributors who help make classic literature fire for Gen Z! Special shoutout to the original authors who would probably be very confused but hopefully a little amused by what we're doing.

Remember: We're not trying to replace the originals - we're creating a gateway drug to get Gen Z interested in classic literature. Once they're hooked on our translations, they might just pick up the originals too. That's the dream, no cap fr fr.

Happy contributing! 🚀📚✨