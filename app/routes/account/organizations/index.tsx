import { DataTableEmptyContent } from '@/components/data-table/data-table-empty-content';
import { PageTitle } from '@/components/page-title/page-title';
import { paths } from '@/config/paths';
import { OrganizationListCard } from '@/features/organization/list-card';
import { IOrganization, OrganizationType } from '@/resources/interfaces/organization.interface';
import { ROUTE_PATH as ORG_LIST_PATH } from '@/routes/api/organizations';
import { getPathWithParams } from '@/utils/path';
import { useLoaderData, LoaderFunctionArgs, data, Link } from 'react-router';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const req = await fetch(`${process.env.APP_URL}${ORG_LIST_PATH}`, {
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

  return orgs.length === 0 ? (
    <DataTableEmptyContent
      title="No organizations found"
      subtitle="You don't have any organizations"
    />
  ) : (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <PageTitle title="Your Organizations" />
      <div className="flex w-full flex-col gap-4">
        {(orgs ?? [])
          .sort((a, b) => {
            // Put personal organization first
            if (a.type === OrganizationType.Personal) return -1;
            if (b.type === OrganizationType.Personal) return 1;

            // Then sort alphabetically by displayName or name
            return (a?.displayName ?? a?.name ?? '').localeCompare(b?.displayName ?? b?.name ?? '');
          })
          .map((org) => (
            <Link to={getPathWithParams(paths.org.detail.root, { orgId: org.name })} key={org.name}>
              <OrganizationListCard key={org.name} org={org} />
            </Link>
          ))}

        {/* <NewOrganizationCard /> */}
      </div>
    </div>
  );
}
