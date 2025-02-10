import { PlusIcon, CircleArrowOutUpRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Link, useLoaderData, Await } from 'react-router'
import { routes } from '@/constants/routes'
import { projectsControl } from '@/resources/control-plane/projects.control'
import { authMiddleware } from '@/modules/middleware/auth-middleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { getSession } from '@/modules/auth/auth-session.server'
import { OrganizationModel } from '@/resources/gql/models/organization.model'
import { IProjectControlResponse } from '@/resources/interfaces/project.interface'
import { redirectWithToast } from '@/utils/toast.server'
import { Suspense } from 'react'
import { DateFormat } from '@/components/date-format/date-format'
export const loader = withMiddleware(async ({ request }) => {
  try {
    const session = await getSession(request.headers.get('Cookie'))
    if (!session) {
      throw new Error('No session found')
    }

    const org: OrganizationModel = session.get('currentOrg')
    if (!org) {
      throw new Error('No organization found in session')
    }

    const projects = await projectsControl.getProjects(org.userEntityID, request)
    return { projects }
  } catch (error) {
    redirectWithToast(routes.projects.root, {
      title: 'Error!',
      description: error instanceof Error ? error.message : 'Something went wrong',
    })
  }
}, authMiddleware)

export default function OrgProjects() {
  const { projects } = useLoaderData<typeof loader>()

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
            <Link to={routes.projects.new}>
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
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <Suspense
              fallback={
                <TableRow>
                  <TableCell colSpan={4}>Loading...</TableCell>
                </TableRow>
              }>
              <Await resolve={projects}>
                {(projects) =>
                  ((projects ?? []) as IProjectControlResponse[]).map((project) => (
                    <TableRow key={project.name}>
                      <TableCell>
                        <Link
                          className="font-semibold text-primary underline"
                          to={routes.projects.detail(project.name)}>
                          {project.name}
                        </Link>
                      </TableCell>
                      <TableCell>{project.description}</TableCell>
                      <TableCell>
                        <DateFormat date={project.createdAt} />
                      </TableCell>
                      <TableCell className="flex justify-end">
                        <Link to={routes.projects.detail(project.name)}>
                          <Button variant="secondary" size="sm">
                            <CircleArrowOutUpRightIcon className="size-4" />
                            Open Project
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                }
              </Await>
            </Suspense>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
