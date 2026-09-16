import { PWA_ICON_VERSION } from '@/features/pwa/theme';
import { buildWebManifest, webManifest } from '@/server/pwa/manifest';
import { describe, expect, test } from 'bun:test';

describe('webManifest', () => {
  test('names the installed app Datum Cloud with a stable id', () => {
    expect(webManifest.name).toBe('Datum Cloud');
    expect(webManifest.short_name).toBe('Datum Cloud');
    expect(webManifest.id).toBe('datum-cloud');
    expect(webManifest.start_url).toBe('/?source=pwa');
  });

  test('cache-busts every icon URL so Chromium does not reuse a stale bitmap', () => {
    expect(webManifest.icons.length).toBeGreaterThan(0);
    for (const icon of webManifest.icons) {
      expect(icon.src).toContain(`?v=${PWA_ICON_VERSION}`);
    }
  });
});

describe('buildWebManifest', () => {
  test('points related_applications at the request origin, not a hardcoded host', () => {
    const manifest = buildWebManifest('https://cloud.datum.net/account/orgs');

    expect(manifest.related_applications).toEqual([
      { platform: 'webapp', url: 'https://cloud.datum.net/manifest.webmanifest' },
    ]);
  });

  test('strips a path and trailing slash from the origin', () => {
    const manifest = buildWebManifest('http://localhost:3000/');

    expect(manifest.related_applications[0]?.url).toBe(
      'http://localhost:3000/manifest.webmanifest'
    );
  });
});
