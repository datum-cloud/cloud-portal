import BlankLayout from '@/layouts/blank.layout';
import { requireSessionSub } from '@/utils/auth/require-session.server';
import { paths } from '@/utils/config/paths.config';
import {
  fetchFraudStatus,
  resolveVerifyingDestination,
  startStatusPoll,
  VERIFYING_POLL_MS,
} from '@/utils/fraud/status-poll';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { useEffect } from 'react';
import { Link, MetaFunction, LoaderFunctionArgs } from 'react-router';

// A read, not a refresh. The decision this page waits on is the user's
// platform access, which the status endpoint reads from the API on every call.
// Without `refresh=0` each 4s tick also redeemed and rotated the refresh
// token. An access token that expires mid-wait is still renewed by the session
// middleware. /verify-email is the opposite case and must keep the refresh.
const STATUS_URL = `${paths.fraud.statusApi}?refresh=0`;

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Verifying Your Account');
});

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  await requireSessionSub(request, context);
  return null;
};

export default function VerifyingPage() {
  useEffect(
    () =>
      // Guarded rather than setInterval: a status read slower than the interval
      // used to overlap the next one. The loop waits for each read to settle,
      // stops once the evaluation completes, and aborts on unmount.
      startStatusPoll({
        fetchStatus: (signal) => fetchFraudStatus(signal, STATUS_URL),
        onResult: (result) => {
          const destination = resolveVerifyingDestination(result);
          if (!destination) return false; // still pending, keep polling
          window.location.replace(destination);
          return true;
        },
        delayMs: () => VERIFYING_POLL_MS,
      }),
    []
  );

  return (
    <BlankLayout>
      <Card className="bg-card text-foreground z-10 w-full max-w-full p-3 sm:max-w-sm sm:p-4 md:p-6 lg:p-8 xl:p-11">
        <CardContent className="p-0">
          <div className="mb-4 flex justify-center" aria-hidden="true">
            <svg
              className="text-primary h-8 w-8 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-label="Loading spinner">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <Title as="h2" level={4} weight="medium" className="mb-3 text-center">
            Verifying your account
          </Title>
          <Text as="p" weight="normal" className="text-center leading-5">
            We&apos;re running a quick security check. This usually takes less than 30 seconds.
          </Text>
          <div className="mt-6 text-center">
            <Link
              to={paths.auth.logOut}
              className="dark:text-foreground dark:hover:text-foreground text-sm text-gray-600 underline hover:text-gray-900">
              Log out
            </Link>
          </div>
        </CardContent>
      </Card>
    </BlankLayout>
  );
}
