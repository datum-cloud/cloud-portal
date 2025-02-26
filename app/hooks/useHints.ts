/**
 * Client Hints MDX:
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Client_hints
 */
import { useRequestInfo } from '@/hooks/useRequestInfo'
import { getHintUtils } from '@epic-web/client-hints'
import { clientHint as colorSchemeHint } from '@epic-web/client-hints/color-scheme'
import { clientHint as timeZoneHint } from '@epic-web/client-hints/time-zone'

export const hintsUtils = getHintUtils({
  theme: colorSchemeHint,
  timeZone: timeZoneHint,
})
export const { getHints } = hintsUtils

export function useHints() {
  const requestInfo = useRequestInfo()
  return requestInfo.hints
}
