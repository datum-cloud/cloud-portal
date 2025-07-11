import { DataTableEmptyContent } from '@/components/data-table/data-table-empty-content';
import { PageTitle } from '@/components/page-title/page-title';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { routes } from '@/constants/routes';
import { OrganizationListCard } from '@/features/organization/list-card';
import { IOrganization, OrganizationType } from '@/resources/interfaces/organization.interface';
import { ROUTE_PATH as ORG_LIST_PATH } from '@/routes/api+/organizations+/_index';
import { CustomError } from '@/utils/errorHandle';
import { PlusIcon } from 'lucide-react';
import { useLoaderData, useNavigate, LoaderFunctionArgs, Link } from 'react-router';

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

const NewOrganizationCard = () => {
  const navigate = useNavigate();
  return (
    <Card
      className="hover:border-accent-foreground cursor-pointer border-dashed py-4 shadow-none transition-all"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        navigate(routes.account.organizations.new);
      }}>
      <CardContent className="flex flex-row items-center justify-between gap-4 px-4">
        {/* Left Side */}
        <div className="flex flex-row items-center gap-4">
          {/* Avatar */}
          <Avatar className="size-12 !rounded-md">
            <AvatarFallback className="rounded-md">
              <PlusIcon size={24} />
            </AvatarFallback>
          </Avatar>
          {/* Organization Info */}
          <div className="flex flex-col gap-1">
            <h3 className="text-foreground text-lg leading-5 font-semibold">New organization</h3>
            <p className="text-muted-foreground text-sm">
              Collaborate with your team by creating a new organization
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function AccountOrganizations() {
  const orgs: IOrganization[] = useLoaderData<typeof loader>();

  return orgs.length === 0 ? (
    <DataTableEmptyContent
      title="No organizations found"
      subtitle="You don't have any organizations"
      actions={[
        {
          type: 'link',
          label: 'New organization',
          to: routes.account.organizations.new,
          icon: <PlusIcon className="size-4" />,
        },
      ]}
    />
  ) : (
    <>
      <PageTitle
        title="Your Organizations"
        actions={
          <Link to={routes.account.organizations.new}>
            <Button>
              <PlusIcon className="size-4" />
              New organization
            </Button>
          </Link>
        }
      />
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
