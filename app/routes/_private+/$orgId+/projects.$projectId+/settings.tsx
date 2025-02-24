import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { InputWithAddons } from '@/components/ui/input-with-addons'
import { useRouteLoaderData, useSubmit, useNavigate, useParams } from 'react-router'
import { CircleAlertIcon, CopyIcon } from 'lucide-react'
import { useState } from 'react'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'
import { toast } from 'sonner'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { useConfirmationDialog } from '@/providers/confirmationDialog.provider'
import { IProjectControlResponse } from '@/resources/interfaces/project.interface'
import { ROUTE_PATH as PROJECT_RESOURCES_ROUTE_PATH } from '@/routes/api+/projects+/resources'
import { getPathWithParams } from '@/utils/path'
import { routes } from '@/constants/routes'

export default function ProjectSettingsPage() {
  const project = useRouteLoaderData(
    'routes/_private+/$orgId+/projects.$projectId+/_layout',
  )
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, copy] = useCopyToClipboard()
  const submit = useSubmit()
  const { confirm } = useConfirmationDialog()
  const navigate = useNavigate()
  const params = useParams()

  const [copied, setCopied] = useState(false)

  const copyProjectName = () => {
    copy(project.name).then(() => {
      toast.success('Project name copied to clipboard')
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
      }, 2000)
    })
  }

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
            action: PROJECT_RESOURCES_ROUTE_PATH,
            fetcherKey: 'project-resources',
            navigate: false,
          },
        )

        // TODO: add interval to check if the project is deleted. Use the fetcher key to check if the project is deleted
        // I did't do this because the data already gone after the delete action

        toast.success('Project deleted successfully')
        return navigate(
          getPathWithParams(routes.org.projects.root, {
            orgId: params.orgId,
          }),
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
            <InputWithAddons
              value={project?.name}
              readOnly
              disabled
              containerClassName="focus-within:ring-0"
              trailing={
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 w-fit gap-1 border px-2 text-xs transition-all hover:border-primary"
                  onClick={copyProjectName}>
                  <CopyIcon className="!size-3" />
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              }
            />
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
