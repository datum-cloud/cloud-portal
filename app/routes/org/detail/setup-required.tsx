import { ProfileIdentity } from '@/components/profile-identity';
import { PaymentTermsDate } from '@/features/billing/payment-terms-date';
import { selectDefaultOrgBillingAccount } from '@/features/billing/types';
import { paymentTermsApplicationPendingSince } from '@/features/onboarding/legacy-setup/org-setup-status';
import { isOrgSetupComplete } from '@/features/onboarding/legacy-setup/org-setup-status.server';
import { logger } from '@/modules/logger';
import { createBillingAccountService } from '@/resources/billing-accounts';
import {
  isUserOrgOwner,
  listOrgOwners,
  type OrgOwnerContact,
} from '@/resources/members/member-owner';
import { createOrganizationService } from '@/resources/organizations';
import { loaderFailureRedirect, requireSessionSub } from '@/utils/auth/require-session.server';
import { paths } from '@/utils/config/paths.config';
import { AuthorizationError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { LinkButton } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { BuildingIcon, HourglassIcon } from 'lucide-react';
import {
  type LoaderFunctionArgs,
  type MetaFunction,
  Link,
  redirect,
  useLoaderData,
} from 'react-router';

export const meta: MetaFunction = mergeMeta(() => metaObject('Setup required'));

export const handle = {
  breadcrumb: () => <span>Setup required</span>,
};

export const loader = async ({ request, params, context }: LoaderFunctionArgs) => {
  const { orgId } = params;
  if (!orgId) {
    return redirect(paths.account.organizations.root);
  }

  await requireSessionSub(request, context);

  try {
    // Setup finished while the user sat here — send them into the org.
    if (await isOrgSetupComplete(orgId)) {
      return redirect(getPathWithParams(paths.org.detail.projects.root, { orgId }));
    }

    // Owners can actually complete setup, so route them to the billing flow.
    if (await isUserOrgOwner(orgId)) {
      return redirect(`${paths.onboarding.billing}?orgId=${encodeURIComponent(orgId)}`);
    }

    // Each of these is optional for the page, so a failure falls back
    // rather than failing the page. Billing reports an owner's pending
    // payment terms application on the account's PaymentReady condition;
    // members who can't read billing accounts just see the general setup
    // message.
    const fallBack =
      <T,>(what: string, value: T) =>
      (error: unknown): T => {
        logger.warn(`[setup-required] Could not load ${what}`, {
          orgId,
          error: error instanceof Error ? error.message : String(error),
        });
        return value;
      };
    const [org, owners, accounts] = await Promise.all([
      createOrganizationService().get(orgId).catch(fallBack('the organization', null)),
      listOrgOwners(orgId).catch(fallBack('the owners', [] as OrgOwnerContact[])),
      createBillingAccountService().list(orgId).catch(fallBack('billing accounts', [])),
    ]);
    const reviewSince = paymentTermsApplicationPendingSince(
      selectDefaultOrgBillingAccount(accounts)
    );

    return {
      orgDisplayName: org?.displayName?.trim() || org?.name || orgId,
      owners,
      reviewSince: reviewSince ?? null,
    };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      return redirect(paths.account.organizations.root);
    }
    return redirect(loaderFailureRedirect(error, request));
  }
};

export default function OrgSetupRequiredRoute() {
  const { orgDisplayName, owners, reviewSince } = useLoaderData<typeof loader>();

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardContent className="flex flex-col items-center gap-6 py-10 text-center">
          <div className="bg-muted flex size-14 items-center justify-center rounded-full">
            <Icon
              icon={reviewSince ? HourglassIcon : BuildingIcon}
              className="text-muted-foreground size-6"
            />
          </div>

          {reviewSince ? (
            <div className="flex flex-col gap-2" data-e2e="setup-required-review">
              <Title as="h1" level={3} weight="semibold">
                Billing review in progress
              </Title>
              <Text as="p" textColor="muted">
                An owner of <span className="text-foreground font-medium">{orgDisplayName}</span>{' '}
                applied for payment terms
                {reviewSince ? (
                  <>
                    {' on '}
                    <PaymentTermsDate date={reviewSince} />
                  </>
                ) : null}
                . Our team usually reviews applications within one business day, and you&apos;ll
                have access as soon as it&apos;s approved.
              </Text>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Title as="h1" level={3} weight="semibold">
                Billing setup required
              </Title>
              <Text as="p" textColor="muted">
                <span className="text-foreground font-medium">{orgDisplayName}</span> needs billing
                setup before it can be used, and only an organization owner can complete it.
              </Text>
            </div>
          )}

          <div className="w-full">
            {owners.length > 0 ? (
              <ul className="mx-auto flex w-fit flex-col gap-3 text-left">
                {owners.map((owner) => (
                  <li key={owner.email || owner.name} className="flex items-center gap-3">
                    <ProfileIdentity
                      size="sm"
                      avatarSrc={owner.avatarUrl}
                      name={owner.name}
                      subtitle={owner.email}
                    />
                    <Badge
                      type="quaternary"
                      theme="outline"
                      className="ml-auto rounded-[8px] px-[7px] font-normal">
                      Owner
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <Text as="p" textColor="muted">
                Ask someone with the Owner role on your team to complete billing setup.
              </Text>
            )}
          </div>

          <LinkButton
            as={Link}
            href={paths.account.organizations.root}
            type="primary"
            theme="solid">
            Back to organizations
          </LinkButton>
        </CardContent>
      </Card>
    </div>
  );
}
