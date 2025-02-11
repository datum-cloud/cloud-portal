import { redirect, useRevalidator } from 'react-router'

import { routes } from '@/constants/routes'
import { getSession } from '@/modules/auth/auth-session.server'
import { getPathWithParams } from '@/utils/path'
import { authMiddleware } from '@/modules/middleware/auth-middleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { projectsControl } from '@/resources/control-plane/projects.control'
import { IProjectControlResponse } from '@/resources/interfaces/project.interface'
import { useEffect } from 'react'

import WaitingPage from '@/components/waiting-page/waiting-page'
import PublicLayout from '@/layouts/public/public'

// TODO: temporary solution for handle delay on new organization
// https://github.com/datum-cloud/cloud-portal/issues/43
export const loader = withMiddleware(async ({ request, params }) => {
  try {
    const session = await getSession(request.headers.get('Cookie'))

    const controlPlaneToken = session.get('controlPlaneToken')
    const orgEntityID = session.get('currentOrgEntityID')

    // Check if the organization has a project.
    // If not, redirect to the project creation page and hide the sidebar.
    // If yes, redirect to the home page.
    await projectsControl.setToken(request, controlPlaneToken)
    const projects: IProjectControlResponse[] =
      await projectsControl.getProjects(orgEntityID)
    const hasProject = projects.length > 0

    // TODO: change to the org root when the dashboard is ready
    // Redirect to the home page if the organization has a project.
    // Otherwise, redirect to the project creation page and hide the sidebar.
    const redirectPath = hasProject
      ? getPathWithParams(routes.projects.root, { orgId: params.orgId })
      : `${getPathWithParams(routes.projects.new, { orgId: params.orgId })}?sidebar=false`

    return redirect(redirectPath)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return null
  }
}, authMiddleware)

export default function OrgSetupPage() {
  const { revalidate } = useRevalidator()

  useEffect(() => {
    const id = setInterval(revalidate, 5000)

    return () => {
      clearInterval(id)
    }
  }, []) // Run only on mount

  return (
    <PublicLayout>
      <WaitingPage title="Setting up organization" />
    </PublicLayout>
  )
}
