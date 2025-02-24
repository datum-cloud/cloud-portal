import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'

import { ROUTE_PATH as ORG_LIST_PATH } from '@/routes/api+/organizations+/list'
import { Link, useLoaderData, useNavigate } from 'react-router'
import { PageTitle } from '@/components/page-title/page-title'
import { Button } from '@/components/ui/button'
import { PlusIcon, HomeIcon, SettingsIcon } from 'lucide-react'
import { routes } from '@/constants/routes'
import { OrganizationModel } from '@/resources/gql/models/organization.model'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getPathWithParams } from '@/utils/path'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/utils/misc'
import { AvatarStack } from '@/components/ui/avatar-stack'
import { useMemo } from 'react'

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

const MembersAvatar = ({ org }: { org: OrganizationModel }) => {
  const members = useMemo(() => {
    return org.members.map((member) => ({
      name: `${member.user.firstName} ${member.user.lastName}`,
      image: member.user.avatarRemoteURL,
    }))
  }, [org])

  return (
    <AvatarStack
      avatars={members}
      maxAvatarsAmount={6}
      avatarClassName="size-8 border border-input"
    />
  )
}

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
              className="flex h-40 cursor-pointer flex-col justify-between transition-all hover:bg-accent/50"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                navigate(getPathWithParams(routes.org.projects.root, { orgId: org.id }))
              }}>
              <CardContent className="px-4 py-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-semibold leading-tight text-foreground">
                        {org?.name}
                      </h3>
                      <p className="text-xs font-medium tracking-wide text-muted-foreground">
                        {org.userEntityID}
                      </p>
                    </div>
                    {org.personalOrg ? (
                      <Badge variant="secondary" className="shrink-0 border border-input">
                        Personal
                      </Badge>
                    ) : (
                      <Avatar className="size-6 shrink-0 rounded-md">
                        <AvatarFallback className="rounded-md bg-slate-400 text-primary-foreground">
                          {getInitials(org.displayName)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  <div className="pt-2">
                    <MembersAvatar org={org} />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-row items-center justify-between gap-2 px-4 pb-4">
                <Button
                  variant="link"
                  size="sm"
                  className="flex h-fit items-center gap-1 px-0 text-sm text-sunglow"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    navigate(getPathWithParams(routes.org.root, { orgId: org.id }))
                  }}>
                  <HomeIcon className="size-4" />
                  Dashboard
                </Button>
                <Button
                  variant="link"
                  size="sm"
                  className="flex h-fit items-center gap-1 px-0 text-sm text-sunglow"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    navigate(
                      getPathWithParams(routes.org.settings.root, { orgId: org.id }),
                    )
                  }}>
                  <SettingsIcon className="size-4" />
                  Settings
                </Button>
              </CardFooter>
            </Card>
          ))}
      </div>
    </div>
  )
}
