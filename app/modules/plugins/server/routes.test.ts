/// <reference types="bun-types/test" />
import { isHashedAsset } from './routes';
import { describe, expect, test } from 'bun:test';

describe('isHashedAsset', () => {
  test('treats content-hashed chunks under assets/ as safe to cache forever', () => {
    expect(isHashedAsset('assets/workload-list-B5GXmtQc.js')).toBe(true);
    expect(isHashedAsset('assets/index-78ywSFxD.js')).toBe(true);
  });

  test('treats fixed-name entry points as not safe to cache forever', () => {
    // These keep the same URL across every build, so a browser that cached
    // them long-lived would never see a redeploy without a manual hard
    // refresh — the exact bug this guards against.
    expect(isHashedAsset('remoteEntry.js')).toBe(false);
    expect(isHashedAsset('remoteEntry.ssr.js')).toBe(false);
    expect(isHashedAsset('plugin-manifest.json')).toBe(false);
    expect(isHashedAsset('mf-manifest.json')).toBe(false);
    expect(isHashedAsset('mf-stats.json')).toBe(false);
    expect(isHashedAsset('index.html')).toBe(false);
  });

  test('does not treat a path merely containing "assets" as hashed', () => {
    expect(isHashedAsset('my-assets/foo.js')).toBe(false);
  });
});
