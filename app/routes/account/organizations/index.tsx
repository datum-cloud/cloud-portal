import { BadgeCopy } from '@/components/badge/badge-copy';
import { BadgeStatus } from '@/components/badge/badge-status';
import { IOrganization, OrganizationType } from '@/resources/interfaces/organization.interface';
import { ROUTE_PATH as ORG_LIST_PATH } from '@/routes/api/organizations';
import { paths } from '@/utils/config/paths.config';
import { getAlertState, setAlertClosed } from '@/utils/cookies';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Col,
  DataTable,
  LinkButton,
  Row,
} from '@datum-ui/components';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowRightIcon, Building, PlusIcon, TriangleAlert } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  data,
  useFetcher,
  useLoaderData,
  useNavigate,
  useRevalidator,
} from 'react-router';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const req = await fetch(`${process.env.APP_URL}${ORG_LIST_PATH}?noCache=true`, {
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
  const fetcher = useFetcher();
  const revalidator = useRevalidator();

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
                <Building className="size-4" />
                <span>{row.original.displayName || row.original.name}</span>
              </div>
              <div className="flex items-center gap-6">
                <BadgeCopy
                  value={row.original.name ?? ''}
                  text={row.original.name ?? ''}
                  badgeTheme="solid"
                  badgeType="quaternary"
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

  return (
    <div className="mx-auto flex w-full flex-col gap-6">
      <Row gutter={16}>
        <Col span={20} push={2}>
          <DataTable
            hideHeader
            mode="card"
            hidePagination
            columns={columns}
            data={orgsList}
            tableCardClassName={(row: IOrganization) => {
              return row.type === OrganizationType.Personal
                ? 'text-primary border-primary bg-primary/10 hover:border-secondary hover:text-secondary'
                : '';
            }}
            onRowClick={(row) => {
              navigate(getPathWithParams(paths.org.detail.root, { orgId: row.name }));
            }}
            tableTitle={{
              title: 'Organizations',
              actions: (
                <LinkButton
                  to={getPathWithParams(paths.account.organizations.new)}
                  type="primary"
                  theme="solid"
                  size="small"
                  icon={<PlusIcon className="size-4" />}>
                  Create organization
                </LinkButton>
              ),
            }}
            emptyContent={{
              title: "Looks like you don't have any organizations added yet",
              actions: [
                {
                  type: 'link',
                  label: 'Add a organization',
                  to: getPathWithParams(paths.account.organizations.new),
                  variant: 'default',
                  icon: <ArrowRightIcon className="size-4" />,
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
            // filters={
            //   <>
            //     <DataTableFilter.Select
            //       label="Type"
            //       placeholder="Type"
            //       filterKey="type"
            //       options={[
            //         {
            //           label: 'Personal',
            //           value: 'personal',
            //         },
            //         {
            //           label: 'Standard',
            //           value: 'standard',
            //         },
            //       ]}
            //       triggerClassName="min-w-32"
            //     />
            //   </>
            // }
          />
        </Col>
      </Row>

      {showAlert && (
        <Row gutter={16}>
          <Col span={20} push={2}>
            <Alert variant="warning" closable onClose={handleAlertClose}>
              <TriangleAlert className="size-4" />
              <AlertTitle>Understanding Organizations</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 list-disc space-y-1 pl-5">
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
              </AlertDescription>
            </Alert>
          </Col>
        </Row>
      )}
    </div>
  );
}
