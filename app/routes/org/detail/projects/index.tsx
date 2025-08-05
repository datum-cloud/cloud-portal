import { DataTable } from '@/components/data-table/data-table';
import { DateFormat } from '@/components/date-format/date-format';
import { Button } from '@/components/ui/button';
import { paths } from '@/config/paths';
import { useRevalidateOnInterval } from '@/hooks/useRevalidatorInterval';
import { createProjectsControl } from '@/resources/control-plane/projects.control';
import { IProjectControlResponse } from '@/resources/interfaces/project.interface';
import { CustomError } from '@/utils/error';
import { getPathWithParams } from '@/utils/path';
import { Client } from '@hey-api/client-axios';
import { ColumnDef } from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';
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

export const loader = async ({ request, params, context }: LoaderFunctionArgs) => {
  try {
    const { orgId } = params;
    const { controlPlaneClient } = context as AppLoadContext;
    const projectsControl = createProjectsControl(controlPlaneClient as Client);

    if (!orgId) {
      throw new CustomError('Organization ID is required', 400);
    }

    const projects = await projectsControl.list(orgId);

    // this is for handle the delete flow, since the delete action has deprovisioning process
    const url = new URL(request.url);
    let lastDeletedId = url.searchParams.get('deletedId');

    if (lastDeletedId) {
      // Check if the deleted project still exists in the project list
      const deletedProjectExists = projects.some((project) => project.name === lastDeletedId);
      if (!deletedProjectExists) {
        lastDeletedId = null;
      }
    }

    return data({ projects, deletedId: lastDeletedId });
  } catch {
    return data({ projects: [], deletedId: null });
  }
};

export default function OrgProjectsPage() {
  // revalidate every 10 seconds to keep workload list fresh
  const { start: startRevalidator, clear: clearRevalidator } = useRevalidateOnInterval({
    interval: 10000,
  });

  const { orgId } = useParams();
  const { projects, deletedId } = useLoaderData<typeof loader>();

  const navigate = useNavigate();

  const columns: ColumnDef<IProjectControlResponse>[] = useMemo(
    () => [
      {
        header: 'Description',
        accessorKey: 'description',
        cell: ({ row }) => {
          return (
            <span className="text-primary leading-none font-semibold">
              {row.original.description}
            </span>
          );
        },
      },
      {
        header: 'Name',
        accessorKey: 'name',
      },
      {
        header: 'Creation Date',
        accessorKey: 'createdAt',
        cell: ({ row }) => {
          return row.original.createdAt && <DateFormat date={row.original.createdAt} />;
        },
      },
    ],
    []
  );

  useEffect(() => {
    if (deletedId) {
      // If deletedId exists, we're already handling it in the loader
      startRevalidator();
    } else {
      clearRevalidator();

      // If deletedId is null, remove it from URL params
      const url = new URL(window.location.href);
      if (url.searchParams.has('deletedId')) {
        url.searchParams.delete('deletedId');
        navigate(url.pathname + url.search);
      }
    }
  }, [deletedId]);

  return (
    <DataTable
      columns={columns}
      data={projects ?? []}
      onRowClick={(row) => {
        if (row.name && row.name !== deletedId) {
          return navigate(getPathWithParams(paths.project.detail.root, { projectId: row.name }));
        }

        return undefined;
      }}
      rowClassName={(row) => {
        if (row.name && row.name === deletedId) {
          return 'pointer-events-none opacity-50';
        }

        return '';
      }}
      emptyContent={{
        title: 'No projects found.',
        subtitle: 'Create your first project to get started.',
        actions: [
          {
            type: 'link',
            label: 'New Project',
            to: getPathWithParams(paths.org.detail.projects.new, { orgId }),
            variant: 'default',
            icon: <PlusIcon className="size-4" />,
          },
        ],
      }}
      tableTitle={{
        title: 'Projects',
        description: 'Use projects to organize resources deployed to Datum Cloud',
        actions:
          ((projects ?? []) as IProjectControlResponse[]).length > 0 ? (
            <Link to={getPathWithParams(paths.org.detail.projects.new, { orgId })}>
              <Button>
                <PlusIcon className="size-4" />
                New Project
              </Button>
            </Link>
          ) : null,
      }}
      defaultSorting={[{ id: 'createdAt', desc: true }]}
    />
  );
}
