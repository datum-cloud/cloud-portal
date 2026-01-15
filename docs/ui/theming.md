# Theming System

This document explains the theme system and how to customize it.

---

## Overview

The theming system uses CSS layers for cascade control:

```
@layer shadcn-base    →    @layer theme
   (fallback)              (overrides)
```

1. **shadcn-base** provides default styles
2. **theme** layer overrides with brand colors

---

## Architecture

```
app/
├── modules/shadcn/styles/
│   ├── shadcn.css          # Base styles (shadcn-base layer)
│   └── animations.css      # Custom animations
└── styles/
    ├── root.css            # Main entry, layer order
    └── themes/
        └── alpha.css       # Theme overrides (theme layer)
```

### Layer Order

Defined in `root.css`:

```css
@layer shadcn-base, theme;
```

This ensures theme always wins over base styles.

---

## CSS Variables

### Semantic Variables

These variables control component colors:

| Variable | Usage |
|----------|-------|
| `--background` | Page background |
| `--foreground` | Primary text |
| `--primary` | Primary actions |
| `--primary-foreground` | Text on primary |
| `--secondary` | Secondary actions |
| `--secondary-foreground` | Text on secondary |
| `--muted` | Muted backgrounds |
| `--muted-foreground` | Muted text |
| `--accent` | Accent highlights |
| `--destructive` | Danger/error |
| `--border` | Borders |
| `--input` | Input borders |
| `--ring` | Focus rings |

### Using Variables in Tailwind

Variables map to Tailwind utilities:

```tsx
// Background colors
<div className="bg-background" />
<div className="bg-primary" />
<div className="bg-muted" />

// Text colors
<p className="text-foreground" />
<p className="text-muted-foreground" />
<p className="text-primary-foreground" />

// Border colors
<div className="border border-border" />
<input className="border-input" />

// Focus rings
<button className="focus:ring-ring" />
```

---

## Base Styles (shadcn-base)

Located in `app/modules/shadcn/styles/shadcn.css`:

```css
@layer shadcn-base {
  :root {
    /* Fallback colors using OKLCH */
    --background: oklch(1 0 0);
    --foreground: oklch(0.145 0 0);
    --primary: oklch(0.205 0 0);
    --primary-foreground: oklch(0.985 0 0);
    /* ... more variables */
  }

  .dark {
    /* Dark mode fallbacks */
    --background: oklch(0.145 0 0);
    --foreground: oklch(0.985 0 0);
    /* ... */
  }

  /* Map to Tailwind utilities */
  @theme inline {
    --color-background: var(--background);
    --color-foreground: var(--foreground);
    --color-primary: var(--primary);
    /* ... */
  }
}
```

**Don't modify this file** - use theme overrides instead.

---

## Theme Overrides

### Current Theme (alpha)

Located in `app/styles/themes/alpha.css`:

```css
/* Custom brand colors */
@theme {
  --color-navy: #0c1d31;
  --color-cream: #f6f6f5;
  --color-sunset-orange: #f6894d;
  /* ... more brand colors */
}

@layer theme {
  .theme-alpha {
    /* Override semantic variables */
    --primary: var(--color-navy);
    --primary-foreground: var(--color-cream);
    --accent: var(--color-sunset-orange);
    /* ... */

    &.dark {
      /* Dark mode overrides */
      --background: var(--color-navy);
      --foreground: var(--color-cream);
      /* ... */
    }
  }

  /* Map overrides to Tailwind */
  @theme inline {
    --color-primary: var(--primary);
    /* ... */
  }
}
```

### Applying a Theme

Theme is applied via class on `<body>`:

```tsx
// app/root.tsx
<body className="theme-alpha">
  {children}
</body>
```

---

## Dark Mode

Dark mode uses class-based toggling:

```tsx
// Light mode
<body className="theme-alpha">

// Dark mode
<body className="theme-alpha dark">
```

### Toggling Dark Mode

```typescript
function toggleDarkMode() {
  document.body.classList.toggle('dark');
}
```

Or use system preference:

```typescript
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
if (prefersDark) {
  document.body.classList.add('dark');
}
```

---

## Creating a New Theme

### Step 1: Create Theme File

```css
/* app/styles/themes/beta.css */
@theme {
  /* Define custom colors */
  --color-brand-blue: #0066cc;
  --color-brand-light: #f0f8ff;
}

@layer theme {
  .theme-beta {
    /* Override semantic variables */
    --primary: var(--color-brand-blue);
    --primary-foreground: white;
    --background: var(--color-brand-light);
    --foreground: #1a1a1a;
    --muted: #e8e8e8;
    --muted-foreground: #666666;
    --border: #dddddd;
    --input: #cccccc;
    --ring: var(--color-brand-blue);
    --accent: #ff6600;
    --accent-foreground: white;

    &.dark {
      --background: #1a1a1a;
      --foreground: #f0f0f0;
      --muted: #2a2a2a;
      --muted-foreground: #888888;
      --border: #333333;
      --input: #444444;
    }
  }

  @theme inline {
    --color-primary: var(--primary);
    --color-background: var(--background);
    /* ... map all overrides */
  }
}
```

### Step 2: Import in Root Styles

```css
/* app/styles/root.css */
@import './themes/alpha.css';
@import './themes/beta.css';  /* Add new theme */
```

### Step 3: Apply Theme

```tsx
// app/root.tsx
<body className="theme-beta">
```

---

## Custom Brand Colors

Define custom colors in the `@theme` block:

```css
@theme {
  /* Brand palette */
  --color-navy: #0c1d31;
  --color-cream: #f6f6f5;

  /* Extended palette */
  --color-sunset-orange: #f6894d;
  --color-sunglow-500: #ffc233;
  --color-winter-sky-700: #1e88e5;

  /* Grays */
  --color-light-gray: #e5e5e5;
  --color-dark-gray: #333333;
}
```

Use in components:

```tsx
<div className="bg-navy text-cream">
  <span className="text-sunset-orange">Highlighted</span>
</div>
```

---

## Tailwind Integration

Theme variables are mapped to Tailwind utilities via `@theme inline`:

```css
@theme inline {
  /* Semantic colors */
  --color-primary: var(--primary);
  --color-background: var(--background);

  /* Brand colors */
  --color-navy: var(--color-navy);
  --color-cream: var(--color-cream);
}
```

This enables:

```tsx
// Semantic utilities
<button className="bg-primary text-primary-foreground">

// Brand utilities
<header className="bg-navy text-cream">
```

---

## Best Practices

### ✅ DO

- Use semantic variables (`--primary`, `--background`)
- Define brand colors in `@theme` block
- Override in theme layer only
- Test both light and dark modes

### ❌ DON'T

- Modify shadcn-base layer
- Hardcode colors in components
- Skip dark mode variants
- Mix HSL/RGB/OKLCH (stick to OKLCH)

---

## Debugging Themes

### Check Active Theme

```javascript
document.body.className
// "theme-alpha" or "theme-alpha dark"
```

### Inspect Variables

```javascript
getComputedStyle(document.body).getPropertyValue('--primary')
// "oklch(0.205 0 0)"
```

### DevTools

1. Open DevTools → Elements
2. Select `<body>`
3. Check Styles panel for `--` variables

---

## Related Documentation

- [UI Overview](./overview.md) - Component hierarchy
- [shadcn Rules](./shadcn-rules.md) - Base components
- [datum-ui Guide](./datum-ui-guide.md) - Datum components
