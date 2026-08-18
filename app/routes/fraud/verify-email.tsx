import BlankLayout from '@/layouts/blank.layout';
import { createUserService } from '@/resources/users';
import { paths } from '@/utils/config/paths.config';
import { getSession } from '@/utils/cookies';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import {
  isAwaitingEmailVerification,
  resolveVerifyEmailPageRedirect,
  type FraudPollResult,
} from '@/utils/middlewares/fraud-redirect';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { useEffect } from 'react';
import { Link, MetaFunction, LoaderFunctionArgs, redirect } from 'react-router';

const SUPPORT_EMAIL = 'support@datum.net';

/**
 * How often to re-check, by how long the page has been open.
 *
 * Fast while the user is plausibly clicking the link right now, then slower —
 * unlike /verifying, which waits on a machine and promises "under 30 seconds",
 * this page waits on a human finding an email. A flat 4s tick left open for an
 * hour is ~900 requests that learn nothing.
 */
// Wider than /verifying's intervals because each tick now costs a
// refresh_token grant and a cookie rotation, not just a read.
const POLL_SCHEDULE = [
  { withinMs: 60_000, everyMs: 10_000 },
  { withinMs: 300_000, everyMs: 20_000 },
];
const POLL_FALLBACK_MS = 60_000;

const pollDelayFor = (elapsedMs: number): number =>
  POLL_SCHEDULE.find((step) => elapsedMs < step.withinMs)?.everyMs ?? POLL_FALLBACK_MS;

// No `refresh=0` here, deliberately. Verification is an id_token claim, so it
// only changes when a new token is issued — polling without the refresh
// re-reads the same stale `false` forever.
const STATUS_URL = paths.fraud.statusApi;

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Verify Your Email');
});

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await getSession(request);

  if (!session?.sub) {
    return redirect(paths.auth.logOut);
  }

  // `null` means "could not read the user", which renders the page. Passing the
  // caught error through as a user would be the bug: an outage must not open
  // the gate. See resolveVerifyEmailPageRedirect.
  let user: { emailVerified?: boolean } | null = null;
  try {
    user = await createUserService().get(session.sub);
  } catch {
    user = null;
  }

  const away = resolveVerifyEmailPageRedirect(user);
  return away ? redirect(away) : null;
};

export default function VerifyEmailPage() {
  useEffect(() => {
    let stopped = false;
    let timerId: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    // Self-scheduling rather than setInterval: the next tick is only queued
    // once the previous one has settled, so a slow response cannot stack
    // requests on top of each other.
    const poll = async () => {
      if (stopped) return;

      try {
        const response = await fetch(STATUS_URL, { credentials: 'include' });

        if (response.ok) {
          const result = (await response.json()) as FraudPollResult;

          // Anything other than "still waiting on the address" means it is
          // proven. Where to go next is deliberately NOT decided here:
          // /verifying re-derives its destination client-side because its poll
          // hands it a `redirectTo`; this page has no such target, and
          // re-implementing the cascade in the browser is how the two copies
          // drift. One hop through the server re-runs the redirect cascade and
          // lands the user wherever it says — /verifying if staff review is
          // still pending, onboarding if approved.
          if (!isAwaitingEmailVerification(result)) {
            window.location.replace(paths.home);
            return; // navigating away — do not reschedule
          }
        }
      } catch {
        // Network error — say nothing and let the next tick retry.
      }

      if (!stopped) {
        timerId = setTimeout(poll, pollDelayFor(Date.now() - startedAt));
      }
    };

    poll(); // fire immediately — don't wait if the link was already clicked

    return () => {
      stopped = true;
      clearTimeout(timerId);
    };
  }, []);

  return (
    <BlankLayout>
      <Card className="bg-card text-foreground z-10 w-full max-w-full rounded-xl border p-3 sm:max-w-sm sm:p-4 md:p-6 lg:p-8 xl:p-11">
        <CardContent className="p-0">
          <h2 className="mb-3 text-center text-xl font-medium">Check your email</h2>
          <p role="status" className="text-center text-[14px] leading-5 font-normal">
            We sent a verification link to your email address. Open it to continue — this page
            updates on its own once you have.
          </p>
          <p className="text-muted-foreground mt-4 text-center text-[13px] leading-5">
            Didn&apos;t get it? Check your spam folder, or contact{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
          <div className="mt-6 text-center">
            <Link
              to={paths.auth.logOut}
              className="dark:text-foreground dark:hover:text-foreground text-[14px] text-gray-600 underline hover:text-gray-900">
              Log out
            </Link>
          </div>
        </CardContent>
      </Card>
    </BlankLayout>
  );
}
