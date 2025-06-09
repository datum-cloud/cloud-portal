import { EmptyContent } from '@/components/empty-content/empty-content';
import { PageTitle } from '@/components/page-title/page-title';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { routes } from '@/constants/routes';
import { iamOrganizationsAPI } from '@/resources/api/iam/organizations.api';
import { getInitials, getPathWithParams, mergeMeta, metaObject } from '@/utils/helpers';
import { AxiosInstance } from 'axios';
import { BookOpenIcon, HomeIcon, PlusIcon, SettingsIcon } from 'lucide-react';
import {
  AppLoadContext,
  data,
  Link,
  LoaderFunctionArgs,
  MetaFunction,
  useLoaderData,
} from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Organizations');
});

export const loader = async ({ context }: LoaderFunctionArgs) => {
  const { apiClient } = context as AppLoadContext;

  const orgAPI = iamOrganizationsAPI(apiClient as AxiosInstance);
  const organizations = await orgAPI.list();

  return data(organizations);
};

export default function AccountOrganizationsIndex() {
  const data = useLoaderData<typeof loader>();

  return data.length > 0 ? (
    <div className="mx-auto flex h-full w-full max-w-(--breakpoint-xl) flex-col gap-4">
      <PageTitle
        title="Organizations"
        description="Manage your organizations"
        actions={
          <Link to={routes.account.organizations.new}>
            <Button>
              <PlusIcon className="size-4" />
              New Organization
            </Button>
          </Link>
        }
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(data ?? [])
          .sort((a, b) => (a?.displayName ?? a.name).localeCompare(b?.displayName ?? b.name))
          .map((org) => (
            <Card
              key={org.id}
              className="hover:bg-accent/50 flex h-40 cursor-pointer flex-col justify-between gap-0 py-0 transition-all"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                // Call Action Set Organization Before Navigation
              }}>
              <CardContent className="px-4 py-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-foreground truncate text-base leading-tight font-semibold">
                        {org?.displayName ?? org.name}
                      </h3>
                      <p className="text-muted-foreground text-xs font-medium tracking-wide">
                        {org.id}
                      </p>
                    </div>
                    {org.status?.personal ? (
                      <Badge variant="secondary" className="border-input shrink-0 border">
                        Personal
                      </Badge>
                    ) : (
                      <Avatar className="size-8 shrink-0 rounded-md">
                        <AvatarFallback className="text-primary-foreground rounded-md bg-slate-400">
                          {getInitials(org?.displayName ?? org.name)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  {Object.keys(org.labels ?? {}).length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      {Object.keys(org.labels ?? {}).map((key) => (
                        <Badge
                          key={key}
                          variant="secondary"
                          className="border-input shrink-0 border">
                          {key}:{org.labels?.[key]}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {/* <div className="pt-2">
                    <MembersAvatar org={org} />
                  </div> */}
                </div>
              </CardContent>
              <CardFooter className="flex flex-row items-center justify-between gap-2 px-4 pb-4">
                <Link
                  to={getPathWithParams(routes.org.root, { orgId: org.id })}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    // Call Action Set Organization Before Navigation
                  }}
                  className="sm text-primary flex h-fit cursor-pointer items-center gap-1 px-0 text-xs no-underline">
                  <HomeIcon className="size-4" />
                  Dashboard
                </Link>

                <Link
                  to={getPathWithParams(routes.org.settings.root, { orgId: org.id })}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    // Call Action Set Organization Before Navigation
                  }}
                  className="sm text-primary flex h-fit cursor-pointer items-center gap-1 px-0 text-xs no-underline">
                  <SettingsIcon className="size-4" />
                  Settings
                </Link>
              </CardFooter>
            </Card>
          ))}
      </div>
    </div>
  ) : (
    <EmptyContent
      title="No organizations found"
      subtitle="There are no organizations to display."
      actions={[
        {
          type: 'external-link',
          label: 'Documentation',
          to: 'https://docs.datum.net/docs/get-started/#organizations',
          variant: 'ghost',
          icon: <BookOpenIcon className="size-4" />,
        },
        {
          type: 'link',
          label: 'New Organization',
          to: routes.account.organizations.new,
        },
      ]}
    />
  );
}
