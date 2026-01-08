import BlankLayout from '@/layouts/blank.layout';
import { createUserService, RegistrationApproval } from '@/resources/users';
import { paths } from '@/utils/config/paths.config';
import { getSession } from '@/utils/cookies';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Card, CardContent } from '@datum-ui/components';
import { Link, MetaFunction, LoaderFunctionArgs, redirect, data } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Waitlist');
});

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Services now use global axios client with AsyncLocalStorage
  const { session } = await getSession(request);
  if (!session || !session?.sub) {
    return redirect(paths.auth.logOut);
  }
  try {
    const userService = createUserService();
    const user = await userService.get(session?.sub);
    // If user is approved, redirect them to the main app
    if (user.registrationApproval === RegistrationApproval.Approved) {
      return redirect(paths.account.organizations.root);
    }
    return data({ user });
  } catch {
    return redirect(paths.auth.logOut);
  }
};

export default function WaitlistPage() {
  return (
    <BlankLayout>
      <Card className="bg-card text-foreground w-full max-w-full rounded-xl border p-3 sm:max-w-[400px] sm:p-4 md:p-6 lg:p-8 xl:p-[44px]">
        <CardContent className="p-0">
          <h2 className="mb-3 text-center text-xl font-medium">You&apos;re on the list!</h2>
          <div className="space-y-2 text-center text-[14px] leading-5 font-normal">
            <p>
              Thanks so much for your interest in Datum Cloud. We&apos;re excited to get you onto
              the platform.
            </p>
            <p>
              Hang tight and be on the lookout for an email notification (we&apos;ll send you a note
              when your account is ready to go).
            </p>
          </div>
          <div className="bg-background mt-6 rounded-xl border p-6 text-center text-[14px] leading-6 font-normal shadow">
            <strong>In the meantime</strong> join us on{' '}
            <Link
              to="https://discord.com/invite/AeA9XZu4Py"
              target="_blank"
              rel="noreferrer"
              className="text-primary font-medium underline">
              Discord
            </Link>
            , drop by an upcoming{' '}
            <Link
              to="https://www.datum.net/community-huddle/"
              target="_blank"
              rel="noreferrer"
              className="text-primary font-medium underline">
              Community Huddle
            </Link>
            , or check out our{' '}
            <Link
              to="https://www.datum.net/docs/"
              target="_blank"
              rel="noreferrer"
              className="text-primary font-medium underline">
              Docs
            </Link>
            .
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
