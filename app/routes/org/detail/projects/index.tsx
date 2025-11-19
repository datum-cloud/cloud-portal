import { BadgeCopy } from '@/components/badge/badge-copy';
import { DateTime } from '@/components/date-time';
import { useRevalidateOnInterval } from '@/hooks/useRevalidatorInterval';
import { DataTable } from '@/modules/datum-ui/components/data-table';
import { createProjectsControl } from '@/resources/control-plane';
import { ICachedProject } from '@/resources/interfaces/project.interface';
import { ResourceCache, RESOURCE_CACHE_CONFIG } from '@/utils/cache';
import { paths } from '@/utils/config/paths.config';
import { getAlertState, setAlertClosed } from '@/utils/cookies';
import { BadRequestError } from '@/utils/errors';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Alert, AlertDescription, AlertTitle, Button } from '@datum-ui/components';
import { Client } from '@hey-api/client-axios';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowRightIcon, FolderRoot, PlusIcon, TriangleAlert } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import {
  ActionFunctionArgs,
  AppLoadContext,
  data,
  Link,
  LoaderFunctionArgs,
  useFetcher,
  useLoaderData,
  useNavigate,
  useParams,
  useRevalidator,
} from 'react-router';

export const loader = async ({ params, request, context }: LoaderFunctionArgs) => {
  try {
    const { orgId } = params;
    const { controlPlaneClient, cache } = context as AppLoadContext;
    const projectsControl = createProjectsControl(controlPlaneClient as Client);

    if (!orgId) {
      throw new BadRequestError('Organization ID is required');
    }

    // Initialize cache manager for projects
    const projectCache = new ResourceCache<ICachedProject>(
      cache,
      RESOURCE_CACHE_CONFIG.projects,
      RESOURCE_CACHE_CONFIG.projects.getCacheKey(orgId)
    );

    // Fetch fresh data from API
    const freshProjects = await projectsControl.list(orgId);

    // Merge cached metadata with fresh data (handles delayed deletions)
    const mergedProjects = await projectCache.merge(freshProjects);

    // Check if any projects are in "deleting" state for polling
    const hasDeleting = mergedProjects.some((p) => p._meta?.status === 'deleting');

    // Get alert state from server-side cookie
    const { isClosed: alertClosed, headers: alertHeaders } = await getAlertState(
      request,
      'projects_understanding'
    );

    return data(
      { projects: mergedProjects, shouldPoll: hasDeleting, alertClosed },
      { headers: alertHeaders }
    );
  } catch {
    const { isClosed: alertClosed, headers: alertHeaders } = await getAlertState(
      request,
      'projects_understanding'
    );
    return data({ projects: [], shouldPoll: false, alertClosed }, { headers: alertHeaders });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { headers } = await setAlertClosed(request, 'projects_understanding');
  return data({ success: true }, { headers });
};

export default function OrgProjectsPage() {
  // revalidate every 10 seconds to keep project list fresh
  const { start: startRevalidator, clear: clearRevalidator } = useRevalidateOnInterval({
    interval: 10000,
  });

  const { orgId } = useParams();
  const { projects, shouldPoll, alertClosed } = useLoaderData<typeof loader>();

  const navigate = useNavigate();
  const fetcher = useFetcher();
  const revalidator = useRevalidator();

  const showAlert = !alertClosed;

  useEffect(() => {
    if (fetcher.data?.success) {
      revalidator.revalidate();
    }
  }, [fetcher.data, revalidator]);

  const visibleProjects = useMemo(
    () => projects.filter((project) => project._meta?.status !== 'deleting'),
    [projects]
  );

  const columns: ColumnDef<ICachedProject>[] = useMemo(
    () => [
      {
        header: 'Project',
        accessorKey: 'name',
        id: 'name',
        cell: ({ row }) => {
          return (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FolderRoot className="size-4" />
                <span>{row.original.description}</span>
              </div>
              <div className="flex items-center gap-6">
                <BadgeCopy
                  value={row.original.name ?? ''}
                  text={row.original.name ?? ''}
                  badgeTheme="solid"
                  badgeType="quaternary"
                />
                <span className="text-muted-foreground text-xs">
                  Added:{' '}
                  {row.original.createdAt && (
                    <DateTime date={row.original.createdAt} format="yyyy-MM-dd" />
                  )}
                </span>
              </div>
            </div>
          );
        },
      },
    ],
    []
  );

  useEffect(() => {
    if (shouldPoll) {
      startRevalidator();
    } else {
      clearRevalidator();
    }
  }, [shouldPoll, startRevalidator, clearRevalidator]);

  const handleAlertClose = () => {
    // Save the close state via server-side cookie
    fetcher.submit({}, { method: 'POST' });
  };

  return (
    <div className="mx-auto flex w-full flex-col gap-6">
      <DataTable
        hideHeader
        mode="card"
        hidePagination
        columns={columns}
        data={visibleProjects ?? []}
        onRowClick={(row) => {
          if (row.name) {
            return navigate(getPathWithParams(paths.project.detail.root, { projectId: row.name }));
          }

          return undefined;
        }}
        tableTitle={{
          title: 'Projects',
          actions: (
            <Link to={getPathWithParams(paths.org.detail.projects.new, { orgId })}>
              <Button type="primary" theme="solid" size="small">
                <PlusIcon className="size-4" />
                Create project
              </Button>
            </Link>
          ),
        }}
        emptyContent={{
          title: "Looks like you don't have any projects added yet",
          actions: [
            {
              type: 'link',
              label: 'Add a project',
              to: getPathWithParams(paths.org.detail.projects.new, { orgId }),
              variant: 'default',
              icon: <ArrowRightIcon className="size-4" />,
              iconPosition: 'end',
            },
          ],
        }}
        toolbar={{
          layout: 'compact',
          includeSearch: {
            placeholder: 'Search projects',
            filterKey: 'q',
          },
        }}
        defaultSorting={[{ id: 'createdAt', desc: true }]}
      />

      {showAlert && (
        <Alert variant="warning" closable onClose={handleAlertClose}>
          <TriangleAlert className="size-4" />
          <AlertTitle>Understanding Projects</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Projects are dedicated instances on Datum Cloud.</li>
              <li>You can use them to manage your core network services, workloads, and assets.</li>
              <li>There is no limit to how many you create.</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
