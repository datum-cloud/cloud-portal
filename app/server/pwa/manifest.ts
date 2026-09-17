import {
  PWA_ICON_VERSION,
  PWA_THEME_COLOR_DARK,
  PWA_THEME_COLOR_LIGHT,
} from '@/features/pwa/theme';

export { PWA_THEME_COLOR_DARK, PWA_THEME_COLOR_LIGHT };

const icon = (file: string) => `/favicons/${file}?v=${PWA_ICON_VERSION}`;

export const webManifest = {
  name: 'Datum Cloud',
  short_name: 'Datum Cloud',
  id: 'datum-cloud',
  start_url: '/?source=pwa',
  scope: '/',
  display: 'standalone',
  display_override: ['window-controls-overlay', 'standalone'],
  orientation: 'any',
  // Manifest cannot vary with prefers-color-scheme. Keep the light canvas so a
  // dark OS does not paint navy under a user who still resolves to light.
  background_color: PWA_THEME_COLOR_LIGHT,
  theme_color: PWA_THEME_COLOR_LIGHT,
  icons: [
    {
      src: icon('icon-192.png'),
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: icon('icon-512.png'),
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: icon('icon-1024.png'),
      sizes: '1024x1024',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: icon('maskable-192.png'),
      sizes: '192x192',
      type: 'image/png',
      purpose: 'maskable',
    },
    {
      src: icon('maskable-512.png'),
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
};

export function buildWebManifest(requestUrl: string) {
  const origin = new URL(requestUrl).origin;
  return {
    ...webManifest,
    related_applications: [{ platform: 'webapp', url: `${origin}/manifest.webmanifest` }],
  };
}
