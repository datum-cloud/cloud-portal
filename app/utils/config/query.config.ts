/** Default stale time for resource queries (5 minutes). */
export const QUERY_STALE_TIME = 5 * 60 * 1000;

/** Download base URL for Datum Desktop connector app. */
export const DATUM_DESKTOP_DOWNLOAD_URL = 'https://datum.net/download';

/** Install page for the Datum CLI (`datumctl`). */
export const DATUMCTL_DOWNLOAD_URL = 'https://datum.net/download/datumctl';

/** Lists with no watch get no pushed changes, so they go stale fast and refetch on focus. */
export const UNWATCHED_LIST_QUERY_OPTIONS = {
  staleTime: 30_000,
  refetchOnWindowFocus: true,
} as const;
