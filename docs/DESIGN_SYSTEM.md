# Design System

Brainrot Publishing House design system documentation. The system embodies "rigorous order beneath chaotic content" - disciplined foundations that support vibrant, brainrot-translated classics.

## Design Philosophy

**Inspired by Dieter Rams + Digital Zine Aesthetics**
- Honest materials and edges (no unnecessary decoration)
- Systematic constraints create freedom
- Typography signals "impeccable taste beneath chaos"
- Analog warmth (grain texture) meets digital precision

## Color Tokens

All colors are defined in `apps/web/tailwind.config.ts` under `theme.extend.colors`:

```typescript
colors: {
  midnight: '#1c1c28',    // Primary background
  lavender: '#e0afff',    // Primary accent, interactive elements
  peachy: '#ffdaab',      // Secondary accent, highlights
  cardbg: '#2c2c3a',      // Card/modal backgrounds
}
```

### Semantic Usage

| Token | Usage | Examples |
|-------|-------|----------|
| `midnight` | Page backgrounds, base layer | `bg-midnight` |
| `lavender` | Primary CTAs, links, headings, shadows | `text-lavender`, `bg-lavender`, `border-lavender` |
| `peachy` | Secondary actions, highlights, status indicators | `text-peachy`, `bg-peachy` |
| `cardbg` | Elevated surfaces (cards, modals) | `bg-cardbg` |

### Color Modifiers

Use Tailwind opacity modifiers for hierarchy:

```css
border-white/10    /* Subtle borders (cards, modals) */
border-white/20    /* Emphasized borders (navigation, active states) */
bg-black/60        /* Modal overlays */
text-white/60      /* Secondary text */
```

## Typography

**Font Pairing**: Space Grotesk (display) + Crimson Pro (body)
- **Space Grotesk**: Geometric sans-serif for headings, UI elements
- **Crimson Pro**: Editorial serif for body text, enhancing readability

Fonts loaded in `apps/web/app/fonts.ts` via `next/font/google`:

```typescript
display: Space_Grotesk (400, 700)
body: Crimson_Pro (400, 600)
```

### Typography Scale

Defined in `tailwind.config.ts` with locked line heights:

| Size | Token | Pixels | Line Height | Usage |
|------|-------|--------|-------------|-------|
| 12px | `text-xs` | 12px | 16px | Captions, timestamps |
| 14px | `text-sm` | 14px | 20px | Secondary text, labels |
| 16px | `text-base` | 16px | 24px | Body text (default) |
| 18px | `text-lg` | 18px | 28px | Large body, subheadings |
| 24px | `text-xl` | 24px | 32px | Section headings |
| 32px | `text-2xl` | 32px | 40px | Page headings |
| 48px | `text-3xl` | 48px | 56px | Hero headings |
| 64px | `text-4xl` | 64px | 72px | Large hero headings |

### Typography Classes

Always apply font family classes explicitly:

```tsx
<h1 className="font-display font-bold">Heading</h1>
<p className="font-body">Body text</p>
```

**Heading Styles** (applied via `globals.css`):
```css
h1, h2, h3, h4 {
  @apply font-display font-bold tracking-tight;
}
```

## Spacing Scale

8px grid system defined in `tailwind.config.ts`:

| Token | Value | Pixels | Use Case |
|-------|-------|--------|----------|
| `1` | 4px | 4px | Tight spacing, micro-adjustments |
| `2` | 8px | 8px | Compact spacing, inline elements |
| `3` | 12px | 12px | Small gaps, form elements |
| `4` | 16px | 16px | Standard spacing, card padding |
| `6` | 24px | 24px | Medium gaps, section spacing |
| `8` | 32px | 32px | Large gaps, major sections |
| `12` | 48px | 48px | Extra large gaps, page sections |
| `16` | 64px | 64px | Massive gaps, hero sections |

### Spacing Discipline

All spacing values MUST align to this 8px grid. No arbitrary values like `py-10` or `mb-5`.

**Examples:**
```tsx
<div className="px-4 py-12">     {/* ✅ On-grid */}
<div className="mb-12 gap-12">   {/* ✅ On-grid */}
<div className="py-10 mb-5">     {/* ❌ Off-grid */}
```

## Shadows

Lavender-tinted shadows for brand cohesion, defined in `tailwind.config.ts`:

```typescript
boxShadow: {
  'card': '0 4px 12px rgba(224, 175, 255, 0.15)',    // Subtle card elevation
  'button': '0 2px 8px rgba(224, 175, 255, 0.2)',    // Button depth
}
```

### Shadow Usage

| Class | Usage |
|-------|-------|
| `shadow-card` | Cards, panels, elevated surfaces |
| `shadow-button` | Buttons, interactive elements |

**Enhanced hover states:**
```css
.card:hover {
  box-shadow: 0 8px 24px rgba(224, 175, 255, 0.25);  /* Doubled offset/blur, increased opacity */
}
```

## Borders

Crisp 1px borders with white opacity for definition:

| Pattern | Usage |
|---------|-------|
| `border border-white/10` | Subtle borders (cards, modals, inputs) |
| `border border-white/20` | Emphasized borders (navigation, active states) |

### Border Radius

Minimal `rounded-sm` (2px) for honest edges without decoration:

```tsx
<div className="rounded-sm">  {/* ✅ Minimal 2px radius */}
<div className="rounded">     {/* ❌ Too decorative (4px) */}
<div className="rounded-lg">  {/* ❌ Far too decorative */}
```

## Visual Details

### Grain Texture

Analog warmth via subtle noise texture:
- **File**: `apps/web/public/noise.png` (100x100px, 4.8KB, 4-bit grayscale)
- **Application**: Body background with overlay blend mode

```css
body {
  background-image: url('/noise.png');
  background-repeat: repeat;
  background-blend-mode: overlay;
  background-size: 100px 100px;
}
```

## Animation Language

All animations defined in `globals.css` using CSS keyframes (no GSAP dependency):

### Available Animations

| Animation | Duration | Usage |
|-----------|----------|-------|
| `fadeInUp` | 1s | Entry animations (hero text, CTAs) |
| `glitch` | 2s infinite | Hero titles, brand identity |
| `marquee` | 15s infinite | Horizontal scrolling text |

### Glitch Effect

Applied to hero headings for digital/analog tension:

```tsx
<h1 className="glitch-text" data-text="brainrot publishing">
  brainrot publishing
</h1>
```

### Fade In Up

Staggered entry animations:

```tsx
<p className="animate-fadeInUp" style={{ animationDelay: '0.6s', animationFillMode: 'both' }}>
  zoomer translations of classic literature
</p>
```

## Component Patterns

### Cards

```tsx
<div className="card">
  <Image src={coverImage} alt={title} />
  <div className="card-content">
    <h3 className="text-xl font-display font-bold">{title}</h3>
    <p className="text-sm font-body">{description}</p>
    <div className="card-footer">
      <button className="btn btn-primary">Action</button>
    </div>
  </div>
</div>
```

**Card Styles:**
```css
.card {
  @apply bg-cardbg rounded-sm flex flex-col transition-all shadow-card border border-white/10;
  @apply hover:scale-[1.01];
}
```

### Buttons

Two variants: primary (lavender) and secondary (black/lavender on hover).

```tsx
<button className="btn btn-primary">Primary Action</button>
<button className="btn btn-secondary">Secondary Action</button>
```

**Button Styles:**
```css
.btn {
  @apply inline-block px-5 py-2 rounded font-semibold transition-all relative shadow-button;
}

.btn-primary {
  @apply bg-lavender text-black;
}

.btn-secondary {
  @apply bg-black text-white;
  &:hover {
    @apply bg-lavender text-black;
  }
}
```

**Hover Glow Effect:**
All buttons include pseudo-element glow on hover via `::before` pseudo-element with lavender box-shadow.

### Modals

```tsx
<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-20">
  <div className="w-full max-w-sm bg-cardbg p-4 rounded-sm border border-white/10" role="dialog">
    <h2 className="text-xl font-display font-bold">Modal Title</h2>
    {/* Modal content */}
  </div>
</div>
```

**Modal Patterns:**
- Backdrop: `bg-black/60 backdrop-blur-sm`
- Container: `bg-cardbg border border-white/10 rounded-sm`
- Max width: `max-w-sm` for compactness
- Accessibility: `role="dialog"`, `aria-modal="true"`, focus trap, Escape key

## Accessibility

### ARIA Attributes

All interactive components must include:
- `aria-label` for icon-only buttons
- `aria-modal="true"` for modals
- `aria-live` for dynamic content updates
- `aria-hidden` for decorative elements

### Keyboard Navigation

- Tab/Shift+Tab: Navigate focusable elements
- Escape: Close modals
- Enter/Space: Activate buttons (via `handleKeyboardInteraction` utility)

### Focus Traps

Modals implement focus traps (see `ShareModal.tsx`, `DownloadModal.tsx`) to prevent Tab navigation from leaving modal.

## Responsive Breakpoints

Standard Tailwind breakpoints:

| Breakpoint | Min Width | Usage |
|------------|-----------|-------|
| `sm:` | 640px | Mobile landscape, small tablets |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Laptops, desktops |

**Mobile-first approach:**
```tsx
<h1 className="text-3xl md:text-4xl">  {/* 48px on mobile, 64px on tablets+ */}
<div className="py-16 md:py-32">       {/* 64px on mobile, 128px on tablets+ */}
```

## Usage Guidelines

### Do's ✅

- Use design tokens (`midnight`, `lavender`, `peachy`, `cardbg`)
- Align all spacing to 8px grid (`1`, `2`, `3`, `4`, `6`, `8`, `12`, `16`)
- Apply `font-display` to headings, `font-body` to text
- Use typography scale tokens (`text-xs` through `text-4xl`)
- Apply `shadow-card` to cards, `shadow-button` to buttons
- Use `border-white/10` for subtle borders, `border-white/20` for emphasis
- Keep border radius minimal (`rounded-sm`)

### Don'ts ❌

- No arbitrary spacing values (`py-10`, `mb-5`, `gap-7`)
- No arbitrary color values (`bg-[#hexcode]`, `text-gray-500`)
- No arbitrary font sizes (`text-[17px]`)
- No generic shadows (`shadow-lg`, `shadow-md`)
- No decorative border radius (`rounded-lg`, `rounded-xl`)
- No inline styles unless animation timing (`style={{animationDelay}}`)

## Future Considerations

As the design system evolves:

1. **Dark Mode Support**: Consider `@media (prefers-color-scheme: dark)` if needed (currently single dark theme)
2. **Component Library**: Extract reusable components into dedicated package (`@brainrot/ui`)
3. **CSS Variables**: Migrate to CSS custom properties for runtime theming
4. **Design Tokens Package**: Export design tokens for use in publisher CLI, print materials

---

**Last Updated**: 2025-08-21
**Maintained by**: Brainrot Publishing House Team
