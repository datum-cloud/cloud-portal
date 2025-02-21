import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'

import { ROUTE_PATH as ORG_LIST_PATH } from '@/routes/api+/organizations+/list'
import { Link, useLoaderData, useNavigate } from 'react-router'
import { PageTitle } from '@/components/page-title/page-title'
import { Button } from '@/components/ui/button'
import { PlusIcon } from 'lucide-react'
import { routes } from '@/constants/routes'
import { OrganizationModel } from '@/resources/gql/models/organization.model'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getPathWithParams } from '@/utils/path'

export const loader = withMiddleware(async ({ request }) => {
  const orgs = await fetch(`${process.env.APP_URL}${ORG_LIST_PATH}`, {
    method: 'GET',
    headers: {
      Cookie: request.headers.get('Cookie') || '',
    },
  })

  const data = await orgs.json()
  return data
}, authMiddleware)

export default function AccountOrganizations() {
  const navigate = useNavigate()
  const orgs: OrganizationModel[] = useLoaderData<typeof loader>()

  return (
    <div className="mx-auto flex h-full w-full max-w-screen-xl flex-col gap-4">
      <PageTitle
        title="Organizations"
        description="Manage your organizations"
        actions={
          <Link to={routes.account.organizations.new}>
            <Button>
              <PlusIcon className="h-4 w-4" />
              New Organization
            </Button>
          </Link>
        }
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(orgs ?? [])
          .sort((a, b) => a.displayName.localeCompare(b.displayName))
          .map((org) => (
            <Card
              key={org.id}
              className="h-40 cursor-pointer transition-all hover:bg-accent/50"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                navigate(getPathWithParams(routes.projects.root, { orgId: org.id }))
              }}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 px-4 pb-2 pt-4">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-semibold">
                    {org.displayName}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    {org.userEntityID}
                  </CardDescription>
                </div>
                {/* <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mt-0 size-5"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()

                        navigate(
                          getPathWithParams(routes.org.settings.root, { orgId: org.id }),
                        )
                      }}>
                      <SettingsIcon className="size-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Settings</p>
                  </TooltipContent>
                </Tooltip> */}
              </CardHeader>
              <CardContent className="px-4">
                {org.personalOrg && (
                  <Badge variant="secondary" className="border">
                    Personal
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  )
}
