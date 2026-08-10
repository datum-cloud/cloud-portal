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

    const poll = async () => {
      if (stopped) return;

      try {
        const response = await fetch(paths.fraud.statusApi, { credentials: 'include' });

        if (!response.ok) {
          return;
        }

        const result = (await response.json()) as FraudPollResult;

        // Still waiting on the address — keep polling.
        if (isAwaitingEmailVerification(result)) {
          return;
        }

        // Anything else means the address is proven. Where to go next is
        // deliberately NOT decided here. /verifying re-derives its destination
        // client-side because its poll hands it a `redirectTo`; this page has no
        // such target, and re-implementing the cascade in the browser is how the
        // two copies drift. One hop through the server re-runs
        // resolveUserFraudRedirectPath and lands the user wherever it says —
        // /verifying if staff review is still pending, onboarding if approved.
        window.location.replace(paths.home);
      } catch {
        // Fail silently — continue polling on network errors
      }
    };

    poll(); // fire immediately — don't wait 4s if the link was already clicked
    const intervalId = setInterval(poll, 4000);

    return () => {
      stopped = true;
      clearInterval(intervalId);
    };
  }, []);

  return (
    <BlankLayout>
      <Card className="bg-card text-foreground z-10 w-full max-w-full rounded-xl border p-3 sm:max-w-sm sm:p-4 md:p-6 lg:p-8 xl:p-11">
        <CardContent className="p-0">
          <h2 className="mb-3 text-center text-xl font-medium">Check your email</h2>
          <p className="text-center text-[14px] leading-5 font-normal">
            We sent a verification link to your email address. Open it to continue — this page
            updates on its own once you have.
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
