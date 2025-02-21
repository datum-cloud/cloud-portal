import { AppLoadContext, redirect, useRevalidator } from 'react-router'
import { routes } from '@/constants/routes'
import { getPathWithParams } from '@/utils/path'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { useEffect } from 'react'

import WaitingPage from '@/components/waiting-page/waiting-page'
import { getSession } from '@/modules/auth/authSession.server'
import { CustomError } from '@/utils/errorHandle'
// TODO: temporary solution for handle delay on new project
// https://github.com/datum-cloud/cloud-portal/issues/45
export const loader = withMiddleware(async ({ request, params, context }) => {
  const { projectsControl } = context as AppLoadContext

  try {
    const { orgId } = params
    const projectId = new URL(request.url).searchParams.get('projectId')

    if (!projectId) {
      throw new CustomError('No project ID found', 404)
    }

    const session = await getSession(request.headers.get('Cookie'))
    const orgEntityId: string = session.get('currentOrgEntityID')

    await projectsControl.getProject(orgEntityId, projectId)

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
