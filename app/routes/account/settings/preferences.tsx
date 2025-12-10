import { PageTitle } from '@/components/page-title/page-title';
import { AccountDangerSettingsCard } from '@/features/account/settings/danger-card';
import { AccountIdentitySettingsCard } from '@/features/account/settings/indetity-card';
import { AccountLoginProviderCard } from '@/features/account/settings/login-provider-card';
import { AccountPortalSettingsCard } from '@/features/account/settings/portal-card';
import { AccountProfileSettingsCard } from '@/features/account/settings/profile-card';
import { useApp } from '@/providers/app.provider';
import { createUserControl } from '@/resources/control-plane';
import { userSchema } from '@/resources/schemas/user.schema';
import { paths } from '@/utils/config/paths.config';
import { dataWithToast, getSession, validateCSRF } from '@/utils/cookies';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { parseWithZod } from '@conform-to/zod/v4';
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
  breadcrumb: () => <span>Preferences</span>,
};

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Account Preferences');
});

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const { session } = await getSession(request);

  if (!session || !session?.sub) {
    return redirect(paths.auth.logOut);
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

export default function AccountPreferencesPage() {
  const user = useActionData<typeof action>();

  const { setUser } = useApp();

  useEffect(() => {
    if (user) {
      setUser(user);
    }
  }, [user]);

  return (
    <div className="mx-auto flex w-full flex-col gap-6">
      <PageTitle title="Preferences" />
      <AccountProfileSettingsCard />

      <AccountIdentitySettingsCard />

      <AccountLoginProviderCard />

      <AccountPortalSettingsCard />

      {/* <AccountNewsletterSettingsCard /> */}

      <AccountDangerSettingsCard />
    </div>
  );
}
