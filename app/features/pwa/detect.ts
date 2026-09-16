export type PwaBrowser = 'chrome' | 'edge' | 'safari' | 'firefox' | 'other';

export function getBrowser(userAgent?: string): PwaBrowser {
  const ua = userAgent ?? (typeof navigator === 'undefined' ? '' : navigator.userAgent);
  if (!ua) return 'other';
  if (/Edg\//i.test(ua) || /EdgiOS/i.test(ua)) return 'edge';
  if (/Firefox\//i.test(ua) || /FxiOS/i.test(ua)) return 'firefox';
  if (/Chrome\//i.test(ua) || /CriOS/i.test(ua)) return 'chrome';
  if (/Safari/i.test(ua)) return 'safari';
  return 'other';
}

export function getIsIpad(nav?: Pick<Navigator, 'maxTouchPoints' | 'platform'>): boolean {
  const n = nav ?? (typeof navigator === 'undefined' ? undefined : navigator);
  if (!n) return false;
  return n.maxTouchPoints > 1 && /MacIntel/.test(n.platform);
}

type StandaloneProbe = {
  matchMedia: (query: string) => Pick<MediaQueryList, 'matches'>;
  standalone?: boolean;
};

export function getIsStandalone(probe?: StandaloneProbe): boolean {
  const media =
    probe?.matchMedia ??
    (typeof window === 'undefined' ? undefined : window.matchMedia.bind(window));
  if (!media) return false;

  const standalone =
    probe?.standalone ??
    (typeof navigator === 'undefined'
      ? false
      : Boolean((navigator as Navigator & { standalone?: boolean }).standalone));

  return (
    media('(display-mode: standalone)').matches ||
    media('(display-mode: window-controls-overlay)').matches ||
    media('(display-mode: minimal-ui)').matches ||
    standalone === true
  );
}
