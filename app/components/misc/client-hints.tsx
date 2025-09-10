/**
 * This file contains utilities for using client hints for user preference which
 * are needed by the server, but are only known by the browser.
 */
import { getHintUtils } from '@epic-web/client-hints';
import {
  clientHint as colorSchemeHint,
  subscribeToSchemeChange,
} from '@epic-web/client-hints/color-scheme';
import { clientHint as timeZoneHint } from '@epic-web/client-hints/time-zone';
import * as React from 'react';
import { useRevalidator } from 'react-router';

const hintsUtils = getHintUtils({
  theme: colorSchemeHint,
  timeZone: timeZoneHint,
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
