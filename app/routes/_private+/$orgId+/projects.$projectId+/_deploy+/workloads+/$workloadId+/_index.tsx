import { routes } from '@/constants/routes'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { getPathWithParams } from '@/utils/path'
import { redirect } from 'react-router'

export const loader = withMiddleware(async ({ params }) => {
  const { projectId, orgId, workloadId } = params

  return redirect(
    getPathWithParams(routes.projects.deploy.workloads.detail.overview, {
      orgId,
      projectId,
      workloadId,
    }),
  )
}, authMiddleware)
