import BlankLayout from '@/layouts/blank.layout';
import { createUserService } from '@/resources/users';
import { paths } from '@/utils/config/paths.config';
import { getSession } from '@/utils/cookies';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Link, MetaFunction, LoaderFunctionArgs, redirect } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Account Suspended');
});

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await getSession(request);

  if (!session?.sub) {
    return redirect(paths.auth.logOut);
  }

  try {
    const user = await createUserService().get(session.sub);

    // If the user is no longer Inactive, the suspension has been lifted —
    // redirect forward so the user can access the platform.
    if (user.state !== 'Inactive') {
      return redirect(paths.home);
    }
  } catch {
    // Fail-open: if the user API is unavailable, keep showing this page
  }

  return null;
};

export default function AccountSuspendedPage() {
  return (
    <BlankLayout>
      <Card className="bg-card text-foreground z-10 w-full max-w-full rounded-xl border p-3 sm:max-w-sm sm:p-4 md:p-6 lg:p-8 xl:p-11">
        <CardContent className="p-0">
          <h2 className="mb-3 text-center text-xl font-medium">Your account has been suspended</h2>
          <p className="text-center text-[14px] leading-5 font-normal">
            Your account has been flagged and suspended. If you believe this is an error, please
            contact support.
          </p>
          <div className="mt-4 text-center">
            <a
              href="mailto:support@datum.net"
              className="text-primary text-[14px] font-medium underline">
              support@datum.net
            </a>
          </div>
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
