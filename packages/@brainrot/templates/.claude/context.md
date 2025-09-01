# Pattern Context

## Patterns

- **Pandoc EPUB Command Structure**: Uses secure spawn with args array, temporary files with Date.now() naming, and security-focused execution with --sandbox flag
- **Legal Page Generation**: generateLegalPages() function creates combined markdown with page breaks using \\newpage, processes template variables, and handles missing templates gracefully
- **Temporary File Creation**: Pattern uses path.join(tempDir, `prefix-${Date.now()}.extension`) for unique temporary files with cleanup on completion/error
- **Metadata Processing**: Book metadata loaded from metadata.yaml using yaml.load(), includes title, author, ISBN, and publishing formats
- **File Writing Integration**: Uses fs.writeFile with await for temporary content creation before Pandoc execution