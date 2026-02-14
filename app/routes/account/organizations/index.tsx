import { BadgeCopy } from '@/components/badge/badge-copy';
import { BadgeStatus } from '@/components/badge/badge-status';
import { InputName } from '@/components/input-name/input-name';
import { NoteCard } from '@/components/note-card/note-card';
import {
  organizationFormSchema,
  useCreateOrganization,
  type Organization,
  createOrganizationGqlService,
} from '@/resources/organizations';
import { paths } from '@/utils/config/paths.config';
import { getAlertState, setAlertClosed } from '@/utils/cookies';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button, Col, DataTable, Row, toast } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { Form } from '@datum-ui/components/new-form';
import { cn } from '@shadcn/lib/utils';
import { ColumnDef } from '@tanstack/react-table';
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
  // Services now use global axios client with AsyncLocalStorage
  const orgService = createOrganizationGqlService();
  const orgList = await orgService.list();

  const { isClosed: alertClosed, headers: alertHeaders } = await getAlertState(
    request,
    'organizations_understanding'
  );

  return data({ orgs: orgList.items, alertClosed }, { headers: alertHeaders });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { headers } = await setAlertClosed(request, 'organizations_understanding');
  return data({ success: true }, { headers });
};

export default function AccountOrganizations() {
  const { orgs, alertClosed } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const revalidator = useRevalidator();

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

  const orgsList = (orgs ?? []) as Organization[];

  const hasStandardOrg = useMemo(() => {
    return orgsList.some((org) => org.type === 'Standard');
  }, [orgsList]);

  const showAlert = !alertClosed && !hasStandardOrg;

  const handleAlertClose = () => {
    alertSubmittedRef.current = true;
    alertFetcher.submit({}, { method: 'POST' });
  };

  const columns: ColumnDef<Organization>[] = useMemo(
    () => [
      {
        header: 'Organization',
        accessorKey: 'name',
        id: 'name',
        cell: ({ row }) => {
          return (
            <div className="flex w-full flex-col items-start justify-start gap-4 md:flex-row md:items-center md:justify-between md:gap-2">
              <div className="flex items-center gap-5">
                <Icon
                  icon={Building}
                  className={cn(
                    'text-icon-primary size-4',
                    row.original.type === 'Personal' && 'text-primary'
                  )}
                />
                <span>{row.original.displayName || row.original.name}</span>
              </div>
              <div className="flex w-full items-center justify-between gap-6 md:w-auto">
                <BadgeCopy
                  value={row.original.name ?? ''}
                  text={row.original.name ?? ''}
                  badgeTheme="solid"
                  badgeType="muted"
                />
                <BadgeStatus status={row.original.type} />
              </div>
            </div>
          );
        },
      },
    ],
    []
  );

  const handleSubmit = async (formData: z.infer<typeof organizationFormSchema>) => {
    await createMutation.mutateAsync({
      name: formData.name,
      displayName: formData.description, // description field is used as display name in the form
      description: formData.description,
      type: 'Standard',
    });
  };

  return (
    <div className="mx-auto flex w-full flex-col gap-6">
      <Row gutter={[0, 24]}>
        <Col span={24}>
          <DataTable
            hideHeader
            mode="card"
            hidePagination
            columns={columns}
            data={orgsList}
            tableCardClassName={(row: Organization) => {
              return row.type === 'Personal' ? 'text-primary border-primary ' : '';
            }}
            onRowClick={(row) => {
              navigate(getPathWithParams(paths.org.detail.root, { orgId: row.name }));
            }}
            tableTitle={{
              title: 'Organizations',
              actions: (
                <Button
                  htmlType="button"
                  onClick={() => setOpenDialog(true)}
                  type="primary"
                  theme="solid"
                  size="small"
                  icon={<Icon icon={PlusIcon} className="size-4" />}>
                  Create organization
                </Button>
              ),
            }}
            emptyContent={{
              title: "Looks like you don't have any organizations added yet",
              actions: [
                {
                  type: 'button',
                  label: 'Add a organization',
                  onClick: () => setOpenDialog(true),
                  variant: 'default',
                  icon: <Icon icon={ArrowRightIcon} className="size-4" />,
                  iconPosition: 'end',
                },
              ],
            }}
            toolbar={{
              layout: 'compact',
              includeSearch: {
                placeholder: 'Search organizations',
              },
              filtersDisplay: 'dropdown',
            }}
          />
        </Col>
        {showAlert && (
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
            <Form.Input placeholder="e.g. My Organization" autoFocus />
          </Form.Field>

          <Form.Field name="name">
            {({ field, fields }) => (
              <InputName
                required
                showTooltip={false}
                description="This unique resource name will be used to identify your organization and cannot be changed."
                field={field}
                baseName={fields.description?.value as string}
              />
            )}
          </Form.Field>
        </div>
      </Form.Dialog>
    </div>
  );
}
