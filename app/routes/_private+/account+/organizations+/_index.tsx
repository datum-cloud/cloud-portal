import { DataTableEmptyContent } from '@/components/data-table/data-table-empty-content';
import { PageTitle } from '@/components/page-title/page-title';
import { OrganizationListCard } from '@/features/organization/list-card';
import { IOrganization, OrganizationType } from '@/resources/interfaces/organization.interface';
import { ROUTE_PATH as ORG_LIST_PATH } from '@/routes/api+/organizations+/_index';
import { CustomError } from '@/utils/errorHandle';
import { useLoaderData, LoaderFunctionArgs } from 'react-router';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const req = await fetch(`${process.env.APP_URL}${ORG_LIST_PATH}`, {
    method: 'GET',
    headers: {
      Cookie: request.headers.get('Cookie') || '',
    },
  });

  const res = await req.json();
  if (!res.success) {
    throw new CustomError(res.error, res.status);
  }

  const data = res.data;
  return data;
};

export default function AccountOrganizations() {
  const orgs: IOrganization[] = useLoaderData<typeof loader>();

  return orgs.length === 0 ? (
    <DataTableEmptyContent
      title="No organizations found"
      subtitle="You don't have any organizations"
    />
  ) : (
    <>
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
            <OrganizationListCard key={org.name} org={org} />
          ))}

        {/* <NewOrganizationCard /> */}
      </div>
    </>
  );
}
