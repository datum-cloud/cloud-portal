import { InputWithCopy } from '@/components/input-with-copy/input-with-copy'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { routes } from '@/constants/routes'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { useConfirmationDialog } from '@/providers/confirmationDialog.provider'
import { IProjectControlResponse } from '@/resources/interfaces/project.interface'
import { CustomError } from '@/utils/errorHandle'
import { getPathWithParams } from '@/utils/path'
import { redirectWithToast } from '@/utils/toast.server'
import { CircleAlertIcon } from 'lucide-react'
import {
  ActionFunctionArgs,
  AppLoadContext,
  useRouteLoaderData,
  useSubmit,
} from 'react-router'

export const action = withMiddleware(
  async ({ request, context, params }: ActionFunctionArgs) => {
    const { projectsControl, cache } = context as AppLoadContext

    switch (request.method) {
      case 'DELETE': {
        const formData = Object.fromEntries(await request.formData())
        const { projectName, orgId: orgEntityId } = formData

        // Invalidate the projects cache
        await cache.removeItem(`projects:${orgEntityId}`)

        await projectsControl.delete(orgEntityId as string, projectName as string)
        return redirectWithToast(
          getPathWithParams(routes.org.projects.root, {
            orgId: params.orgId,
          }),
          {
            title: 'Project deleted successfully',
            description: 'The project has been deleted successfully',
            type: 'success',
          },
        )
      }
      default:
        throw new CustomError('Method not allowed', 405)
    }
  },
  authMiddleware,
)

export default function ProjectSettingsPage() {
  const project = useRouteLoaderData(
    'routes/_private+/$orgId+/projects.$projectId+/_layout',
  )
  const submit = useSubmit()
  const { confirm } = useConfirmationDialog()

  const deleteProject = async (project: IProjectControlResponse) => {
    await confirm({
      title: 'Delete Project',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>
            {project.description} ({project.name})
          </strong>
          ?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      confirmInputLabel: `Type "${project.name}" to confirm.`,
      confirmInputPlaceholder: 'Type the project name to confirm deletion',
      confirmValue: project.name ?? 'delete',
      onSubmit: async () => {
        await submit(
          {
            projectName: project?.name ?? '',
            orgId: project?.organizationId ?? '',
          },
          {
            method: 'DELETE',
            fetcherKey: 'project-resources',
            navigate: false,
          },
        )
      },
    })
  }

  return (
    <div className="mx-auto my-4 w-full max-w-2xl md:my-6">
      <div className="grid grid-cols-1 gap-6">
        {/* Project Name Section */}
        <Card>
          <CardHeader>
            <CardTitle>Project Name</CardTitle>
            <CardDescription>
              Used to identify your Project on the Dashboard, Datum CLI, and in the URL of
              your Deployments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InputWithCopy value={project.name} className="h-9 bg-muted" />
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border border-destructive/50 transition-colors hover:border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <CircleAlertIcon className="size-5 flex-shrink-0" />
              <AlertTitle className="text-sm font-semibold">
                Warning: Destructive Action
              </AlertTitle>
              <AlertDescription>
                This action cannot be undone. Once deleted, this project and all its
                resources will be permanently removed. The project name will be reserved
                and cannot be reused for future projects to prevent deployment conflicts.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex justify-end border-t border-destructive/50 bg-destructive/10 px-6 py-2">
            <Button
              variant="destructive"
              size="sm"
              className="font-medium"
              onClick={() => deleteProject(project)}>
              Delete
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
