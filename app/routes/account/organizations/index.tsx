import { BadgeCopy } from '@/components/badge/badge-copy';
import { BadgeStatus } from '@/components/badge/badge-status';
import { IOrganization, OrganizationType } from '@/resources/interfaces/organization.interface';
import { ROUTE_PATH as ORG_LIST_PATH } from '@/routes/api/organizations';
import { paths } from '@/utils/config/paths.config';
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
import { useMemo } from 'react';
import { useLoaderData, LoaderFunctionArgs, data, useNavigate } from 'react-router';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const req = await fetch(`${process.env.APP_URL}${ORG_LIST_PATH}?noCache=true`, {
    method: 'GET',
    headers: {
      Cookie: request.headers.get('Cookie') || '',
    },
  });

  const res = await req.json();
  if (!res.success) {
    return data([]);
  }

  return data(res.data);
};

export default function AccountOrganizations() {
  const orgs: IOrganization[] = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const hasStandardOrg = useMemo(() => {
    return orgs.some((org) => org.type === OrganizationType.Standard);
  }, [orgs]);

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
    <>
      <Row gutter={16}>
        <Col span={20} push={2}>
          <DataTable
            hideHeader
            mode="card"
            hidePagination
            columns={columns}
            data={(orgs ?? []) as IOrganization[]}
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

      {!hasStandardOrg && (
        <Row gutter={16}>
          <Col span={20} push={2}>
            <Alert variant="warning" closable>
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
    </>
  );
}
