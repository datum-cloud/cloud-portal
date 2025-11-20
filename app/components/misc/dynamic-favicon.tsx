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
  // Apple touch icons - all sizes
  {
    rel: 'apple-touch-icon' as const,
    sizes: '57x57',
    filename: 'apple-touch-icons/apple-touch-icon-57x57.png',
  },
  {
    rel: 'apple-touch-icon' as const,
    sizes: '60x60',
    filename: 'apple-touch-icons/apple-touch-icon-60x60.png',
  },
  {
    rel: 'apple-touch-icon' as const,
    sizes: '72x72',
    filename: 'apple-touch-icons/apple-touch-icon-72x72.png',
  },
  {
    rel: 'apple-touch-icon' as const,
    sizes: '76x76',
    filename: 'apple-touch-icons/apple-touch-icon-76x76.png',
  },
  {
    rel: 'apple-touch-icon' as const,
    sizes: '114x114',
    filename: 'apple-touch-icons/apple-touch-icon-114x114.png',
  },
  {
    rel: 'apple-touch-icon' as const,
    sizes: '120x120',
    filename: 'apple-touch-icons/apple-touch-icon-120x120.png',
  },
  {
    rel: 'apple-touch-icon' as const,
    sizes: '144x144',
    filename: 'apple-touch-icons/apple-touch-icon-144x144.png',
  },
  {
    rel: 'apple-touch-icon' as const,
    sizes: '152x152',
    filename: 'apple-touch-icons/apple-touch-icon-152x152.png',
  },
  {
    rel: 'apple-touch-icon' as const,
    sizes: '167x167',
    filename: 'apple-touch-icons/apple-touch-icon-167x167.png',
  },
  {
    rel: 'apple-touch-icon' as const,
    sizes: '180x180',
    filename: 'apple-touch-icons/apple-touch-icon-180x180.png',
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
    const existingLinks = document.querySelectorAll('link[rel*="icon"]');
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
