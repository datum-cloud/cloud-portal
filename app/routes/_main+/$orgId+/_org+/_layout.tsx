import { DashboardLayout } from '@/layouts/dashboard/dashboard'
import { data, Outlet, useLoaderData, useParams } from 'react-router'
import { NavItem } from '@/layouts/dashboard/sidebar/nav-main'
import { routes } from '@/constants/routes'
import { FileIcon, SettingsIcon } from 'lucide-react'
import { OrganizationItem } from '@/components/select-organization/organization-item'
import { useApp } from '@/providers/app.provider'
import { authMiddleware } from '@/modules/middleware/auth-middleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { organizationGql } from '@/resources/gql/organization.gql'
import { OrganizationModel } from '@/resources/gql/models/organization.model'
import { useEffect, useMemo } from 'react'
import { getSession, commitSession } from '@/modules/auth/auth-session.server'
import { getPathWithParams } from '@/utils/path'

export const loader = withMiddleware(async ({ request, params }) => {
  const { orgId } = params

  if (!orgId) {
    throw new Response('No organization ID found', { status: 401 })
  }

  const org: OrganizationModel = await organizationGql.getOrganizationDetail(orgId)

  // Update the current organization in session
  const session = await getSession(request.headers.get('Cookie'))
  session.set('currentOrgId', org.id)
  session.set('currentOrgEntityID', org.userEntityID)

  return data(
    { org },
    {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    },
  )
}, authMiddleware)

export default function OrgLayout() {
  const { orgId } = useParams()
  const { org: organization } = useLoaderData<typeof loader>()
  const { setOrganization } = useApp()

  useEffect(() => {
    setOrganization(organization)
  }, [organization])

  const navItems: NavItem[] = useMemo(() => {
    return [
      {
        title: 'Platform',
        href: getPathWithParams(routes.org.root, { orgId }),
        type: 'group',
        children: [
          {
            title: 'Projects',
            href: getPathWithParams(routes.projects.root, { orgId }),
            type: 'link',
            icon: FileIcon,
          },
          {
            title: 'Settings',
            href: getPathWithParams(routes.org.settings.root, { orgId }),
            type: 'link',
            icon: SettingsIcon,
          },
        ],
      },
    ]
  }, [orgId])

  return (
    <DashboardLayout
      navItems={navItems}
      headerContent={
        <OrganizationItem
          org={organization!}
          className="ml-2 max-w-52 md:max-w-none"
          hideAvatar
        />
      }
      sidebarCollapsible="icon"
      homeLink={getPathWithParams(routes.org.root, {
        orgId,
      })}>
      <Outlet />
    </DashboardLayout>
  )
}
