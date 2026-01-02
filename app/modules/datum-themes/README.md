# Datum Themes

A React Router-compatible theme system inspired by [next-themes](https://github.com/pacocoursey/next-themes), providing seamless dark mode, system theme support, and no-flash theme switching.

## Features

✅ **Perfect dark mode** - No flash on load (both SSR and client-side)  
✅ **System theme support** - Automatically follows `prefers-color-scheme`  
✅ **Cross-tab sync** - Theme changes sync between browser tabs  
✅ **React Router compatible** - Designed specifically for React Router  
✅ **TypeScript support** - Full type safety  
✅ **Extensible** - Easy to add custom themes  
✅ **Hydration-safe** - No hydration mismatches

## Installation

The module is already included in the project. No additional installation required.

## Quick Start

### 1. Setup ThemeProvider

```tsx
// app/root.tsx
import { ThemeProvider, ThemeScript } from '@/modules/datum-themes';

export function Layout({ children }: { children: React.ReactNode }) {
  return <ThemeProvider defaultTheme="light">{children}</ThemeProvider>;
}
```

### 2. Add ThemeScript to head

```tsx
// app/root.tsx
function App() {
  return (
    <html lang={lang} className={clsx(resolvedTheme)} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <ThemeScript nonce={nonce} defaultTheme="light" />
        {/* ... other head elements */}
      </head>
      <body>{/* ... body content */}</body>
    </html>
  );
}
```

### 3. Use the theme hook

```tsx
import { useTheme } from '@/modules/datum-themes';

function MyComponent() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useTheme();

  return (
    <div>
      <p>Current theme: {theme}</p>
      <p>Resolved theme: {resolvedTheme}</p>
      <p>System theme: {systemTheme}</p>

      <button onClick={() => setTheme('light')}>Light</button>
      <button onClick={() => setTheme('dark')}>Dark</button>
      <button onClick={() => setTheme('system')}>System</button>
    </div>
  );
}
```

## API Reference

### useTheme Hook

Returns an object with the following properties:

```tsx
const { theme, setTheme, resolvedTheme, systemTheme, themes } = useTheme();
```

- **`theme`**: The current theme setting (`'light' | 'dark' | 'system'`)
- **`setTheme`**: Function to change the theme
- **`resolvedTheme`**: The actual theme being applied (`'light' | 'dark'`)
- **`systemTheme`**: The system preference (`'light' | 'dark' | undefined`)
- **`themes`**: Array of available themes

### ThemeProvider Props

#### `children` (required)

The React components that will have access to the theme context.

```tsx
<ThemeProvider>
  <App />
</ThemeProvider>
```

#### `defaultTheme` (optional)

The theme to use when no theme is stored in localStorage. Defaults to `'system'`.

**Values:** `'light' | 'dark' | 'system'`

```tsx
// Always start with light theme
<ThemeProvider defaultTheme="light">
  <App />
</ThemeProvider>

// Always start with dark theme
<ThemeProvider defaultTheme="dark">
  <App />
</ThemeProvider>

// Follow system preference (default)
<ThemeProvider defaultTheme="system">
  <App />
</ThemeProvider>
```

#### `storageKey` (optional)

The key used to store the theme preference in localStorage. Defaults to `'theme'`.

```tsx
// Store theme under a custom key
<ThemeProvider storageKey="my-app-theme">
  <App />
</ThemeProvider>

// This will store the theme as: localStorage.getItem('my-app-theme')
```

#### `themes` (optional)

Array of available theme names. Defaults to `['light', 'dark']`.

```tsx
// Basic themes
<ThemeProvider themes={['light', 'dark']}>
  <App />
</ThemeProvider>

// Custom themes
<ThemeProvider themes={['light', 'dark', 'pink', 'blue', 'green']}>
  <App />
</ThemeProvider>
```

#### `forcedTheme` (optional)

Overrides the user's theme preference. Useful for demo pages or specific routes.

```tsx
// Force dark theme regardless of user preference
<ThemeProvider forcedTheme="dark">
  <App />
</ThemeProvider>

// Force light theme for a specific page
<ThemeProvider forcedTheme="light">
  <App />
</ThemeProvider>
```

#### `enableSystem` (optional)

Whether to enable system theme detection. Defaults to `true`.

```tsx
// Enable system theme (default)
<ThemeProvider enableSystem={true}>
  <App />
</ThemeProvider>

// Disable system theme - only light/dark options
<ThemeProvider enableSystem={false}>
  <App />
</ThemeProvider>
```

#### `disableTransitionOnChange` (optional)

Disables CSS transitions when switching themes to prevent flash. Defaults to `false`.

```tsx
// Disable transitions for instant theme switching
<ThemeProvider disableTransitionOnChange={true}>
  <App />
</ThemeProvider>
```

#### `enableColorScheme` (optional)

Sets the `color-scheme` CSS property for better browser UI integration. Defaults to `true`.

```tsx
// Enable color-scheme (default)
<ThemeProvider enableColorScheme={true}>
  <App />
</ThemeProvider>

// Disable color-scheme
<ThemeProvider enableColorScheme={false}>
  <App />
</ThemeProvider>
```

#### `attribute` (optional)

The HTML attribute to use for theme switching. Defaults to `'data-theme'`.

```tsx
// Use data-theme attribute (default)
<ThemeProvider attribute="data-theme">
  <App />
</ThemeProvider>

// Use class attribute (for Tailwind)
<ThemeProvider attribute="class">
  <App />
</ThemeProvider>

// Use custom data attribute
<ThemeProvider attribute="data-mode">
  <App />
</ThemeProvider>

// Use multiple attributes
<ThemeProvider attribute={['data-theme', 'class']}>
  <App />
</ThemeProvider>
```

#### `value` (optional)

Maps theme names to their corresponding attribute values. Useful for custom theme names.

```tsx
// Basic mapping
<ThemeProvider
  themes={['light', 'dark', 'pink']}
  value={{
    light: 'light',
    dark: 'dark',
    pink: 'pink-theme',
  }}>
  <App />
</ThemeProvider>

// This will set: data-theme="pink-theme" when pink theme is selected
```

#### `nonce` (optional)

Content Security Policy nonce for the injected script.

```tsx
<ThemeProvider nonce="your-csp-nonce">
  <App />
</ThemeProvider>
```

#### `scriptProps` (optional)

Additional props to pass to the injected script element.

```tsx
<ThemeProvider
  scriptProps={{
    'data-testid': 'theme-script',
    'data-version': '1.0.0',
  }}>
  <App />
</ThemeProvider>
```

### ThemeScript Props

The ThemeScript component accepts the same props as ThemeProvider (except `children`). Here are the key ones:

#### `defaultTheme` (required)

The theme to use when no theme is stored in localStorage. This should match your ThemeProvider.

```tsx
// In your root.tsx
<ThemeScript defaultTheme="light" nonce={nonce} />
```

#### `nonce` (optional)

Content Security Policy nonce for the injected script.

```tsx
<ThemeScript defaultTheme="light" nonce="your-csp-nonce" />
```

#### `storageKey` (optional)

The key used to store the theme preference in localStorage. Must match ThemeProvider.

```tsx
<ThemeScript defaultTheme="light" storageKey="my-app-theme" nonce={nonce} />
```

#### `attribute` (optional)

The HTML attribute to use for theme switching. Must match ThemeProvider.

```tsx
// For Tailwind CSS
<ThemeScript
  defaultTheme="light"
  attribute="class"
  nonce={nonce}
/>

// For custom data attribute
<ThemeScript
  defaultTheme="light"
  attribute="data-mode"
  nonce={nonce}
/>
```

#### `enableSystem` (optional)

Whether to enable system theme detection. Must match ThemeProvider.

```tsx
<ThemeScript defaultTheme="light" enableSystem={false} nonce={nonce} />
```

#### `themes` (optional)

Array of available theme names. Must match ThemeProvider.

```tsx
<ThemeScript defaultTheme="light" themes={['light', 'dark', 'pink']} nonce={nonce} />
```

#### `value` (optional)

Maps theme names to their corresponding attribute values. Must match ThemeProvider.

```tsx
<ThemeScript
  defaultTheme="light"
  themes={['light', 'dark', 'pink']}
  value={{
    light: 'light',
    dark: 'dark',
    pink: 'pink-theme',
  }}
  nonce={nonce}
/>
```

## CSS Integration

### Tailwind CSS

The module works seamlessly with Tailwind CSS. Update your `app/styles/root.css`:

```css
@custom-variant dark (&:is([data-theme="dark"] *));
```

### Custom CSS Variables

Use the `data-theme` attribute for theme-specific styles:

```css
/* Light theme (default) */
.theme-alpha {
  --background: #f5f5f7;
  --foreground: #312847;
  /* ... other variables */
}

/* Dark theme */
[data-theme='dark'] .theme-alpha {
  --background: #312847;
  --foreground: #f5f5f7;
  /* ... other variables */
}
```

## Advanced Usage

### Custom Themes

Create multiple theme options with custom names and CSS classes:

```tsx
// Define custom themes
<ThemeProvider
  themes={['light', 'dark', 'pink', 'blue']}
  value={{
    light: 'light',
    dark: 'dark',
    pink: 'pink-theme',
    blue: 'blue-theme'
  }}
>
  <App />
</ThemeProvider>

// Corresponding CSS
[data-theme="pink-theme"] {
  --background: #fdf2f8;
  --foreground: #831843;
  --primary: #ec4899;
}

[data-theme="blue-theme"] {
  --background: #eff6ff;
  --foreground: #1e3a8a;
  --primary: #3b82f6;
}
```

### Forced Theme

Override user preference for specific pages or demos:

```tsx
// Force dark theme for a demo page
<ThemeProvider forcedTheme="dark">
  <DemoPage />
</ThemeProvider>

// Force light theme for a specific route
<ThemeProvider forcedTheme="light">
  <PublicPage />
</ThemeProvider>
```

### Custom Storage Key

Use a custom localStorage key to avoid conflicts with other apps:

```tsx
<ThemeProvider storageKey="datum-staff-portal-theme">
  <App />
</ThemeProvider>

// This stores the theme as: localStorage.getItem('datum-staff-portal-theme')
```

### Disable Transitions

Prevent CSS transitions during theme changes for instant switching:

```tsx
<ThemeProvider disableTransitionOnChange>
  <App />
</ThemeProvider>

// Useful for performance-critical applications
```

### Tailwind CSS Integration

Configure for Tailwind's dark mode:

```tsx
// ThemeProvider
<ThemeProvider attribute="class" defaultTheme="system">
  <App />
</ThemeProvider>

// ThemeScript
<ThemeScript attribute="class" defaultTheme="system" nonce={nonce} />

// tailwind.config.js
module.exports = {
  darkMode: 'class'
}
```

### Multiple Theme Providers

Use different themes for different parts of your app:

```tsx
// Main app with light/dark themes
<ThemeProvider defaultTheme="light">
  <MainApp />
</ThemeProvider>

// Admin panel with forced dark theme
<ThemeProvider forcedTheme="dark" storageKey="admin-theme">
  <AdminPanel />
</ThemeProvider>
```

## Client-Only Components

For components that depend on theme and might cause hydration issues, use the `ClientOnly` wrapper:

```tsx
import { ClientOnly } from '@/modules/datum-themes';

function ThemeDependentComponent() {
  const { resolvedTheme } = useTheme();

  return (
    <ClientOnly fallback={<div>Loading...</div>}>
      <div className={`theme-${resolvedTheme}`}>Theme-dependent content</div>
    </ClientOnly>
  );
}
```

## Migration from remix-themes

### Before (remix-themes)

```tsx
import { Theme, useTheme } from 'remix-themes';

const [theme, setTheme] = useTheme();
setTheme(Theme.LIGHT);
```

### After (datum-themes)

```tsx
import { useTheme } from '@/modules/datum-themes';

const { theme, setTheme } = useTheme();
setTheme('light');
```

## Architecture

### Key Components

1. **ThemeProvider**: Main context provider managing theme state
2. **ThemeScript**: Injected script that prevents flash by setting theme before hydration
3. **useTheme**: Hook providing theme state and actions
4. **ClientOnly**: Utility component for hydration-safe theme-dependent rendering

### How It Works

1. **Server-side**: Renders with default theme (light)
2. **Client-side**:
   - ThemeScript runs immediately in `<head>`
   - Reads theme from localStorage or system preference
   - Applies theme before React hydration
   - No flash occurs

### Storage

- Uses `localStorage` for persistence
- Syncs across browser tabs via `storage` event
- Falls back to system preference if no stored theme

## Troubleshooting

### Hydration Errors

If you see hydration errors, ensure:

1. `suppressHydrationWarning` is added to the `<html>` element
2. Theme-dependent components use `ClientOnly` wrapper
3. ThemeScript is placed in the `<head>` section

### Flash Issues

If you see theme flashing:

1. Ensure ThemeScript is in the `<head>` section
2. Check that the script runs before React hydration
3. Verify CSS variables are properly defined

### TypeScript Errors

If you see TypeScript errors:

1. Ensure proper type imports
2. Use explicit type annotations where needed
3. Check that theme values match the expected types

## Contributing

When modifying the theme system:

1. Maintain TypeScript type safety
2. Test hydration behavior
3. Ensure no-flash functionality
4. Update this README for any API changes

## License

Internal module - part of the Datum Staff Portal project.
