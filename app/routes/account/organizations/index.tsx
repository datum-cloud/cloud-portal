import { BadgeCopy } from '@/components/badge/badge-copy';
import { BadgeStatus } from '@/components/badge/badge-status';
import { InputName } from '@/components/input-name/input-name';
import { NoteCard } from '@/components/note-card/note-card';
import { IOrganization, OrganizationType } from '@/resources/interfaces/organization.interface';
import { organizationSchema } from '@/resources/schemas/organization.schema';
import { ROUTE_PATH as ORGANIZATIONS_PATH } from '@/routes/api/organizations';
import { paths } from '@/utils/config/paths.config';
import { getAlertState, setAlertClosed } from '@/utils/cookies';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button, Col, DataTable, Row } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { Form } from '@datum-ui/components/new-form';
import { cn } from '@shadcn/lib/utils';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowRightIcon, Building, PlusIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  data,
  useFetcher,
  useLoaderData,
  useNavigate,
  useRevalidator,
} from 'react-router';
import { useAuthenticityToken } from 'remix-utils/csrf/react';
import z from 'zod';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const req = await fetch(`${process.env.APP_URL}${ORGANIZATIONS_PATH}`, {
    method: 'GET',
    headers: {
      Cookie: request.headers.get('Cookie') || '',
    },
  });

  const res = await req.json();
  const orgs = res.success ? res.data : [];

  const { isClosed: alertClosed, headers: alertHeaders } = await getAlertState(
    request,
    'organizations_understanding'
  );

  return data({ orgs, alertClosed }, { headers: alertHeaders });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { headers } = await setAlertClosed(request, 'organizations_understanding');
  return data({ success: true }, { headers });
};

export default function AccountOrganizations() {
  const { orgs, alertClosed } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const fetcher = useFetcher({ key: 'alert-closed' });
  const createFetcher = useFetcher({ key: 'create-organization' });
  const revalidator = useRevalidator();
  const csrf = useAuthenticityToken();

  const [openDialog, setOpenDialog] = useState<boolean>(false);

  const orgsList = (orgs ?? []) as IOrganization[];

  const hasStandardOrg = useMemo(() => {
    return orgsList.some((org) => org.type === OrganizationType.Standard);
  }, [orgsList]);

  const showAlert = !alertClosed && !hasStandardOrg;

  useEffect(() => {
    if (fetcher.data?.success) {
      revalidator.revalidate();
    }
  }, [fetcher.data, revalidator]);

  const handleAlertClose = () => {
    fetcher.submit({}, { method: 'POST' });
  };

  const columns: ColumnDef<IOrganization>[] = useMemo(
    () => [
      {
        header: 'Organization',
        accessorKey: 'name',
        id: 'name',
        cell: ({ row }) => {
          return (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icon
                  icon={Building}
                  className={cn(
                    'text-icon-primary size-4',
                    row.original.type === OrganizationType.Personal && 'text-primary'
                  )}
                />
                <span>{row.original.displayName || row.original.name}</span>
              </div>
              <div className="flex items-center gap-6">
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

  const handleSubmit = async (data: z.infer<typeof organizationSchema>) => {
    return createFetcher.submit(
      {
        ...data,
        redirectUri: getPathWithParams(paths.org.detail.root, { orgId: data.name }),
        csrf: csrf as string,
      },
      { method: 'POST', action: ORGANIZATIONS_PATH, encType: 'application/json' }
    );
  };

  return (
    <div className="mx-auto flex w-full flex-col gap-6">
      {/* Organizations Table */}
      <Row gutter={16}>
        <Col span={20} push={2}>
          <DataTable
            hideHeader
            mode="card"
            hidePagination
            columns={columns}
            data={orgsList}
            tableCardClassName={(row: IOrganization) => {
              return row.type === OrganizationType.Personal ? 'text-primary border-primary ' : '';
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
      </Row>

      {/* Alert for understanding organizations */}
      {showAlert && (
        <Row gutter={16}>
          <Col span={20} push={2}>
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
        </Row>
      )}

      {/* Create Organization Dialog */}
      <Form.Dialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        title="Create an Organization"
        description="Add a Standard organization to enable team collaboration and manage production workloads."
        schema={organizationSchema}
        defaultValues={{
          description: '',
          name: '',
        }}
        onSubmit={handleSubmit}
        onSuccess={() => {
          revalidator.revalidate();
        }}
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
