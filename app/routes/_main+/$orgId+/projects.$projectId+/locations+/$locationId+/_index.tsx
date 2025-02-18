import { withMiddleware } from '@/modules/middleware/middleware'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { routes } from '@/constants/routes'
import { redirect } from 'react-router'
import { getPathWithParams } from '@/utils/path'

export const loader = withMiddleware(async ({ params }) => {
  const { orgId, projectId, locationId } = params

  const path = getPathWithParams(routes.projects.locations.edit, {
    orgId,
    projectId,
    locationId,
  })
  return redirect(path)
}, authMiddleware)
