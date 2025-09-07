# TODO

## Critical: Restore Missing Translations

### Phase 1: Recovery from Git History

- [x] Extract Hamlet Act I from git commit 1368a54:public/assets/hamlet/text/brainrot/act-i.txt
- [x] Extract Hamlet Act II from git commit 1368a54:public/assets/hamlet/text/brainrot/act-ii.txt
- [x] Extract Hamlet Act III from git commit 1368a54:public/assets/hamlet/text/brainrot/act-iii.txt
- [x] Extract Hamlet Act IV from git commit 1368a54:public/assets/hamlet/text/brainrot/act-iv.txt
- [x] Extract Hamlet Act V from git commit 1368a54:public/assets/hamlet/text/brainrot/act-v.txt
- [x] Search git history for Huckleberry Finn chapter files (check commits before d567594)
  ```
  Work Log:
  - Found in commit c77889b - 43 chapter files using Roman numerals
  - Path: public/assets/the-adventures-of-huckleberry-finn/text/brainrot/
  - Files named: chapter-i.txt through chapter-xlii.txt plus chapter-the-last.txt
  ```
- [x] Extract all 43 Huckleberry Finn chapter files from identified commit

### Phase 2: Create Version-Controlled Structure

- [ ] Create directory content/translations/books/hamlet/brainrot/
- [ ] Create directory content/translations/books/hamlet/metadata.yaml with ISBN, pricing, page count
- [ ] Convert recovered Hamlet act-i.txt to act-01.md in markdown format
- [ ] Convert recovered Hamlet act-ii.txt to act-02.md in markdown format
- [ ] Convert recovered Hamlet act-iii.txt to act-03.md in markdown format
- [ ] Convert recovered Hamlet act-iv.txt to act-04.md in markdown format
- [ ] Convert recovered Hamlet act-v.txt to act-05.md in markdown format
- [ ] Create directory content/translations/books/huckleberry-finn/brainrot/
- [ ] Create directory content/translations/books/huckleberry-finn/metadata.yaml with ISBN, pricing, page count
- [ ] Convert all 43 Huckleberry Finn chapter files to chapter-01.md through chapter-43.md format

### Phase 3: Generate Output Formats

- [ ] Run `pnpm generate:formats book hamlet` to create text/epub/pdf in generated/hamlet/
- [ ] Verify generated/hamlet/text/ contains act-01.txt through act-05.txt
- [ ] Run `pnpm generate:formats book huckleberry-finn` to create text/epub/pdf in generated/huckleberry-finn/
- [ ] Verify generated/huckleberry-finn/text/ contains chapter-01.txt through chapter-43.txt

### Phase 4: Deploy to Blob Storage

- [ ] Execute `pnpm sync:blob book hamlet --force` to upload to Vercel Blob storage
- [ ] Verify hamlet files accessible at https://82qos1wlxbd4iq1g.public.blob.vercel-storage.com/books/hamlet/text/act-01.txt
- [ ] Execute `pnpm sync:blob book huckleberry-finn --force` to upload to Vercel Blob storage
- [ ] Verify huckleberry-finn files accessible at https://82qos1wlxbd4iq1g.public.blob.vercel-storage.com/books/huckleberry-finn/text/chapter-01.txt

### Phase 5: Validation

- [ ] Test Hamlet in web app at /reading-room/hamlet - verify all 5 acts load
- [ ] Test Huckleberry Finn in web app at /reading-room/huckleberry-finn - verify all 43 chapters load
- [ ] Check sync-log.json confirms successful upload with zero errors
- [ ] Commit recovered translations to git with message "fix: restore missing Hamlet and Huckleberry Finn translations"

## Infrastructure Improvements

### Prevent Future Data Loss

- [ ] Add pre-commit hook to block deletion of content/translations/books/* files without explicit override
- [ ] Create script to validate all books marked 'available' have corresponding markdown source files
- [ ] Add GitHub Action to run validation script on every PR to main branch
- [ ] Document in CONTRIBUTING.md that translations must be in content/translations/books/ not public/assets/
- [ ] Add automated test that verifies blob URLs return 200 for all available books

### Cleanup Legacy Migration Artifacts

- [ ] Remove apps/web/archive/migration-data/ after verifying no other missing books
- [ ] Update .gitignore to exclude any future public/assets/*/text/ directories
- [ ] Archive old brainrot-translations and brainrot-publishing-house repos on Sep 20, 2025 as scheduled