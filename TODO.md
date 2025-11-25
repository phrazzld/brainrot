# TODO: Aesthetic Elevation - Brainrot Publishing House

**Strategic Goal**: Transform from "2015 cyberpunk theme park" to "impeccably crafted zine for the extremely online"

**Design Philosophy**: Rigorous order beneath chaotic content. Let the brainrot translations shine through systematic, minimalist design.

**Total Effort**: 23 hours (26 hours planned, moved 3h polish to BACKLOG.md)

---

## 🚨 CRITICAL: UX Fixes (11 hours) - Blocking Users

### Mobile Experience (2h)

- [x] **Add collapsible sidebar state to ChapterSidebar component**
  - File: `apps/web/components/reading-room/ChapterSidebar.tsx`
  - Context: 40%+ of users on mobile can't read - fixed 192px sidebar covers content
  - Add useState hook for `isOpen` state
  - Implement toggle button with hamburger icon for mobile (<lg breakpoint)
  - Success criteria: Sidebar hidden by default on mobile, toggleable via button, always visible on desktop (lg+)

- [x] **Implement responsive sidebar transform animations**
  - File: `apps/web/components/reading-room/ChapterSidebar.tsx`
  - Update aside className to use `fixed lg:sticky` positioning
  - Add transform classes: `-translate-x-full lg:translate-x-0` (hidden on mobile)
  - Add conditional: `${isOpen ? 'translate-x-0' : ''}`
  - Include z-index layering: `z-30` to overlay content when open
  - Success criteria: Smooth slide-in/out on mobile, no layout shift on desktop

- [x] **Add backdrop overlay for mobile sidebar**
  - File: `apps/web/components/reading-room/ChapterSidebar.tsx`
  - Render conditional overlay when sidebar open on mobile: `{isOpen && <div onClick={() => setIsOpen(false)} />}`
  - Style: `fixed inset-0 bg-black/50 z-20` (below sidebar z-30)
  - Success criteria: Clicking outside sidebar closes it, provides visual focus

### Error Handling & User Feedback (2.5h)

- [x] **Add error state to useAudioPlayer hook**
  - File: `apps/web/hooks/useAudioPlayer.ts`
  - Context: Silent audio failures confuse users (line 107-111 currently catches but doesn't report)
  - Add `error` state: `const [error, setError] = useState<string | null>(null)`
  - Update catch blocks to set user-friendly error messages
  - Return error in hook API for component consumption
  - Success criteria: All audio errors surface to UI with actionable messages

- [ ] **Display audio errors in AudioPlayer component**
  - File: `apps/web/components/reading-room/AudioPlayer.tsx`
  - Destructure `error` from useAudioPlayer hook
  - Render error banner above waveform when error exists
  - Style: Peachy background with black text, include retry/download suggestions
  - Success criteria: Users see "audio playback failed - try refreshing or use download button" instead of silent failure

- [ ] **Map HTTP status codes to user-friendly messages in DownloadButton**
  - File: `apps/web/components/DownloadButton.tsx`
  - Context: Lines 82, 122 expose raw status codes (404, 403, 500) to users
  - Create error message mapping object:
    - 404: "file not found - this chapter might not have audio/epub yet"
    - 403: "access denied - try refreshing the page"
    - 500: "server hiccup - try again in a minute"
  - Replace `throw new Error(\`failed to download (${res.status})\`)` with mapped message
  - Success criteria: Non-technical users understand what happened and have recovery path

- [ ] **Add user-friendly error messages for download failures**
  - File: `apps/web/components/DownloadButton.tsx`
  - Update both EPUB and audio download error handlers
  - Include fallback for unmapped status codes: "download failed - please try again"
  - Ensure error messages appear in UI toast/alert (not just console)
  - Success criteria: All download errors show helpful guidance instead of HTTP jargon

### Loading States (2h)

- [ ] **Create skeleton loader for chapter transitions**
  - File: `apps/web/components/reading-room/TextContent.tsx`
  - Context: Blank screen during chapter load makes users think click failed
  - Add skeleton UI with pulsing gray bars mimicking text layout
  - Render when `isLoading` prop is true
  - Include "loading chapter vibes..." text in peachy color
  - Success criteria: Users see immediate feedback when clicking chapter navigation

- [ ] **Add loading state to chapter navigation**
  - File: `apps/web/app/reading-room/[slug]/page.tsx`
  - Track loading state during chapter transitions
  - Pass `isLoading` prop to TextContent component
  - Success criteria: No blank screens - skeleton shows while content fetches

- [ ] **Implement lazy loading for book cover images on explore page**
  - File: `apps/web/app/explore/page.tsx`
  - Add `loading="lazy"` to all Image components (line 22-28)
  - Add placeholder blur data URL or loading skeleton
  - Success criteria: Faster initial page load, progressive image rendering on slow connections

- [ ] **Add progress indicator for audio file loading**
  - File: `apps/web/components/reading-room/AudioPlayer.tsx`
  - Context: Large audio files (5MB+) take 10+ seconds with no feedback
  - Add indeterminate progress bar during `isAudioLoading` state
  - Show helper text: "large file - might take a moment"
  - Success criteria: Users stay patient during long loads instead of bouncing

### Accessibility (2.5h)

- [ ] **Add Escape key handler to ShareModal**
  - File: `apps/web/components/reading-room/ShareModal.tsx`
  - Context: Keyboard users can't close modal (WCAG 2.1 Level A failure)
  - Add useEffect with keydown event listener
  - Call `onClose()` when Escape key pressed
  - Clean up listener on unmount
  - Success criteria: Modal closes on Escape key, keyboard navigation works

- [ ] **Add Escape key handler to DownloadModal**
  - File: `apps/web/components/reading-room/DownloadModal.tsx`
  - Implement same Escape key pattern as ShareModal
  - Success criteria: Both modals support Escape key closure

- [ ] **Implement focus trap in ShareModal**
  - File: `apps/web/components/reading-room/ShareModal.tsx`
  - Context: Tab key cycles through background content instead of staying in modal
  - Use focus trap library or implement manual: track focusable elements, cycle on Tab
  - Set initial focus to first interactive element when modal opens
  - Success criteria: Tab key stays within modal, focus returns to trigger on close

- [ ] **Implement focus trap in DownloadModal**
  - File: `apps/web/components/reading-room/DownloadModal.tsx`
  - Apply same focus trap pattern as ShareModal
  - Success criteria: Screen reader users can navigate modal without escaping

- [ ] **Add visual indicator for active chapter beyond color**
  - File: `apps/web/components/reading-room/ChapterSidebar.tsx`
  - Context: Line 30 uses peachy color only - color-blind users can't tell active chapter
  - Add arrow icon (`▶`) or underline before active chapter text
  - Success criteria: Active chapter identifiable without color perception

- [ ] **Add aria-live region for audio playback state changes**
  - File: `apps/web/components/reading-room/AudioPlayer.tsx`
  - Context: Play/pause state changes not announced to screen readers
  - Add visually hidden div with `role="status"` and `aria-live="polite"`
  - Update text when audio plays/pauses: "audio playing" / "audio paused"
  - Success criteria: Screen reader users hear state change announcements

- [ ] **Add help text to share modal checkboxes**
  - File: `apps/web/components/reading-room/ShareModal.tsx`
  - Context: Lines 69-86 show checkboxes with no explanation of what they do
  - Add descriptive text under each checkbox label:
    - "include chapter": "link opens to current chapter"
    - "include timestamp": "link starts audio at current position"
  - Success criteria: Users understand checkbox purpose before copying link

### Reading Progress Tracking (3h)

- [ ] **Create localStorage utility for reading progress**
  - File: `apps/web/lib/readingProgress.ts` (new file)
  - Implement functions:
    - `saveProgress(slug: string, chapterIndex: number, scrollPosition: number)`
    - `getProgress(slug: string): { chapterIndex: number, scrollPosition: number } | null`
    - `clearProgress(slug: string)`
  - Handle localStorage errors gracefully (incognito mode, quota exceeded)
  - Success criteria: Robust progress persistence with error handling

- [ ] **Integrate progress saving in reading room**
  - File: `apps/web/app/reading-room/[slug]/page.tsx`
  - Call `saveProgress()` on chapter change and scroll events (debounced)
  - Load saved progress on mount and navigate to last chapter if exists
  - Success criteria: Users return to exact spot when reopening book

- [ ] **Add "Continue Reading" badge to explore page cards**
  - File: `apps/web/app/explore/page.tsx`
  - Check localStorage for each book's progress on page load
  - Render badge overlay on cards with saved progress: "Continue - Chapter X"
  - Style: Small lavender badge in top-right corner
  - Success criteria: Users can quickly resume in-progress books

- [ ] **Display reading progress indicator in chapter header**
  - File: `apps/web/components/reading-room/ChapterHeader.tsx`
  - Show "Chapter X of Y" prominently in header
  - Add progress bar: `<div className="w-full h-1 bg-white/10"><div className="h-full bg-lavender" style={{ width: \`${progress}%\` }} /></div>`
  - Calculate progress: `(chapterIndex + 1) / totalChapters * 100`
  - Success criteria: Users always know their position in the book

---

## 🧹 Foundation Cleanup (4 hours) - Technical Debt

### Dead Code Removal (1h)

- [ ] **Delete unused footer components**
  - Files:
    - `apps/web/components/footer.tsx` (17 lines, completely unused)
    - `apps/web/components/FooterV2.tsx` (150 lines, never imported)
  - Context: Only FooterV3 is active (imported in layout.tsx line 4)
  - Verify no imports exist via grep before deletion
  - Success criteria: 167 lines removed, single source of truth for footer

- [ ] **Remove unused animations from globals.css**
  - File: `apps/web/app/globals.css`
  - Delete lines 180-209: `@keyframes glitch-mini` (used only in deleted FooterV2)
  - Delete lines 216-220: `@keyframes blink` (terminal cursor, FooterV2 only)
  - Delete lines 227-235: `@keyframes slideInRight` (achievement toast, being removed)
  - Delete lines 239-246: `@keyframes statusPulse` (FooterV2 status dots)
  - Delete lines 73-80: `@keyframes typewriter` (defined but never used anywhere)
  - Success criteria: Only essential animations remain (glitch, fadeInUp, marquee)

- [ ] **Remove unused CSS utility classes from globals.css**
  - File: `apps/web/app/globals.css`
  - Delete lines 211-213: `.glitch-mini` class (FooterV2 only)
  - Delete lines 221-224: `.terminal-cursor` pseudo-element (FooterV2 only)
  - Delete lines 174-177: `.header-glass` (defined but header uses inline classes)
  - Success criteria: No orphaned CSS classes, cleaner stylesheet

- [ ] **Remove duplicate button definition from globals.css**
  - File: `apps/web/app/globals.css`
  - Delete lines 89-106: First `.btn` definition
  - Keep lines 139-173: Second definition with pseudo-element glow
  - Context: CSS cascade means second definition overwrites first - duplication serves no purpose
  - Success criteria: Single canonical button implementation

- [ ] **Remove unused Tailwind config tokens**
  - File: `apps/web/tailwind.config.ts`
  - Delete lines 25-27: `flicker` keyframe (defined but unused)
  - Delete lines 17-18: `background` and `foreground` colors (Next.js boilerplate never actually used)
  - Verify via grep that no components reference these tokens
  - Success criteria: Config only contains actively used design tokens

### GSAP Removal (1h)

- [ ] **Remove GSAP animations from hero page**
  - File: `apps/web/app/page.tsx`
  - Delete line 6: `import gsap from 'gsap';`
  - Delete lines 9-10: `heroRef` and `subheadingRef` useRef declarations
  - Delete lines 12-31: Entire useEffect with GSAP animations
  - Success criteria: No GSAP imports or usage in component

- [ ] **Replace GSAP subheading fade with CSS animation**
  - File: `apps/web/app/page.tsx`
  - Remove ref from subheading paragraph (line 25)
  - Add classes and inline style: `className="text-xl md:text-2xl mb-8 font-light animate-fadeInUp" style={{ animationDelay: '0.6s', animationFillMode: 'both' }}`
  - Success criteria: Identical visual effect using existing CSS keyframe (fadeInUp already defined)

- [ ] **Replace GSAP gradient animation with static gradient**
  - File: `apps/web/app/page.tsx`
  - Remove ref from hero section (line 36)
  - Remove inline style `style={{ backgroundSize: '400% 400%' }}`
  - Simplify className to: `bg-gradient-to-r from-lavender to-peachy`
  - Context: Gradient swirl added motion without meaning - static serves brand equally well
  - Success criteria: Clean gradient without JavaScript dependency

- [ ] **Uninstall GSAP package**
  - Run: `pnpm remove gsap`
  - Verify package.json no longer lists gsap in dependencies
  - Success criteria: 22KB bundle size reduction

### Design Token Consistency (1h)

- [ ] **Replace hardcoded colors in glitch animation with theme tokens**
  - File: `apps/web/app/globals.css`
  - Change line 33: `color: #ffdaab;` → `color: theme('colors.peachy');`
  - Change line 40: `color: #e0afff;` → `color: theme('colors.lavender');`
  - Context: Hardcoded hex breaks single source of truth - brand changes require find-replace
  - Success criteria: All colors reference Tailwind theme tokens

- [ ] **Audit and replace remaining hardcoded colors in CSS**
  - File: `apps/web/app/globals.css`
  - Search for hex color codes: `#1c1c28`, `#e0afff`, `#ffdaab`, `#ffb3d9`
  - Replace with `theme()` function calls to design tokens
  - Verify glitch-mini colors (being deleted) and footer animations
  - Success criteria: Zero hardcoded colors in CSS, all via tokens

### Marquee Enhancement (20m)

- [ ] **Fix marquee seamless loop**
  - File: `apps/web/app/page.tsx`
  - Context: Lines 54-71 current implementation jumps when restarting
  - Wrap spans in two flex containers: original + duplicate
  - Structure: `<div flex animate-marquee-slow><div flex shrink-0>{titles}</div><div flex shrink-0 aria-hidden>{duplicate titles}</div></div>`
  - Add `shrink-0` to prevent flex compression
  - Add `aria-hidden="true"` to duplicate to avoid screen reader repetition
  - Success criteria: Infinite scroll with no visible jump or restart

### Footer Cleanup (1h)

- [ ] **Remove achievement toast system from FooterV3**
  - File: `apps/web/components/FooterV3.tsx`
  - Context: Lines ~68-78 random gaming notifications add decoration without function
  - Delete achievement state: `const [showAchievement, setShowAchievement] = useState(false)`
  - Delete useEffect with `Math.random() > 0.9` trigger logic
  - Delete achievement toast rendering JSX (fixed bottom-right notification)
  - Delete all achievement-related functions and types
  - Success criteria: Footer retains tagline rotation and basic structure, removes gamification

- [ ] **Verify footer functionality after achievement removal**
  - File: `apps/web/components/FooterV3.tsx`
  - Test tagline rotation still works (15s interval)
  - Ensure footer links (GitHub) still functional
  - Check layout doesn't break without achievement z-index layering
  - Success criteria: Clean footer with core features intact

---

## 🎨 Typography Evolution (3 hours) - Brand Elevation

### Font Installation (30m)

- [ ] **Replace Google Fonts in fonts.ts**
  - File: `apps/web/app/fonts.ts`
  - Replace `Anton` import with `Space_Grotesk`
  - Replace `Inter` import with `Crimson_Pro`
  - Update display font config:
    ```ts
    export const display = Space_Grotesk({
      subsets: ['latin'],
      weight: ['400', '700'],
      variable: '--font-display',
    });
    ```
  - Update body font config:
    ```ts
    export const body = Crimson_Pro({
      subsets: ['latin'],
      weight: ['400', '600'],
      variable: '--font-body',
    });
    ```
  - Context: Anton = retro-futurist cliché, Inter = AI default. New pairing: geometric sans (internet native) + editorial serif (literary sophistication)
  - Success criteria: Distinctive typography that signals "impeccable taste beneath chaos"

### Typography Scale Definition (1h)

- [ ] **Define custom font size scale with locked line heights**
  - File: `apps/web/tailwind.config.ts`
  - Add to `extend.fontSize`:
    ```ts
    fontSize: {
      'xs': ['12px', { lineHeight: '16px' }],
      'sm': ['14px', { lineHeight: '20px' }],
      'base': ['16px', { lineHeight: '24px' }],
      'lg': ['18px', { lineHeight: '28px' }],
      'xl': ['24px', { lineHeight: '32px' }],
      '2xl': ['32px', { lineHeight: '40px' }],
      '3xl': ['48px', { lineHeight: '56px' }],
      '4xl': ['64px', { lineHeight: '72px' }],
    }
    ```
  - Context: Vignelli principle - coupling size with line-height prevents inconsistent rhythm
  - Success criteria: Every font size has locked vertical rhythm, no arbitrary leading

- [ ] **Update heading styles to use new typography philosophy**
  - File: `apps/web/app/globals.css`
  - Change lines 12-18:
    ```css
    h1, h2, h3, h4 {
      @apply font-display font-bold tracking-tight;
    }
    ```
  - Remove `uppercase` and `tracking-wider` (was Anton aesthetic)
  - Context: Crimson Pro is sophisticated - doesn't need all-caps shouting
  - Success criteria: Headings readable and elegant, not aggressive

### Typography Audit (1.5h)

- [ ] **Audit and update hero typography**
  - File: `apps/web/app/page.tsx`
  - Update hero h1 (line 42): Check new scale works with glitch effect
  - Update subheading (line 45): Test Crimson Pro readability
  - Verify responsive sizes (md: breakpoints) still harmonize
  - Success criteria: Hero readable and impactful with new fonts

- [ ] **Audit and update explore page typography**
  - File: `apps/web/app/explore/page.tsx`
  - Update page heading (line 11-13)
  - Update card titles (line 30): Ensure Space Grotesk works in small sizes
  - Update descriptions (line 31): Test Crimson Pro in card context
  - Success criteria: Cards readable, hierarchy clear

- [ ] **Audit and update reading room typography**
  - Files:
    - `apps/web/components/reading-room/ChapterHeader.tsx`
    - `apps/web/components/reading-room/ChapterSidebar.tsx`
    - `apps/web/components/reading-room/TextContent.tsx`
  - Test Crimson Pro for long-form content (optimal line length: 680px max-width)
  - Ensure chapter sidebar legible with new fonts
  - Verify header title and navigation labels clear
  - Success criteria: Sustained readability in long reading sessions

- [ ] **Audit component typography for scale consistency**
  - Files: All components in `apps/web/components/`
  - Replace arbitrary text sizes with scale values (text-xl, text-2xl, etc.)
  - Remove inline font size styles in favor of Tailwind classes
  - Success criteria: All text uses systematic scale, no orphaned sizes

---

## 🏗️ Design System (5 hours) - Systematic Architecture

### Spacing System (2h)

- [ ] **Define systematic 8px spacing scale**
  - File: `apps/web/tailwind.config.ts`
  - Add to `extend.spacing`:
    ```ts
    spacing: {
      '1': '4px',    // 0.25rem
      '2': '8px',    // 0.5rem
      '3': '12px',   // 0.75rem
      '4': '16px',   // 1rem
      '6': '24px',   // 1.5rem
      '8': '32px',   // 2rem
      '12': '48px',  // 3rem
      '16': '64px',  // 4rem
    }
    ```
  - Context: Currently 33+ unique spacing values - chaos. Grid provides freedom through constraint.
  - Success criteria: 8-value scale covers 95% of spacing needs

- [ ] **Audit hero section spacing**
  - File: `apps/web/app/page.tsx`
  - Replace `px-4 py-32` with scale values
  - Ensure hero padding snaps to 8px grid
  - Success criteria: All spacing divisible by 4

- [ ] **Audit explore page spacing**
  - File: `apps/web/app/explore/page.tsx`
  - Update grid gap (line 14): `gap-10` → confirm maps to scale
  - Update card padding
  - Check button spacing
  - Success criteria: Consistent rhythm across card grid

- [ ] **Audit reading room spacing**
  - Files:
    - `apps/web/components/reading-room/ChapterSidebar.tsx`
    - `apps/web/components/reading-room/ChapterHeader.tsx`
    - `apps/web/components/reading-room/AudioPlayer.tsx`
  - Update sidebar padding (`p-4`)
  - Update header padding
  - Update audio player margins
  - Success criteria: All spacing aligns to 8px grid

- [ ] **Audit global component spacing**
  - Files: All components
  - Search for spacing utilities: `p-`, `m-`, `gap-`, `space-`
  - Replace non-scale values with nearest scale value
  - Document any exceptions (if spacing truly needs off-grid value, justify in comment)
  - Success criteria: 95%+ of spacing uses defined scale

### Visual Details (2h)

- [ ] **Generate subtle grain texture**
  - Create: `apps/web/public/noise.png`
  - Generate 100x100px grayscale noise pattern
  - Optimize for minimal file size (should be <5KB)
  - Test at different opacities to ensure subtlety
  - Success criteria: Tactile quality without distraction

- [ ] **Apply grain texture to body background**
  - File: `apps/web/app/globals.css`
  - Update body styles (lines 6-10):
    ```css
    body {
      @apply m-0 p-0 bg-midnight text-white font-body;
      background-image: url('/noise.png');
      background-repeat: repeat;
      background-blend-mode: overlay;
      opacity: 0.97;
    }
    ```
  - Test across pages to ensure consistent texture
  - Success criteria: Subtle analog warmth beneath digital content

- [ ] **Define named shadow system with lavender tint**
  - File: `apps/web/tailwind.config.ts`
  - Add to `extend.boxShadow`:
    ```ts
    boxShadow: {
      'card': '0 4px 12px rgba(224, 175, 255, 0.15)',
      'button': '0 2px 8px rgba(224, 175, 255, 0.2)',
    }
    ```
  - Context: Generic black shadows → brand-aligned lavender glow
  - Success criteria: Shadows reinforce color palette

- [ ] **Apply card shadow system**
  - File: `apps/web/app/explore/page.tsx`
  - Update card className (line 18): Add `shadow-card`
  - Update hover state to increase shadow (not just scale)
  - Success criteria: Cards have subtle lavender depth

- [ ] **Apply button shadow system**
  - Files: Update all buttons across components
  - Replace generic `hover:shadow-lg` with `shadow-button`
  - Verify `.btn` classes use named shadows
  - Success criteria: Consistent button elevation across site

### Border System (1h)

- [ ] **Add crisp borders to all cards**
  - File: `apps/web/app/globals.css`
  - Update `.card` class (line 108-111):
    ```css
    .card {
      @apply bg-cardbg rounded flex flex-col transition-all border border-white/10;
      @apply hover:scale-[1.01] hover:shadow-lg;
    }
    ```
  - Success criteria: 1px borders add definition without heaviness

- [ ] **Audit border consistency across components**
  - Files: All interactive elements (modals, buttons, inputs)
  - Apply `border border-white/10` pattern consistently
  - Ensure border opacity matches visual hierarchy (10% for subtle, 20% for emphasis)
  - Success criteria: Borders create rhythm and separation systematically

- [ ] **Update card styles to use sharp edges**
  - File: `apps/web/app/globals.css`
  - Change `.card` border radius: `rounded` → `rounded-none` OR keep minimal `rounded-sm`
  - Context: Rams aesthetic - honest edges, no decorative curves
  - Test impact on explore grid visual cohesion
  - Success criteria: Sharp, honest geometry aligns with "impeccable craft" goal

---

## Documentation & Verification

- [ ] **Create design system documentation**
  - Create: `docs/DESIGN_SYSTEM.md`
  - Document:
    - Color tokens (midnight, lavender, peachy, cardbg) with semantic usage
    - Typography scale with line-heights
    - Spacing scale (8px grid)
    - Animation language (glitch, fadeInUp, marquee)
    - Component patterns (cards, buttons, modals)
  - Success criteria: New developers can understand system without codebase archaeology

- [ ] **Run bundle size comparison**
  - Before changes: `pnpm build` and note bundle size
  - After GSAP removal: `pnpm build` and compare
  - Document savings in commit message
  - Success criteria: ~22KB reduction verified

- [ ] **Run Lighthouse audit**
  - Test all three pages: home, explore, reading-room
  - Check performance, accessibility, best practices scores
  - Document any regressions and address before completion
  - Success criteria: No score decreases, ideally improvements in accessibility

- [ ] **Test responsive breakpoints**
  - Verify mobile sidebar works: 320px, 375px, 768px widths
  - Test typography readability across breakpoints
  - Ensure spacing system doesn't break at edge cases
  - Success criteria: Fluid experience from mobile to desktop

- [ ] **Verify design token usage**
  - Grep for hardcoded colors: `#1c1c28`, `#e0afff`, `#ffdaab`
  - Grep for magic numbers in spacing: look for `px-7`, `mb-5`, etc.
  - Success criteria: Zero hardcoded values, 100% token usage
