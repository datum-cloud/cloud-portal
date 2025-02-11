import { PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Link, useLoaderData, useParams, useRevalidator } from 'react-router'
import { routes } from '@/constants/routes'
import { projectsControl } from '@/resources/control-plane/projects.control'
import { authMiddleware } from '@/modules/middleware/auth-middleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { getSession } from '@/modules/auth/auth-session.server'
import { IProjectControlResponse } from '@/resources/interfaces/project.interface'
import { redirectWithToast } from '@/utils/toast.server'
import { useEffect } from 'react'
import { DateFormat } from '@/components/date-format/date-format'
import { getPathWithParams } from '@/utils/path'

export const loader = withMiddleware(async ({ request, params }) => {
  try {
    const session = await getSession(request.headers.get('Cookie'))
    if (!session) {
      throw new Error('No session found')
    }

    const orgEntityID = session.get('currentOrgEntityID')

    if (!orgEntityID) {
      throw new Error('No organization entity ID found')
    }

    const projects = await projectsControl.getProjects(orgEntityID, request)
    return { projects, orgId: params.orgId }
  } catch (error) {
    redirectWithToast(getPathWithParams(routes.projects.root, { orgId: params?.orgId }), {
      title: 'Error!',
      description: error instanceof Error ? error.message : 'Something went wrong',
    })
  }
}, authMiddleware)

const TableSkeleton = () => {
  return (
    <TableRow>
      <TableCell colSpan={3}>Loading...</TableCell>
    </TableRow>
  )
}

export default function OrgProjects() {
  const { orgId } = useParams()
  const { projects } = useLoaderData<typeof loader>()
  const revalidator = useRevalidator()

  useEffect(() => {
    revalidator.revalidate()
  }, [orgId])

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-screen-lg flex-col items-center gap-4">
        <div className="flex w-full items-center justify-between">
          <div className="flex flex-col justify-start gap-2">
            <h1 className="text-2xl font-bold">Projects</h1>
            <p className="text-sm text-muted-foreground">
              Use projects to organize resources deployed to Datum Cloud
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Link to={getPathWithParams(routes.projects.new, { orgId })}>
              <Button>
                <PlusIcon className="h-4 w-4" />
                New Project
              </Button>
            </Link>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>

              <TableHead>Creation Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {revalidator.state === 'loading' ? (
              <TableSkeleton />
            ) : ((projects ?? []) as IProjectControlResponse[]).length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center">
                  <p className="text-muted-foreground">
                    No projects found. Create your first project to get started.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              ((projects ?? []) as IProjectControlResponse[]).map((project) => (
                <TableRow key={project.name}>
                  <TableCell>
                    <Link
                      className="font-semibold text-primary"
                      to={getPathWithParams(routes.projects.detail, {
                        orgId,
                        projectId: project.name,
                      })}>
                      {project.name}
                    </Link>
                  </TableCell>
                  <TableCell>{project.description}</TableCell>
                  <TableCell>
                    <DateFormat date={project.createdAt} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
