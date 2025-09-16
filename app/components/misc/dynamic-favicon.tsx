import { useSystemTheme } from '@/hooks/useSystemTheme';
import * as React from 'react';

// Favicon configuration for responsive theme support
const FAVICON_CONFIGS = [
  {
    rel: 'apple-touch-icon' as const,
    sizes: '180x180',
    filename: 'apple-touch-icon.png',
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
    sizes: '16x16',
    filename: 'favicon-16x16.png',
  },
  {
    rel: 'icon' as const,
    sizes: 'any',
    filename: 'favicon.ico',
  },
  // {
  //   rel: 'manifest' as const,
  //   filename: 'site.webmanifest',
  // },
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

      // Choose favicon based on system theme
      // Dark favicon for light theme, light favicon for dark theme
      const themeFolder = isDarkMode ? 'light' : 'dark';
      link.href = `/favicons/${themeFolder}/${config.filename}`;

      // Add the link to the document head
      document.head.appendChild(link);
    });
  }, [isDarkMode]);

  // Return static links for SSR (will be replaced by useEffect on client)
  return <></>;
};
