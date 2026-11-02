/**
 * Sentry session replay, loaded once the browser is idle.
 *
 * Replay (rrweb) is the heaviest part of the Sentry SDK. Ambient sessions are
 * sampled at 1%, so bundling it into the entry chunk made every first paint
 * wait on code most sessions never use. It now arrives the same way Stripe.js
 * does (see `preloadStripeWhenIdle`): after hydration, when the main thread is
 * free.
 *
 * The bundle comes from Sentry's CDN at the exact SDK version
 * (`lazyLoadIntegration`). The CSP permits it two ways: `'strict-dynamic'`
 * trusts a script element that our nonced bundle inserts (CSP3 browsers ignore
 * host lists when it is present), and `script-src-elem` lists
 * browser.sentry-cdn.com for browsers that only understand host lists.
 * The sample rates stay in `Sentry.init` (entry.client.tsx); replay reads them
 * when it is added.
 *
 * Trade-off: an error thrown before the idle callback fires has no replay
 * buffered yet. Errors are still captured; only that early replay is lost.
 */
import * as Sentry from '@sentry/react-router';

/**
 * Session replay masks all text, inputs and media. A selector list misses
 * revealed passwords and secrets rendered as plain text, so nothing is
 * unmasked by default.
 */
export const REPLAY_OPTIONS = {
  maskAllText: true,
  maskAllInputs: true,
  blockAllMedia: true,

  // Block entire sections from replay
  block: ['[data-sentry-block]'],
} satisfies Parameters<typeof Sentry.replayIntegration>[0];

const IDLE_TIMEOUT_MS = 5000;
const FALLBACK_DELAY_MS = 2000;

/** Runs `task` when the browser is idle; returns a cleanup that cancels it. */
export function runWhenIdle(task: () => void): () => void {
  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(task, { timeout: IDLE_TIMEOUT_MS });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(task, FALLBACK_DELAY_MS);
  return () => clearTimeout(id);
}

/**
 * The parts of the Sentry SDK replay loading uses. A parameter so tests can
 * drive it: under `bun test` the package resolves to its server build, which
 * has no `lazyLoadIntegration` at all.
 */
export type ReplaySdk = Pick<typeof Sentry, 'getClient' | 'lazyLoadIntegration' | 'addIntegration'>;

/**
 * Named members only. Passing the `Sentry` namespace itself as a value would
 * stop the bundler tree-shaking it and pull replay back into the entry chunk.
 */
function defaultSdk(): ReplaySdk {
  return {
    getClient: Sentry.getClient,
    lazyLoadIntegration: Sentry.lazyLoadIntegration,
    addIntegration: Sentry.addIntegration,
  };
}

let replayRequested = false;

/**
 * Fetches the replay integration and adds it to the running Sentry client.
 * A no-op without a DSN (local dev, tests) and once a load is in flight or
 * done. A failed load releases the latch, so a later call may try again.
 */
export async function addReplayIntegration(
  nonce?: string,
  sdk: ReplaySdk = defaultSdk()
): Promise<void> {
  if (replayRequested || !sdk.getClient()?.getDsn()) return;
  replayRequested = true;

  try {
    const replayIntegration = await sdk.lazyLoadIntegration('replayIntegration', nonce);
    sdk.addIntegration(replayIntegration(REPLAY_OPTIONS));
  } catch {
    // Replay is a debugging aid: a blocked or unreachable CDN (ad blockers do
    // this routinely) must not affect the page, and error reporting carries on
    // without it. Reporting the failure to Sentry would only add noise.
    replayRequested = false;
  }
}

/** Schedules replay to load once the browser is idle; returns a cleanup. */
export function loadReplayWhenIdle(nonce?: string): () => void {
  return runWhenIdle(() => void addReplayIntegration(nonce));
}
