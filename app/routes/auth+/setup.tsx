import { useRevalidator } from 'react-router'

import { routes } from '@/constants/routes'
import { getSession } from '@/modules/auth/auth-session.server'
import { getPathWithParams } from '@/utils/path'
import { authMiddleware } from '@/modules/middleware/auth-middleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Logo } from '@/components/logo/logo'
import { useTheme } from '@/hooks/useTheme'
import { Loader2 } from 'lucide-react'
import { projectsControl } from '@/resources/control-plane/projects.control'
import { IProjectControlResponse } from '@/resources/interfaces/project.interface'
import { useEffect } from 'react'
import { redirectWithToast } from '@/utils/toast.server'

export const loader = withMiddleware(async ({ request }) => {
  try {
    const session = await getSession(request.headers.get('Cookie'))

    const controlPlaneToken = session.get('controlPlaneToken')
    const orgEntityID = session.get('currentOrgEntityID')
    const orgID = session.get('currentOrgId')

    // Check if the organization has a project.
    // If not, redirect to the project creation page and hide the sidebar.
    // If yes, redirect to the home page.
    await projectsControl.setToken(request, controlPlaneToken)
    const projects: IProjectControlResponse[] =
      await projectsControl.getProjects(orgEntityID)
    const hasProject = projects.length > 0

    // Redirect to the home page if the organization has a project.
    // Otherwise, redirect to the project creation page and hide the sidebar.
    const redirectPath = hasProject
      ? getPathWithParams(routes.org.root, { orgId: orgID })
      : `${getPathWithParams(routes.projects.new, { orgId: orgID })}?sidebar=false`

    return redirectWithToast(redirectPath, {
      title: 'Welcome to Datum Cloud',
      description: 'You have successfully signed in.',
    })
  } catch (error) {
    console.error(error)
    return null
  }
}, authMiddleware)

export default function AuthSetupPage() {
  const theme = useTheme()
  const { revalidate } = useRevalidator()

  useEffect(() => {
    const id = setInterval(revalidate, 5000)

    return () => {
      clearInterval(id)
    }
  }, []) // Run only on mount

  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden">
        <CardContent className="grid min-h-[500px]">
          <div className="flex flex-col items-center justify-center gap-6">
            <Logo asIcon width={64} theme={theme} className="mb-4" />
            <h1 className="w-full text-center text-2xl font-bold">
              Setting up your account
            </h1>
            <Loader2 className="size-10 animate-spin" />
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-center">
          <div className="text-balance text-center text-muted-foreground">
            While you wait, check out the Datum{' '}
            <a
              href="https://docs.datum.net/"
              target="_blank"
              rel="noreferrer"
              className="ml-1 text-sunglow underline">
              Documentation
            </a>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
