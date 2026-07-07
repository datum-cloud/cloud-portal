import { ProfileIdentity } from '@/components/profile-identity';
import { isOrgSetupComplete } from '@/features/onboarding/legacy-setup/org-setup-status.server';
import {
  isUserOrgOwner,
  listOrgOwners,
  type OrgOwnerContact,
} from '@/resources/members/member-owner';
import { createOrganizationService } from '@/resources/organizations';
import { paths } from '@/utils/config/paths.config';
import { getSession } from '@/utils/cookies';
import { AuthorizationError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { LinkButton } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { BuildingIcon } from 'lucide-react';
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

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { orgId } = params;
  if (!orgId) {
    return redirect(paths.account.organizations.root);
  }

  const { session } = await getSession(request);
  if (!session?.sub) {
    return redirect(paths.auth.logOut);
  }

  try {
    // Setup finished while the user sat here — send them into the org.
    if (await isOrgSetupComplete(orgId)) {
      return redirect(getPathWithParams(paths.org.detail.projects.root, { orgId }));
    }

    // Owners can actually complete setup, so route them to the billing flow.
    if (await isUserOrgOwner(orgId)) {
      return redirect(`${paths.onboarding.billing}?orgId=${encodeURIComponent(orgId)}`);
    }

    const org = await createOrganizationService()
      .get(orgId)
      .catch(() => null);
    const owners = await listOrgOwners(orgId).catch(() => [] as OrgOwnerContact[]);

    return {
      orgDisplayName: org?.displayName?.trim() || org?.name || orgId,
      owners,
    };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      return redirect(paths.account.organizations.root);
    }
    return redirect(paths.auth.logOut);
  }
};

export default function OrgSetupRequiredRoute() {
  const { orgDisplayName, owners } = useLoaderData<typeof loader>();

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardContent className="flex flex-col items-center gap-6 py-10 text-center">
          <div className="bg-muted flex size-14 items-center justify-center rounded-full">
            <Icon icon={BuildingIcon} className="text-muted-foreground size-6" />
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold">Billing setup required</h1>
            <p className="text-muted-foreground text-sm">
              <span className="text-foreground font-medium">{orgDisplayName}</span> needs billing
              setup before it can be used, and only an organization owner can complete it.
            </p>
          </div>

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
              <p className="text-muted-foreground text-sm">
                Ask someone with the Owner role on your team to complete billing setup.
              </p>
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
