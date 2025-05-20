import { PageTitle } from '@/components/page-title/page-title'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { routes } from '@/constants/routes'
import { IOrganization } from '@/resources/interfaces/organization.inteface'
import { ROUTE_PATH as ORG_LIST_PATH } from '@/routes/api+/organizations+/_index'
import { CustomError } from '@/utils/errorHandle'
import { getInitials } from '@/utils/misc'
import { getPathWithParams } from '@/utils/path'
import { HomeIcon, PlusIcon, SettingsIcon } from 'lucide-react'
import { Link, useLoaderData, useNavigate, LoaderFunctionArgs } from 'react-router'

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const req = await fetch(`${process.env.APP_URL}${ORG_LIST_PATH}`, {
    method: 'GET',
    headers: {
      Cookie: request.headers.get('Cookie') || '',
    },
  })

  const res = await req.json()
  if (!res.success) {
    throw new CustomError(res.error, res.status)
  }

  const data = res.data
  return data
}

// TODO: implement members avatar when the API is ready
/* const MembersAvatar = ({ org }: { org: IOrganization }) => {
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
} */

export default function AccountOrganizations() {
  const navigate = useNavigate()
  const orgs: IOrganization[] = useLoaderData<typeof loader>()

  return (
    <div className="mx-auto flex h-full w-full max-w-(--breakpoint-xl) flex-col gap-4">
      <PageTitle
        title="Organizations"
        description="Manage your organizations"
        actions={
          <Link to={routes.account.organizations.new}>
            <Button>
              <PlusIcon className="size-4" />
              New Organization
            </Button>
          </Link>
        }
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(orgs ?? [])
          .sort((a, b) =>
            (a?.displayName ?? a.name).localeCompare(b?.displayName ?? b.name),
          )
          .map((org) => (
            <Card
              key={org.id}
              className="hover:bg-accent/50 flex h-40 cursor-pointer flex-col justify-between gap-0 py-0 transition-all"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                navigate(getPathWithParams(routes.org.projects.root, { orgId: org.id }))
              }}>
              <CardContent className="px-4 py-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-foreground truncate text-base leading-tight font-semibold">
                        {org?.displayName ?? org.name}
                      </h3>
                      <p className="text-muted-foreground text-xs font-medium tracking-wide">
                        {org.id}
                      </p>
                    </div>
                    {org.status?.personal ? (
                      <Badge variant="secondary" className="border-input shrink-0 border">
                        Personal
                      </Badge>
                    ) : (
                      <Avatar className="size-8 shrink-0 rounded-md">
                        <AvatarFallback className="text-primary-foreground rounded-md bg-slate-400">
                          {getInitials(org?.displayName ?? org.name)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  {Object.keys(org.labels ?? {}).length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      {Object.keys(org.labels ?? {}).map((key) => (
                        <Badge
                          key={key}
                          variant="secondary"
                          className="border-input shrink-0 border">
                          {key}:{org.labels?.[key]}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {/* <div className="pt-2">
                    <MembersAvatar org={org} />
                  </div> */}
                </div>
              </CardContent>
              <CardFooter className="flex flex-row items-center justify-between gap-2 px-4 pb-4">
                <Link
                  to={getPathWithParams(routes.org.root, { orgId: org.id })}
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    navigate(getPathWithParams(routes.org.root, { orgId: org.id }))
                  }}
                  className="sm text-primary flex h-fit cursor-pointer items-center gap-1 px-0 text-xs no-underline">
                  <HomeIcon className="size-4" />
                  Dashboard
                </Link>

                <Link
                  to={getPathWithParams(routes.org.settings.root, { orgId: org.id })}
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    navigate(
                      getPathWithParams(routes.org.settings.root, { orgId: org.id }),
                    )
                  }}
                  className="sm text-primary flex h-fit cursor-pointer items-center gap-1 px-0 text-xs no-underline">
                  <SettingsIcon className="size-4" />
                  Settings
                </Link>
              </CardFooter>
            </Card>
          ))}
      </div>
    </div>
  )
}
