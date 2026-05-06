import { BadgeCopy } from '@/components/badge/badge-copy';
import { BadgeStatus } from '@/components/badge/badge-status';
import { CardList } from '@/components/card-list';
import { InputName } from '@/components/input-name/input-name';
import { NoteCard } from '@/components/note-card/note-card';
import { AnalyticsAction, useAnalytics } from '@/modules/fathom';
import {
  organizationFormSchema,
  useCreateOrganization,
  useOrganizations,
  type Organization,
} from '@/resources/organizations';
import { paths } from '@/utils/config/paths.config';
import { getAlertState, setAlertClosed } from '@/utils/cookies';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button } from '@datum-cloud/datum-ui/button';
import { Form, useWatch, type NormalizedFieldState } from '@datum-cloud/datum-ui/form';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { cn } from '@datum-cloud/datum-ui/utils';
import { ArrowRightIcon, Building, PlusIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  data,
  useFetcher,
  useLoaderData,
  useNavigate,
  useRevalidator,
} from 'react-router';
import z from 'zod';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { isClosed: alertClosed, headers: alertHeaders } = await getAlertState(
    request,
    'organizations_understanding'
  );
  return data({ alertClosed }, { headers: alertHeaders });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { headers } = await setAlertClosed(request, 'organizations_understanding');
  return data({ success: true }, { headers });
};

function OrganizationResourceName({ field }: { field: NormalizedFieldState }) {
  const description = useWatch('description') as string | undefined;

  return (
    <InputName
      required
      showTooltip={false}
      description="This unique resource name will be used to identify your organization and cannot be changed."
      field={field}
      baseName={description}
    />
  );
}

export default function AccountOrganizations() {
  const { alertClosed } = useLoaderData<typeof loader>();
  const {
    data: orgList,
    isLoading: _isLoading,
    refetch: refetchOrgs,
    error: orgsError,
  } = useOrganizations();
  const orgs = orgList?.items ?? [];
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const { trackAction } = useAnalytics();

  const [openDialog, setOpenDialog] = useState<boolean>(false);

  // Alert close fetcher - native useFetcher with effect-based callback
  const alertFetcher = useFetcher<{ success: boolean }>({ key: 'alert-closed' });
  const alertSubmittedRef = useRef(false);

  useEffect(() => {
    if (alertSubmittedRef.current && alertFetcher.data?.success && alertFetcher.state === 'idle') {
      alertSubmittedRef.current = false;
      revalidator.revalidate();
    }
  }, [alertFetcher.data, alertFetcher.state, revalidator]);

  const createMutation = useCreateOrganization({
    onSuccess: (newOrg) => {
      trackAction(AnalyticsAction.CreateOrg, { orgId: newOrg.name });
      refetchOrgs();
      setTimeout(() => {
        setOpenDialog(false);
        navigate(getPathWithParams(paths.org.detail.root, { orgId: newOrg.name }));
      }, 500);
    },
    onError: (error) => {
      toast.error('Organization', {
        description: error?.message || 'Failed to create organization',
      });
    },
  });

  const hasStandardOrg = useMemo(() => {
    return orgs.some((org) => org.type === 'Standard');
  }, [orgs]);

  const showAlert = !alertClosed && !hasStandardOrg;

  const handleAlertClose = () => {
    alertSubmittedRef.current = true;
    alertFetcher.submit({}, { method: 'POST' });
  };

  const handleSubmit = async (formData: z.infer<typeof organizationFormSchema>) => {
    await createMutation.mutateAsync({
      name: formData.name,
      displayName: formData.description, // description field is used as display name in the form
      description: formData.description,
      type: 'Standard',
    });
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
                  data-e2e={`organization-card-${org.type.toLowerCase()}`}>
                  <div className="flex items-center gap-5">
                    <Icon
                      icon={Building}
                      className={cn(
                        'text-icon-primary size-4',
                        org.type === 'Personal' && 'text-primary'
                      )}
                    />
                    <span>{org.displayName || org.name}</span>
                  </div>
                  <div className="flex w-full items-center justify-between gap-4 md:w-auto md:gap-6">
                    <BadgeCopy
                      data-e2e="organization-card-id-copy"
                      value={org.name ?? ''}
                      text={org.name ?? ''}
                      badgeTheme="solid"
                      badgeType="muted"
                      textClassName="max-w-[8rem] truncate sm:max-w-[12rem] md:max-w-none"
                    />
                    <BadgeStatus status={org.type} />
                  </div>
                </div>
              )}
              cardClassName={(org) =>
                org.type === 'Personal' ? 'text-primary border-primary' : ''
              }
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
                    You start with a Personal organization to explore and manage small projects (try
                    the one we&apos;ve created for you above!)
                  </li>
                  <li>
                    Add Standard organizations for team collaboration and production workload
                    features.
                  </li>
                </ul>
              }
            />
          </Col>
        )}
      </Row>

      {/* Create Organization Dialog */}
      <Form.Dialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        title="Create an Organization"
        description="Add a Standard organization to enable team collaboration and manage production workloads."
        schema={organizationFormSchema}
        defaultValues={{
          description: '',
          name: '',
        }}
        onSubmit={handleSubmit}
        submitText="Confirm"
        submitTextLoading="Creating..."
        className="w-full sm:max-w-3xl">
        <div className="divide-border space-y-0 divide-y [&>*]:px-5 [&>*]:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
          <Form.Field
            name="description"
            label="Organization Name"
            description="Could be the name of your company or team. This can be changed."
            required>
            <Form.Input
              data-e2e="create-organization-name-input"
              placeholder="e.g. My Organization"
              autoFocus
            />
          </Form.Field>

          <Form.Field name="name">
            {({ field }) => <OrganizationResourceName field={field} />}
          </Form.Field>
        </div>
      </Form.Dialog>
    </div>
  );
}
