import { useSystemTheme } from '@/hooks/useSystemTheme';
import * as React from 'react';

// Favicon configuration for responsive theme support
const FAVICON_CONFIGS = [
  // Standard favicons - all sizes
  {
    rel: 'icon' as const,
    type: 'image/png',
    sizes: '16x16',
    filename: 'favicon-16x16.png',
  },
  {
    rel: 'icon' as const,
    type: 'image/png',
    sizes: '32x32',
    filename: 'favicon-32x32.png',
  },
  {
    rel: 'icon' as const,
    type: 'image/png',
    sizes: '96x96',
    filename: 'favicon-96x96.png',
  },
  {
    rel: 'icon' as const,
    type: 'image/png',
    sizes: '128x128',
    filename: 'favicon-128x128.png',
  },
  {
    rel: 'icon' as const,
    type: 'image/png',
    sizes: '196x196',
    filename: 'favicon-196x196.png',
  },
  {
    rel: 'icon' as const,
    sizes: 'any',
    filename: 'favicon.ico',
  },
] as const;

// Microsoft tile configuration (uses meta tags, not link tags)
const MSTILE_CONFIGS = [
  {
    name: 'msapplication-TileImage',
    filename: 'mstile/mstile-144x144.png',
  },
  {
    name: 'msapplication-square70x70logo',
    filename: 'mstile/mstile-70x70.png',
  },
  {
    name: 'msapplication-square150x150logo',
    filename: 'mstile/mstile-150x150.png',
  },
  {
    name: 'msapplication-wide310x150logo',
    filename: 'mstile/mstile-310x150.png',
  },
  {
    name: 'msapplication-square310x310logo',
    filename: 'mstile/mstile-310x310.png',
  },
] as const;

/**
 * Dynamically updates favicon based on system theme changes
 * Uses matchMedia to detect system theme preferences and automatically
 * switches between light and dark favicons accordingly.
 */
export const DynamicFaviconLinks = () => {
  const isDarkMode = useSystemTheme();

  React.useEffect(() => {
    // Only run in browser environment
    if (typeof document === 'undefined') return;

    // Remove existing favicon links to avoid duplicates
    // Only swap favicon / apple-touch-icon links. The attribute selector
    // `rel*="icon"` would also match `apple-touch-startup-image` splash links.
    const existingLinks = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
    existingLinks.forEach((link) => link.remove());

    // Remove existing Microsoft tile meta tags
    const existingMetaTiles = document.querySelectorAll('meta[name*="msapplication"]');
    existingMetaTiles.forEach((meta) => meta.remove());

    // Choose favicon based on system theme
    // Dark favicon for light theme, light favicon for dark theme
    const themeFolder = isDarkMode ? 'light' : 'dark';

    // Add new favicon links based on current theme
    FAVICON_CONFIGS.forEach((config) => {
      const link = document.createElement('link');
      link.rel = config.rel;

      if ('type' in config) {
        link.type = config.type;
      }
      if ('sizes' in config) {
        link.setAttribute('sizes', config.sizes);
      }

      link.href = `/favicons/${themeFolder}/${config.filename}`;

      // Add the link to the document head
      document.head.appendChild(link);
    });

    // Add Microsoft tile meta tags
    MSTILE_CONFIGS.forEach((config) => {
      const meta = document.createElement('meta');
      meta.name = config.name;
      meta.content = `/favicons/${themeFolder}/${config.filename}`;
      document.head.appendChild(meta);
    });
  }, [isDarkMode]);

  // Return static links for SSR (will be replaced by useEffect on client)
  return <></>;
};
