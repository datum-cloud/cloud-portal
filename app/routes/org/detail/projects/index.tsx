import { DateTime } from '@/components/date-time';
import { useRevalidateOnInterval } from '@/hooks/useRevalidatorInterval';
import { DataTable } from '@/modules/datum-ui/components/data-table/data-table';
import { createProjectsControl } from '@/resources/control-plane';
import { ICachedProject } from '@/resources/interfaces/project.interface';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError } from '@/utils/errors';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button } from '@datum-ui/components';
import { Client } from '@hey-api/client-axios';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowRightIcon, PlusIcon } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import {
  AppLoadContext,
  data,
  Link,
  LoaderFunctionArgs,
  useLoaderData,
  useNavigate,
  useParams,
} from 'react-router';

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  try {
    const { orgId } = params;
    const { controlPlaneClient, cache } = context as AppLoadContext;
    const projectsControl = createProjectsControl(controlPlaneClient as Client);

    if (!orgId) {
      throw new BadRequestError('Organization ID is required');
    }

    const key = `projects:${orgId}`;
    const cachedProjects = (await cache.getItem(key)) as ICachedProject[] | null;

    // Fetch fresh data from API
    const freshProjects = await projectsControl.list(orgId);

    // Merge cached metadata with fresh data
    let mergedProjects: ICachedProject[] = freshProjects;

    if (cachedProjects && Array.isArray(cachedProjects)) {
      mergedProjects = freshProjects.map((freshProject) => {
        const cachedProject = cachedProjects.find((cp) => cp.name === freshProject.name);

        // If cached project has "deleting" status and still exists in API, keep the metadata
        if (cachedProject?._meta?.status === 'deleting') {
          return { ...freshProject, _meta: cachedProject._meta };
        }

        return freshProject;
      });

      // Update cache with merged data
      await cache.setItem(key, mergedProjects);
    } else {
      // No cache exists, save fresh data
      await cache.setItem(key, mergedProjects);
    }

    // Check if any projects are in "deleting" state for polling
    const hasDeleting = mergedProjects.some((p) => p._meta?.status === 'deleting');

    return data({ projects: mergedProjects, shouldPoll: hasDeleting });
  } catch {
    return data({ projects: [], shouldPoll: false });
  }
};

export default function OrgProjectsPage() {
  // revalidate every 10 seconds to keep project list fresh
  const { start: startRevalidator, clear: clearRevalidator } = useRevalidateOnInterval({
    interval: 10000,
  });

  const { orgId } = useParams();
  const { projects, shouldPoll } = useLoaderData<typeof loader>();

  const navigate = useNavigate();

  // Filter out projects that are being deleted
  const visibleProjects = useMemo(
    () => projects.filter((project) => project._meta?.status !== 'deleting'),
    [projects]
  );

  const columns: ColumnDef<ICachedProject>[] = useMemo(
    () => [
      {
        header: 'Description',
        accessorKey: 'description',
        cell: ({ row }) => {
          return <span className="font-medium">{row.original.description}</span>;
        },
      },
      {
        header: 'Resource Name',
        accessorKey: 'name',
      },
      {
        header: 'Creation Date',
        accessorKey: 'createdAt',
        cell: ({ row }) => {
          return row.original.createdAt && <DateTime date={row.original.createdAt} />;
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

  return (
    <DataTable
      columns={columns}
      data={visibleProjects ?? []}
      onRowClick={(row) => {
        if (row.name) {
          return navigate(getPathWithParams(paths.project.detail.root, { projectId: row.name }));
        }

        return undefined;
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
      tableTitle={{
        title: 'Projects',
        actions: (
          <Link to={getPathWithParams(paths.org.detail.projects.new, { orgId })}>
            <Button type="primary" theme="solid" size="small">
              <PlusIcon className="size-4" />
              Add project
            </Button>
          </Link>
        ),
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
  );
}
