# Fonts Directory

This directory should contain the Inter font files for PDF generation.

## Required Font Files

Download the Inter font family from: https://github.com/rsms/inter/releases

Place the following files in this directory:
- `Inter-Regular.ttf`
- `Inter-Italic.ttf`
- `Inter-Bold.ttf`
- `Inter-BoldItalic.ttf`
- `Inter-Black.ttf` (for display headings)

## Web Fonts

For EPUB generation, the Inter font is loaded via Google Fonts CDN:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
```

## License

Inter is licensed under the SIL Open Font License 1.1
https://github.com/rsms/inter/blob/master/LICENSE.txt

## Alternative Fonts

If Inter is not available, the templates will fallback to:
1. System UI fonts for EPUB
2. Computer Modern for LaTeX/PDF