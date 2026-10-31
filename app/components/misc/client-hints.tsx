/**
 * This file contains utilities for using client hints for user preference which
 * are needed by the server, but are only known by the browser.
 */
import { DESKTOP_MIN, TABLET_MIN, isBreakpoint, type Breakpoint } from '@/hooks/use-breakpoint';
import { getHintUtils } from '@epic-web/client-hints';
import {
  clientHint as colorSchemeHint,
  subscribeToSchemeChange,
} from '@epic-web/client-hints/color-scheme';
import { clientHint as timeZoneHint } from '@epic-web/client-hints/time-zone';
import * as React from 'react';
import { useRevalidator } from 'react-router';

/**
 * Viewport width, bucketed into the `useBreakpoint` tiers so the server can
 * render the dashboard for the real screen instead of assuming desktop.
 *
 * The cookie holds the tier, not the pixel width. The check script reloads the
 * page whenever the cookie disagrees with the browser, so a raw width would
 * force a reload after every window resize. A tier only changes when the
 * layout would.
 */
export const viewportHint = {
  cookieName: 'CH-viewport',
  getValueCode: `(function (w) { return w < ${TABLET_MIN} ? 'mobile' : w < ${DESKTOP_MIN} ? 'tablet' : 'desktop'; })(window.innerWidth)`,
  fallback: 'desktop',
  transform: (value: string): Breakpoint => (isBreakpoint(value) ? value : 'desktop'),
} as const;

const hintsUtils = getHintUtils({
  theme: colorSchemeHint,
  timeZone: timeZoneHint,
  viewport: viewportHint,
  // add other hints here
});

export const { getHints } = hintsUtils;

/**
 * @returns inline script element that checks for client hints and sets cookies
 * if they are not set then reloads the page if any cookie was set to an
 * inaccurate value.
 */
export function ClientHintCheck({ nonce }: { nonce: string }) {
  const { revalidate } = useRevalidator();
  React.useEffect(() => subscribeToSchemeChange(() => revalidate()), [revalidate]);

  // Ensure nonce is always a string to match server rendering
  const nonceValue = nonce || '';

  return (
    <script
      nonce={nonceValue}
      dangerouslySetInnerHTML={{
        __html: hintsUtils.getClientHintCheckScript(),
      }}
    />
  );
}
