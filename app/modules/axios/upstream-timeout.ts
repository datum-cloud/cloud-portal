/**
 * How long the BFF waits on the API server or the GraphQL gateway before it
 * gives up. Shared by the server axios instance and the raw `fetch` proxies so
 * every upstream path fails on the same clock.
 */
export const UPSTREAM_TIMEOUT_MS = 60_000;
