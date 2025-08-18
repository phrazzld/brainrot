# @brainrot/templates

Publishing templates for EPUB, PDF, and Kindle formats optimized for Gen Z translations of classic literature.

## Installation

```bash
pnpm add @brainrot/templates
```

## Usage

```javascript
import { 
  getTemplatePath, 
  readTemplate, 
  processTemplate,
  generateCover 
} from '@brainrot/templates';

// Get path to a template
const epubTemplatePath = getTemplatePath('epub');

// Read template contents
const pdfTemplate = readTemplate('pdf-paperback');

// Process template with values
const metadata = {
  title: 'The Great Gatsby',
  author: 'F. Scott Fitzgerald',
  translator: 'Brainrot Translator',
  isbn: '979-8-123456-78-9',
  publishDate: '2025-01-01'
};

const processedTemplate = processTemplate(pdfTemplate, metadata);

// Generate a book cover
const coverSVG = generateCover({
  slug: 'great-gatsby',
  title: 'The Great Gatsby',
  subtitle: 'Simping in the Jazz Age',
  author: 'F. Scott Fitzgerald',
  translator: 'Gen Z Translator'
});
```

## Template Types

### EPUB Template (`epub`)
- **File**: `epub/brainrot.epub.template`
- **Format**: Pandoc Markdown with YAML frontmatter
- **Styling**: Custom CSS with Gen Z aesthetic
- **Features**:
  - Drop caps for chapter starts
  - Custom fonts (Inter)
  - Brainrot pink accent colors
  - Mobile-optimized typography

### PDF Paperback (`pdf-paperback`)
- **File**: `pdf/paperback.latex`
- **Dimensions**: 6x9 inches
- **Margins**: 0.75" inner, 0.5" outer
- **Features**:
  - Professional typography with Inter font
  - Chapter headers with decorative styling
  - Proper page breaks and widow/orphan control
  - Print-ready formatting

### PDF Hardcover (`pdf-hardcover`)
- **File**: `pdf/hardcover.latex`
- **Dimensions**: 6x9 inches
- **Margins**: 0.875" inner (for case binding)
- **Features**:
  - Premium design elements
  - Decorative chapter numbers
  - Colophon and dedication pages
  - Enhanced typography

### Kindle Template (`kindle`)
- **File**: `kindle/kindle.template`
- **Format**: HTML with Kindle-specific metadata
- **Features**:
  - Reflowable text optimized for e-readers
  - Kindle X-Ray and Page Flip support
  - Start reading location markers
  - Review prompt at end

## Template Variables

All templates support variable substitution using `{{VARIABLE}}` or `$variable$` syntax:

### Required Variables
- `title` - Book title
- `author` - Author name
- `translator` - Translator name
- `content` / `body` - Main book content

### Optional Variables
- `subtitle` - Book subtitle or tagline
- `original-author` - Original author (for translations)
- `isbn` - ISBN-13 number
- `publishDate` / `date` - Publication date
- `description` - Book description
- `keywords` - SEO keywords
- `dedication` - Dedication text
- `year` - Copyright year
- `uuid` - Unique identifier

### Conditional Sections
LaTeX templates support conditional sections:
```latex
$if(subtitle)$
  {\Large\textit{$subtitle$}\par}
$endif$
```

## Cover Generation

Generate custom covers for each book with automatic color schemes:

```javascript
import { generateCover, getColorScheme } from '@brainrot/templates';

// Get color scheme for a specific book
const colors = getColorScheme('great-gatsby');
// Returns: { primary: '#FFD700', secondary: '#FFA500', accent: '#1F1F1F' }

// Generate complete cover
const coverSVG = generateCover({
  slug: 'great-gatsby',
  title: 'The Great Gatsby',
  subtitle: 'Simping in the Jazz Age',
  author: 'F. Scott Fitzgerald',
  translator: 'Brainrot Translator',
  genre: 'CLASSIC LITERATURE'
});
```

## Color Schemes

Pre-configured color schemes for popular titles:
- `great-gatsby` - Art Deco Gold
- `iliad` - Bronze Age
- `odyssey` - Mediterranean Blue
- `hamlet` - Danish Darkness
- `pride-prejudice` - Regency Rose
- `romeo-juliet` - Verona Violet
- And more...

## Customization Points

### 1. CSS Customization (EPUB)
Edit `epub/brainrot-style.css` to modify:
- Font families and sizes
- Color scheme (default: Brainrot Pink #FF69B4)
- Paragraph spacing and indentation
- Chapter heading styles
- Drop cap styling

### 2. LaTeX Customization (PDF)
Modify LaTeX templates to adjust:
- Page dimensions and margins
- Font selection (default: Inter)
- Chapter and section formatting
- Header/footer content
- Color definitions

### 3. Cover Customization
Edit `covers/cover-template.svg` to change:
- Layout and composition
- Text positioning
- Decorative elements
- Border styles

Add new color schemes in `covers/color-schemes.json`:
```json
{
  "schemes": {
    "my-book": {
      "name": "Custom Scheme",
      "primary": "#FF0000",
      "secondary": "#00FF00",
      "accent": "#0000FF"
    }
  }
}
```

## Font Requirements

### PDF Generation
Download Inter font files from [GitHub](https://github.com/rsms/inter/releases) and place in `fonts/`:
- `Inter-Regular.ttf`
- `Inter-Bold.ttf`
- `Inter-Italic.ttf`
- `Inter-BoldItalic.ttf`
- `Inter-Black.ttf`

### EPUB Generation
Fonts are loaded via Google Fonts CDN automatically.

## Dependencies

For full functionality, these system tools should be installed:
- **Pandoc** - For EPUB and PDF generation
- **LaTeX** (TeX Live or MiKTeX) - For PDF generation
- **Calibre** (optional) - For Kindle conversion

## Examples

### Generate EPUB with Custom Metadata
```javascript
import { readTemplate, processTemplate } from '@brainrot/templates';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function generateEPUB(bookData) {
  const template = readTemplate('epub');
  const processed = processTemplate(template, {
    TITLE: bookData.title,
    AUTHOR: bookData.author,
    TRANSLATOR: bookData.translator,
    UUID: crypto.randomUUID(),
    PUBLISH_DATE: new Date().toISOString().split('T')[0],
    CONTENT: bookData.chapters.join('\n\n'),
    ISBN: bookData.isbn || '979-8-000000-00-0',
    DESCRIPTION: bookData.description,
    COVER_IMAGE: bookData.coverPath
  });
  
  // Save to temporary file
  await fs.writeFile('temp.md', processed);
  
  // Generate EPUB with Pandoc
  await execAsync(`pandoc temp.md -o ${bookData.slug}.epub --epub-stylesheet=brainrot-style.css`);
}
```

### Generate Print-Ready PDF
```javascript
async function generatePDF(bookData, format = 'paperback') {
  const template = readTemplate(`pdf-${format}`);
  const processed = processTemplate(template, bookData);
  
  // Save to .tex file
  await fs.writeFile('book.tex', processed);
  
  // Compile with LaTeX
  await execAsync('xelatex book.tex');
  await execAsync('xelatex book.tex'); // Run twice for TOC
}
```

## License

MIT © Brainrot Publishing House

## Support

For issues or questions about templates, visit [brainrotpublishing.com](https://brainrotpublishing.com)