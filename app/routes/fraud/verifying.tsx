import BlankLayout from '@/layouts/blank.layout';
import { paths } from '@/utils/config/paths.config';
import { getSession } from '@/utils/cookies';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { useEffect } from 'react';
import { Link, MetaFunction, LoaderFunctionArgs, redirect } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Verifying Your Account');
});

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await getSession(request);
  if (!session?.sub) {
    return redirect(paths.auth.logOut);
  }
  return null;
};

export default function VerifyingPage() {
  useEffect(() => {
    let stopped = false;

    const poll = async () => {
      if (stopped) return;

      try {
        const response = await fetch(paths.fraud.statusApi);

        if (!response.ok) {
          return;
        }

        const result = await response.json();

        if (result.status === 'completed') {
          const decision = result.decision;

          if (decision === 'REVIEW') {
            window.location.replace(paths.fraud.accountUnderReview);
          } else if (decision === 'DEACTIVATE') {
            window.location.replace(paths.fraud.accountSuspended);
          } else {
            // ACCEPTED or unknown — approved, navigate to the platform
            window.location.replace(paths.account.organizations.root);
          }
        }
        // If status === 'pending', continue polling
      } catch {
        // Fail silently — continue polling on network errors
      }
    };

    poll(); // fire immediately — don't wait 4s if evaluation is already ready
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
          <h2 className="mb-3 text-center text-xl font-medium">Verifying your account</h2>
          <p className="text-center text-[14px] leading-5 font-normal">
            We&apos;re running a quick security check. This usually takes less than 30 seconds.
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
