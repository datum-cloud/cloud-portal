import { DataTable } from '@/components/data-table/data-table'
import { DataTableRowActionsProps } from '@/components/data-table/data-table.types'
import { DateFormat } from '@/components/date-format/date-format'
import { Button } from '@/components/ui/button'
import { routes } from '@/constants/routes'
import { ProjectStatus } from '@/features/project/status'
import { GraphqlClient } from '@/modules/graphql/graphql'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { createProjectsControl } from '@/resources/control-plane/projects.control'
import { OrganizationModel } from '@/resources/gql/models/organization.model'
import { createOrganizationGql } from '@/resources/gql/organization.gql'
import { IProjectControlResponse } from '@/resources/interfaces/project.interface'
import { CustomError } from '@/utils/errorHandle'
import { transformControlPlaneStatus } from '@/utils/misc'
import { getPathWithParams } from '@/utils/path'
import { Client } from '@hey-api/client-axios'
import { ColumnDef } from '@tanstack/react-table'
import { PlusIcon } from 'lucide-react'
import { useMemo } from 'react'
import {
  AppLoadContext,
  data,
  Link,
  useLoaderData,
  useNavigate,
  useParams,
} from 'react-router'

export const loader = withMiddleware(async ({ params, context }) => {
  const { orgId } = params
  const { controlPlaneClient, gqlClient } = context as AppLoadContext
  const projectsControl = createProjectsControl(controlPlaneClient as Client)
  const orgGql = createOrganizationGql(gqlClient as GraphqlClient)

  if (!orgId) {
    throw new CustomError('Organization ID is required', 400)
  }

  const org: OrganizationModel = await orgGql.getOrganizationDetail(orgId)

  const projects = await projectsControl.list(org.userEntityID)

  return data(projects)
}, authMiddleware)

export default function ProjectsPage() {
  const { orgId } = useParams()
  const projects = useLoaderData<typeof loader>()

  const navigate = useNavigate()

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
        cell: ({ row }) => {
          return (
            row.original.status && (
              <ProjectStatus
                currentStatus={transformControlPlaneStatus(row.original.status)}
                orgId={orgId}
                projectId={row.original.name}
                type="badge"
                badgeClassName="px-0"
              />
            )
          )
        },
      },
      {
        header: 'Creation Date',
        accessorKey: 'createdAt',
        cell: ({ row }) => {
          return row.original.createdAt && <DateFormat date={row.original.createdAt} />
        },
      },
    ],
    [orgId],
  )

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
    ],
    [orgId],
  )

  return (
    <DataTable
      columns={columns}
      data={projects ?? []}
      rowActions={rowActions}
      className="mx-auto max-w-(--breakpoint-lg)"
      loadingText="Loading projects..."
      emptyText="No projects found. Create your first project to get started."
      tableTitle={{
        title: 'Projects',
        description: 'Use projects to organize resources deployed to Datum Cloud',
        actions: (
          <Link to={getPathWithParams(routes.org.projects.new, { orgId })}>
            <Button>
              <PlusIcon className="size-4" />
              New Project
            </Button>
          </Link>
        ),
      }}
      defaultSorting={[{ id: 'createdAt', desc: true }]}
    />
  )
}
