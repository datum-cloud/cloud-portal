import { Card, CardContent } from '@/components/ui/card';
import BlankLayout from '@/layouts/blank/blank.layout';
import { getSession } from '@/modules/cookie/session.server';
import { createUserControl } from '@/resources/control-plane';
import { RegistrationApproval } from '@/resources/interfaces/user.interface';
import { paths } from '@/utils/config/paths.config';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Client } from '@hey-api/client-axios';
import { Link, MetaFunction, LoaderFunctionArgs, redirect } from 'react-router';
import { AppLoadContext, data } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Waitlist');
});

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;
  const { session } = await getSession(request);
  if (!session || !session?.sub) {
    return redirect(paths.auth.logOut);
  }
  try {
    const userControl = createUserControl(controlPlaneClient as Client);
    const user = await userControl.detail(session?.sub);
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
      <Card className="dark:border-navy w-full max-w-md rounded-lg border py-11 shadow-none">
        <CardContent className="text-navy dark:text-cream px-9">
          <h2 className="mb-4 text-center text-2xl font-medium">You&apos;re on the list!</h2>
          <div className="space-y-2 text-center text-sm leading-6 font-normal">
            <p>
              Thanks so much for your interest in Datum Cloud. We&apos;re excited to get you onto
              the platform.
            </p>
            <p>
              Hang tight and be on the lookout for an email notification (we&apos;ll send you a note
              when your account is ready to go). We&apos;ll be in touch soon!
            </p>
          </div>
          <div className="border-light-gray dark:border-navy dark:bg-navy mt-5 rounded-lg border bg-white p-5 text-center text-sm leading-6 font-normal shadow-sm">
            In the meantime, join us on{' '}
            <Link
              to="https://discord.com/invite/AeA9XZu4Py"
              target="_blank"
              rel="noreferrer"
              className="text-tuscany font-semibold underline">
              Discord
            </Link>
            , drop by an upcoming{' '}
            <Link
              to="https://www.datum.net/community-huddle/"
              target="_blank"
              rel="noreferrer"
              className="text-tuscany font-semibold underline">
              Community Huddle
            </Link>
            , or check out <br />
            our{' '}
            <Link
              to="https://www.datum.net/docs/"
              target="_blank"
              rel="noreferrer"
              className="text-tuscany font-semibold underline">
              Docs
            </Link>
            .
          </div>
          <div className="mt-6 text-center">
            <Link
              to={paths.auth.logOut}
              className="dark:text-cream dark:hover:text-cream text-sm text-gray-600 underline hover:text-gray-900">
              Log out
            </Link>
          </div>
        </CardContent>
      </Card>
    </BlankLayout>
  );
}
