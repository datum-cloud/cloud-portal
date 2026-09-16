import { getBrowser, getIsIpad, getIsStandalone } from './detect';
import { describe, expect, test } from 'bun:test';

const CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const EDGE =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0';
const FIREFOX =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:129.0) Gecko/20100101 Firefox/129.0';
const SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15';
const CRIOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/128.0.0.0 Mobile/15E148 Safari/604.1';
const FXIOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/129.0 Mobile/15E148 Safari/605.1.15';
const ANDROID_FIREFOX = 'Mozilla/5.0 (Android 14; Mobile; rv:129.0) Gecko/129.0 Firefox/129.0';

describe('getBrowser', () => {
  test('detects Chrome, Edge, Firefox, and Safari', () => {
    expect(getBrowser(CHROME)).toBe('chrome');
    expect(getBrowser(EDGE)).toBe('edge');
    expect(getBrowser(FIREFOX)).toBe('firefox');
    expect(getBrowser(SAFARI)).toBe('safari');
  });

  test('treats iOS Chrome and Firefox as their brands, not Safari', () => {
    expect(getBrowser(CRIOS)).toBe('chrome');
    expect(getBrowser(FXIOS)).toBe('firefox');
  });

  test('detects Firefox on Android before any Chrome-like fallback', () => {
    expect(getBrowser(ANDROID_FIREFOX)).toBe('firefox');
  });
});

describe('getIsIpad', () => {
  test('treats a Macintosh UA with a touch screen as iPadOS', () => {
    expect(getIsIpad({ maxTouchPoints: 5, platform: 'MacIntel' })).toBe(true);
  });

  test('does not treat a real Mac or iPhone as an iPad', () => {
    expect(getIsIpad({ maxTouchPoints: 0, platform: 'MacIntel' })).toBe(false);
    expect(getIsIpad({ maxTouchPoints: 5, platform: 'iPhone' })).toBe(false);
  });
});

describe('getIsStandalone', () => {
  const media = (matching: string) => (query: string) => ({ matches: query === matching });

  test('is true for standalone, window-controls-overlay, and minimal-ui', () => {
    expect(getIsStandalone({ matchMedia: media('(display-mode: standalone)') })).toBe(true);
    expect(getIsStandalone({ matchMedia: media('(display-mode: window-controls-overlay)') })).toBe(
      true
    );
    expect(getIsStandalone({ matchMedia: media('(display-mode: minimal-ui)') })).toBe(true);
  });

  test('is true for iOS navigator.standalone even when display-mode is browser', () => {
    expect(
      getIsStandalone({ matchMedia: media('(display-mode: browser)'), standalone: true })
    ).toBe(true);
  });

  test('is false in a normal browser tab', () => {
    expect(
      getIsStandalone({ matchMedia: media('(display-mode: browser)'), standalone: false })
    ).toBe(false);
  });
});
