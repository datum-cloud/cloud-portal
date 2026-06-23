import { type BillingAccount } from '@/features/billing/types';
import { SetupBillingForm } from '@/features/onboarding';
import BlankLayout from '@/layouts/blank.layout';
import { createBillingAccountService } from '@/resources/billing-accounts';
import { createOrganizationService } from '@/resources/organizations/organization.service';
import { createStripeProviderConfigService } from '@/resources/stripe-provider-configs';
import { createUserService } from '@/resources/users';
import { orgIdFromNamespace } from '@/utils/common';
import { paths } from '@/utils/config/paths.config';
import { getSession } from '@/utils/cookies';
import { AuthorizationError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import {
  type LoaderFunctionArgs,
  type MetaFunction,
  redirect,
  useLoaderData,
  useNavigate,
} from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Payment information verification');
});

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await getSession(request);

  if (!session?.sub) {
    return redirect(paths.auth.logOut);
  }

  try {
    const user = await createUserService().get(session.sub);
    const organizations = await createOrganizationService().list();

    const orgIds = organizations.items.map((o) => o.name);
    if (orgIds.length === 0) {
      return { status: 'empty' as const };
    }

    const accounts = await createBillingAccountService().listForOrgs(orgIds);
    const account: BillingAccount | undefined = accounts[0];
    if (!account?.metadata?.name) {
      return { status: 'empty' as const };
    }

    const namespace = account.metadata.namespace ?? '';
    const orgId = orgIdFromNamespace(namespace);
    if (!orgId) {
      return { status: 'empty' as const };
    }

    const stripeConfigs = await createStripeProviderConfigService()
      .list()
      .catch(() => []);
    const stripePublishableKey = stripeConfigs[0]?.spec?.publishableKey ?? undefined;

    const fullName = [user.givenName, user.familyName].filter(Boolean).join(' ').trim();
    const billingContact = account.spec?.contactInfo;

    return {
      status: 'ready' as const,
      orgId,
      accountName: account.metadata.name,
      namespace,
      stripePublishableKey,
      contactPrefill: {
        email: billingContact?.email ?? user.email ?? '',
        name: billingContact?.name ?? fullName,
      },
    };
  } catch (userError) {
    if (userError instanceof NotFoundError || userError instanceof AuthorizationError) {
      return redirect(paths.fraud.verifying);
    }
    return redirect(paths.auth.logOut);
  }
};

export default function SetupBillingPage() {
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <BlankLayout logo="flat" showSceneImages={false} className="justify-center">
      {data.status === 'empty' ? (
        <Card className="bg-card text-foreground z-10 w-full max-w-full rounded-xl border p-3 sm:max-w-[410px] sm:p-4 md:p-6 lg:p-8 xl:p-[44px]">
          <CardContent className="flex flex-col gap-4 p-0 text-center">
            <h2 className="text-xl font-medium">No billing account yet</h2>
            <p className="text-muted-foreground text-sm">
              We couldn&apos;t find a billing account to set up. Once one exists for your
              organization, you&apos;ll be able to finish billing setup here.
            </p>
            <Button
              htmlType="button"
              type="primary"
              className="w-full"
              onClick={() => navigate(paths.account.organizations.root)}>
              Go to organizations
            </Button>
          </CardContent>
        </Card>
      ) : data.status === 'ready' ? (
        <SetupBillingForm
          orgId={data.orgId}
          accountName={data.accountName}
          namespace={data.namespace}
          stripePublishableKey={data.stripePublishableKey}
          contactPrefill={data.contactPrefill}
        />
      ) : null}
    </BlankLayout>
  );
}
