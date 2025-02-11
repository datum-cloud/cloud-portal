import { redirect, useRevalidator } from 'react-router'
import { routes } from '@/constants/routes'
import { getSession } from '@/modules/auth/auth-session.server'
import { getPathWithParams } from '@/utils/path'
import { authMiddleware } from '@/modules/middleware/auth-middleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { projectsControl } from '@/resources/control-plane/projects.control'
import { useEffect } from 'react'

import WaitingPage from '@/components/waiting-page/waiting-page'

// TODO: temporary solution for handle delay on new project
// https://github.com/datum-cloud/cloud-portal/issues/45
export const loader = withMiddleware(async ({ request, params }) => {
  try {
    const { orgId } = params

    if (!orgId) {
      throw new Error('Organization ID is required')
    }

    const projectId = new URL(request.url).searchParams.get('projectId')

    if (!projectId) {
      throw new Error('Project ID is required')
    }

    const session = await getSession(request.headers.get('Cookie'))
    const orgEntityId: string = session.get('currentOrgEntityID')

    await projectsControl.getProject(orgEntityId, projectId, request)

    return redirect(
      getPathWithParams(routes.projects.dashboard, {
        orgId,
        projectId,
      }),
    )

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return null
  }
}, authMiddleware)

export default function ProjectSetupPage() {
  const { revalidate } = useRevalidator()

  useEffect(() => {
    const id = setInterval(revalidate, 5000)

    return () => {
      clearInterval(id)
    }
  }, []) // Run only on mount

  return <WaitingPage title="Setting up project" className="border-none shadow-none" />
}
