import { PWA_SPLASH_LINKS } from './pwa-splash-links.data';
import {
  PWA_ICON_VERSION,
  PWA_THEME_COLOR_DARK,
  PWA_THEME_COLOR_LIGHT,
} from '@/features/pwa/theme';
import { useTheme } from '@datum-cloud/datum-ui/theme';
import { useEffect, useLayoutEffect } from 'react';
import { useLocation, useNavigation } from 'react-router';

export const PwaMetaTags = ({ themeColor = PWA_THEME_COLOR_LIGHT }: { themeColor?: string }) => (
  <>
    {/* No-media tag is the live title-bar color; applyPwaThemeColor keeps it
        matching the painted background after hydration and navigations. */}
    <meta name="theme-color" content={themeColor} />
    <meta
      name="theme-color"
      content={PWA_THEME_COLOR_LIGHT}
      media="(prefers-color-scheme: light)"
    />
    <meta name="theme-color" content={PWA_THEME_COLOR_DARK} media="(prefers-color-scheme: dark)" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Datum Cloud" />
    <link rel="apple-touch-icon" href={`/favicons/icon-192.png?v=${PWA_ICON_VERSION}`} />
  </>
);

/** Write a Chrome-parseable `theme-color` from the painted page background. */
export function applyPwaThemeColor(resolvedTheme?: string) {
  if (typeof document === 'undefined') return;

  const fallback = resolvedTheme === 'dark' ? PWA_THEME_COLOR_DARK : PWA_THEME_COLOR_LIGHT;
  const computed = getComputedStyle(document.documentElement).backgroundColor;
  const color =
    computed && computed !== 'transparent' && computed !== 'rgba(0, 0, 0, 0)' ? computed : fallback;

  let meta = document.querySelector('meta[name="theme-color"]:not([media])');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  if (meta.getAttribute('content') !== color) {
    meta.setAttribute('content', color);
  }
}

/**
 * Re-apply `theme-color` after theme changes and after client navigations.
 * Chrome samples the title bar during route transitions (nprogress at the
 * top) and will not restore it unless the meta tag is written again.
 */
export const PwaThemeColorSync = () => {
  const { resolvedTheme } = useTheme();
  const location = useLocation();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    if (navigation.state !== 'idle') return;

    applyPwaThemeColor(resolvedTheme);
    const frame = requestAnimationFrame(() => applyPwaThemeColor(resolvedTheme));
    const timeout = window.setTimeout(() => applyPwaThemeColor(resolvedTheme), 0);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [resolvedTheme, location.key, navigation.state]);

  return null;
};

export const PwaSplashLinks = () => (
  <>
    {PWA_SPLASH_LINKS.map((link) => (
      <link
        key={`${link.href}:${link.media}`}
        rel="apple-touch-startup-image"
        href={link.href}
        media={link.media}
      />
    ))}
  </>
);

/** Shown in standalone until the client paints. macOS has no startup-image splash. */
export const PwaLaunchSplash = () => {
  useEffect(() => {
    document.documentElement.setAttribute('data-pwa-ready', '');
  }, []);

  return (
    <div aria-hidden className="pwa-launch-splash">
      <img src="/images/logo-mark.svg" alt="" width={160} height={161} />
    </div>
  );
};
