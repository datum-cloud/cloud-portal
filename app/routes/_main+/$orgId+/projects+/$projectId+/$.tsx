import { ComingSoon } from '@/components/coming-soon/coming-soon'
import { BreadcrumbMatch } from '@/layouts/dashboard/header/breadcrumb'
import { getLastPathSegment } from '@/utils/path'

export const handle = {
  breadcrumb: (match: BreadcrumbMatch) => <>{getLastPathSegment(match.pathname)}</>,
}
// TODO: temporary Solution for handle development page
export default function AllRoutes() {
  return <ComingSoon />
}
