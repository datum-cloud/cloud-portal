import { DataTable } from '@/components/data-table/data-table';
import { DataTableRowActionsProps } from '@/components/data-table/data-table.types';
import { DateFormat } from '@/components/date-format/date-format';
import { Button } from '@/components/ui/button';
import { routes } from '@/constants/routes';
import { ProjectStatus } from '@/features/project/status';
import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { useApp } from '@/providers/app.provider';
import { createProjectsControl } from '@/resources/control-plane/projects.control';
import { IProjectControlResponse } from '@/resources/interfaces/project.interface';
import { CustomError } from '@/utils/errorHandle';
import { transformControlPlaneStatus } from '@/utils/misc';
import { getPathWithParams } from '@/utils/path';
import { Client } from '@hey-api/client-axios';
import { ColumnDef } from '@tanstack/react-table';
import { BookOpenIcon, PlusIcon } from 'lucide-react';
import { useMemo } from 'react';
import { AppLoadContext, data, Link, useLoaderData, useNavigate } from 'react-router';

export const loader = withMiddleware(async ({ params, context }) => {
  const { orgId } = params;
  const { controlPlaneClient } = context as AppLoadContext;
  const projectsControl = createProjectsControl(controlPlaneClient as Client);

  if (!orgId) {
    throw new CustomError('Organization ID is required', 400);
  }

  const projects = await projectsControl.list(orgId);

  return data(projects);
}, authMiddleware);

export default function ProjectsPage() {
  const { orgId } = useApp();
  const projects = useLoaderData<typeof loader>() as IProjectControlResponse[];

  const navigate = useNavigate();

  const columns: ColumnDef<IProjectControlResponse>[] = useMemo(
    () => [
      {
        header: 'Description',
        accessorKey: 'description',
        cell: ({ row }) => {
          return (
            <Link
              className="text-primary leading-none font-semibold"
              to={getPathWithParams(routes.projects.detail, {
                orgId,
                projectId: row.original.name,
              })}>
              {row.original.description}
            </Link>
          );
        },
      },
      {
        header: 'Name',
        accessorKey: 'name',
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => {
          return (
            row.original.status && (
              <ProjectStatus
                currentStatus={transformControlPlaneStatus(row.original.status)}
                projectId={row.original.name}
                type="badge"
                badgeClassName="px-0"
              />
            )
          );
        },
      },
      {
        header: 'Creation Date',
        accessorKey: 'createdAt',
        cell: ({ row }) => {
          return row.original.createdAt && <DateFormat date={row.original.createdAt} />;
        },
      },
    ],
    [orgId]
  );

  const rowActions: DataTableRowActionsProps<IProjectControlResponse>[] = useMemo(
    () => [
      {
        key: 'locations',
        label: 'Locations',
        action: (row) => {
          navigate(
            getPathWithParams(routes.projects.locations.root, {
              orgId,
              projectId: row.name,
            })
          );
        },
      },
      {
        key: 'settings',
        label: 'Settings',
        action: (row) => {
          navigate(getPathWithParams(routes.projects.settings, { orgId, projectId: row.name }));
        },
      },
    ],
    [orgId]
  );

  return (
    <DataTable
      columns={columns}
      data={projects ?? []}
      rowActions={rowActions}
      emptyContent={{
        title: 'No projects found.',
        subtitle: 'Create your first project to get started.',
        actions: [
          {
            type: 'external-link',
            label: 'Documentation',
            to: 'https://docs.datum.net/docs/tasks/create-project/',
            variant: 'ghost',
            icon: <BookOpenIcon className="size-4" />,
          },
          {
            type: 'link',
            label: 'New Project',
            to: getPathWithParams(routes.org.projects.new, { orgId }),
            variant: 'default',
            icon: <PlusIcon className="size-4" />,
          },
        ],
      }}
      tableTitle={{
        title: 'Projects',
        description: 'Use projects to organize resources deployed to Datum Cloud',
        actions:
          (projects ?? ([] as IProjectControlResponse[])).length > 0 ? (
            <Link to={getPathWithParams(routes.org.projects.new, { orgId })}>
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
