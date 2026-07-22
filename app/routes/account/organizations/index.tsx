import { AvatarStack } from '@/components/avatar-stack';
import { BadgeCopy } from '@/components/badge/badge-copy';
import { CardList } from '@/components/card-list';
import { NoteCard } from '@/components/note-card/note-card';
import {
  buildOrgContactDefaults,
  type OrgContactInfoValues,
} from '@/features/onboarding/schemas/org-contact-info-schema';
import { CreateOrganizationDialog } from '@/features/organization/create/create-organization-dialog';
import { AnalyticsAction, useAnalytics } from '@/modules/rybbit';
import { useOrganizationsGql, type Organization } from '@/resources/organizations';
import { createOrganizationService } from '@/resources/organizations';
import { createStripeProviderConfigService } from '@/resources/stripe-provider-configs';
import { createUserService } from '@/resources/users';
import { paths } from '@/utils/config/paths.config';
import { getAlertState, getSession, setAlertClosed } from '@/utils/cookies';
import { AuthorizationError, NotFoundError } from '@/utils/errors';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { onboardingEntryPath } from '@/utils/middlewares/fraud-redirect';
import { Button } from '@datum-cloud/datum-ui/button';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { ArrowRightIcon, Building, PlusIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  data,
  redirect,
  useFetcher,
  useLoaderData,
  useNavigate,
  useRevalidator,
} from 'react-router';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const [{ isClosed: alertClosed, headers: alertHeaders }, { session }] = await Promise.all([
    getAlertState(request, 'organizations_understanding'),
    getSession(request),
  ]);

  if (!session?.sub) {
    return redirect(paths.auth.logOut);
  }

  try {
    const [user, orgs] = await Promise.all([
      createUserService().get(session.sub),
      createOrganizationService().list({ limit: 1 }),
    ]);

    // A user with no orgs belongs in onboarding. This guard handles
    // client-side navigation that bypasses the middleware redirect.
    if (orgs.items.length === 0) {
      return redirect(onboardingEntryPath(user));
    }

    const contactDefaults: Partial<OrgContactInfoValues> = {
      email: user.email ?? '',
      name: user.fullName?.trim() || '',
      country: user.country ?? '',
    };

    const stripeConfigs = await createStripeProviderConfigService()
      .list()
      .catch(() => []);
    const stripePublishableKey = stripeConfigs[0]?.spec?.publishableKey ?? undefined;

    return data({ alertClosed, contactDefaults, stripePublishableKey }, { headers: alertHeaders });
  } catch (userError) {
    if (userError instanceof NotFoundError || userError instanceof AuthorizationError) {
      return redirect(paths.fraud.verifying);
    }
    return redirect(paths.auth.logOut);
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { headers } = await setAlertClosed(request, 'organizations_understanding');
  return data({ success: true }, { headers });
};

export default function AccountOrganizations() {
  const { alertClosed, contactDefaults, stripePublishableKey } = useLoaderData<typeof loader>();
  const { data: orgList, isLoading: _isLoading, error: orgsError } = useOrganizationsGql();
  const orgs = orgList?.items ?? [];
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const { trackAction } = useAnalytics();

  const [openDialog, setOpenDialog] = useState<boolean>(false);

  const alertFetcher = useFetcher<{ success: boolean }>({ key: 'alert-closed' });
  const alertSubmittedRef = useRef(false);

  useEffect(() => {
    if (alertSubmittedRef.current && alertFetcher.data?.success && alertFetcher.state === 'idle') {
      alertSubmittedRef.current = false;
      revalidator.revalidate();
    }
  }, [alertFetcher.data, alertFetcher.state, revalidator]);

  const hasLegacyStandardOrg = useMemo(() => {
    return orgs.some((org) => org.type === 'Standard');
  }, [orgs]);

  const hasUnifiedOrg = useMemo(() => {
    return orgs.some((org) => !org.type);
  }, [orgs]);

  const showAlert = !alertClosed && !hasLegacyStandardOrg && !hasUnifiedOrg;

  const handleAlertClose = () => {
    alertSubmittedRef.current = true;
    alertFetcher.submit({}, { method: 'POST' });
  };

  const handleCreated = async ({ orgId }: { orgId: string }) => {
    trackAction(AnalyticsAction.CreateOrg, { orgId });
    navigate(getPathWithParams(paths.org.detail.root, { orgId }));
    // Hold the dialog + submit spinner until this route unmounts after navigation.
    await new Promise<void>(() => {});
  };

  return (
    <div className="mx-auto flex w-full flex-col gap-4 sm:gap-6">
      <Row gutter={[0, 24]}>
        <Col span={24}>
          <CardList<Organization>
            data={orgs}
            getId={(org) => org.name}
            loading={_isLoading}
            error={orgsError}>
            <CardList.Header
              title="Organizations"
              actions={
                <Button
                  htmlType="button"
                  onClick={() => setOpenDialog(true)}
                  type="primary"
                  theme="solid"
                  size="small"
                  data-e2e="create-organization-button"
                  className="w-full sm:w-auto"
                  icon={<Icon icon={PlusIcon} className="size-4" />}>
                  Create organization
                </Button>
              }>
              <CardList.Search<Organization>
                placeholder="Search"
                fields={['displayName', 'name']}
              />
            </CardList.Header>
            <CardList.Items<Organization>
              renderCard={(org) => (
                <div
                  className="flex w-full flex-col items-start justify-start gap-4 md:flex-row md:items-center md:justify-between md:gap-2"
                  data-e2e={
                    org.type ? `organization-card-${org.type.toLowerCase()}` : 'organization-card'
                  }>
                  <div className="flex items-center gap-5">
                    <Icon icon={Building} className="text-icon-primary size-4" />
                    <span>{org.displayName || org.name}</span>
                  </div>
                  <div className="flex w-full items-center justify-between gap-4 md:w-auto md:gap-6">
                    <AvatarStack items={org.memberAvatars ?? []} max={5} />
                    <BadgeCopy
                      data-e2e="organization-card-id-copy"
                      value={org.name ?? ''}
                      text={org.name ?? ''}
                      badgeTheme="solid"
                      badgeType="muted"
                      textClassName="max-w-[8rem] truncate sm:max-w-[12rem] md:max-w-none"
                    />
                  </div>
                </div>
              )}
              onSelect={(org) =>
                navigate(getPathWithParams(paths.org.detail.root, { orgId: org.name }))
              }
            />
            <CardList.Empty
              title="Looks like you don't have any organizations added yet"
              action={{
                label: 'Add a organization',
                onClick: () => setOpenDialog(true),
                icon: <Icon icon={ArrowRightIcon} className="size-4" />,
                iconPosition: 'end',
                variant: 'default',
              }}
            />
          </CardList>
        </Col>

        {showAlert && !_isLoading && (
          <Col span={24}>
            <NoteCard
              closable
              onClose={handleAlertClose}
              title="Understanding Organizations"
              description={
                <ul className="list-disc space-y-2 pl-5 text-sm font-normal">
                  <li>
                    Organizations group your projects with separate team and billing settings.
                  </li>
                  <li>
                    Each organization needs contact and billing details before you can use it.
                  </li>
                  <li>You can create additional organizations for separate teams or workloads.</li>
                </ul>
              }
            />
          </Col>
        )}
      </Row>

      <CreateOrganizationDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        contactDefaults={buildOrgContactDefaults(contactDefaults)}
        stripePublishableKey={stripePublishableKey}
        onCreated={handleCreated}
      />
    </div>
  );
}
