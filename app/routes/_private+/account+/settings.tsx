import { PageTitle } from '@/components/page-title/page-title';
import { routes } from '@/constants/routes';
import { AccountGeneralCard } from '@/features/account/settings/general-card';
import { validateCSRF } from '@/modules/cookie/csrf.server';
import { getSession } from '@/modules/cookie/session.server';
import { dataWithToast } from '@/modules/cookie/toast.server';
import { useApp } from '@/providers/app.provider';
import { createUserControl } from '@/resources/control-plane/user.control';
import { userSchema } from '@/resources/schemas/user.schema';
import { mergeMeta, metaObject } from '@/utils/meta';
import { parseWithZod } from '@conform-to/zod';
import { Client } from '@hey-api/client-axios';
import { useEffect } from 'react';
import {
  ActionFunctionArgs,
  AppLoadContext,
  MetaFunction,
  redirect,
  useActionData,
} from 'react-router';

export const handle = {
  breadcrumb: () => <span>Account settings</span>,
};

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Account settings');
});

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const { session } = await getSession(request);

  if (!session || !session?.sub) {
    return redirect(routes.auth.logOut);
  }

  const clonedRequest = request.clone();
  const formData = await clonedRequest.formData();

  try {
    await validateCSRF(formData, clonedRequest.headers);

    const parsed = parseWithZod(formData, { schema: userSchema });

    if (parsed.status !== 'success') {
      throw new Error('Invalid form data');
    }

    const { controlPlaneClient } = context as AppLoadContext;
    const userControl = createUserControl(controlPlaneClient as Client);

    const res = await userControl.update(session?.sub, parsed.value);

    return dataWithToast(res, {
      title: 'Profile updated successfully',
      description: 'You have successfully updated your profile.',
      type: 'success',
    });
  } catch (error) {
    return dataWithToast(null, {
      title: 'Error',
      description: error instanceof Error ? error.message : (error as Response).statusText,
      type: 'error',
    });
  }
};

export default function AccountSettingsPage() {
  const user = useActionData<typeof action>();

  const { setUser } = useApp();

  useEffect(() => {
    if (user) {
      setUser(user);
    }
  }, [user]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageTitle title="Account settings" />
      {/* Project Name Section */}
      <AccountGeneralCard />
    </div>
  );
}
