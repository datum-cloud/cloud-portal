import { DataTable } from '@/components/data-table/data-table'
import { DataTableRowActionsProps } from '@/components/data-table/data-table.types'
import { DateFormat } from '@/components/date-format/date-format'
import { ProjectStatus } from '@/components/project-status/project-status'
import { Button } from '@/components/ui/button'
import { routes } from '@/constants/routes'
import { IProjectControlResponse } from '@/resources/interfaces/project.interface'
import { getPathWithParams } from '@/utils/path'
import { ColumnDef } from '@tanstack/react-table'
import { PlusIcon } from 'lucide-react'
import { Link, useNavigate, useParams, useRouteLoaderData } from 'react-router'

export default function OrgProjects() {
  const { projects } = useRouteLoaderData('routes/_private+/$orgId+/_layout')
  const { orgId } = useParams()
  const navigate = useNavigate()

  const columns: ColumnDef<IProjectControlResponse>[] = [
    {
      header: 'Description',
      accessorKey: 'description',
      cell: ({ row }) => {
        return (
          <Link
            className="font-semibold text-primary"
            to={getPathWithParams(routes.projects.detail, {
              orgId,
              projectId: row.original.name,
            })}>
            {row.original.description}
          </Link>
        )
      },
    },
    {
      header: 'Name',
      accessorKey: 'name',
    },
    {
      header: 'Status',
      accessorKey: 'status',
      enableSorting: false,
      cell: ({ row }) => {
        return row.original.status && <ProjectStatus status={row.original.status} />
      },
    },
    {
      header: 'Creation Date',
      accessorKey: 'createdAt',
      cell: ({ row }) => {
        return row.original.createdAt && <DateFormat date={row.original.createdAt} />
      },
    },
  ]

  const rowActions: DataTableRowActionsProps<IProjectControlResponse>[] = [
    {
      key: 'locations',
      label: 'Locations',
      action: (row) => {
        navigate(
          getPathWithParams(routes.projects.locations.root, {
            orgId,
            projectId: row.name,
          }),
        )
      },
    },
    {
      key: 'settings',
      label: 'Settings',
      action: (row) => {
        navigate(
          getPathWithParams(routes.projects.settings, { orgId, projectId: row.name }),
        )
      },
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={projects ?? []}
      rowActions={rowActions}
      className="mx-auto max-w-screen-lg"
      loadingText="Loading projects..."
      emptyText="No projects found. Create your first project to get started."
      tableTitle={{
        title: 'Projects',
        description: 'Use projects to organize resources deployed to Datum Cloud',
        actions: (
          <Link to={getPathWithParams(routes.org.projects.new, { orgId })}>
            <Button>
              <PlusIcon className="h-4 w-4" />
              New Project
            </Button>
          </Link>
        ),
      }}
      defaultSorting={[{ id: 'createdAt', desc: true }]}
    />
  )
}
