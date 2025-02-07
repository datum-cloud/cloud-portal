import {
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown'
import { CheckIcon, Loader2, Settings } from 'lucide-react'
import { useApp } from '@/providers/app.provider'
import { useFetcher } from 'react-router'
import { useEffect } from 'react'
import { OrganizationModel } from '@/resources/gql/models/organization.model'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

import { ROUTE_PATH as ORG_LIST_PATH } from '@/routes/api+/organization+/list'

export const OrganizationSwitcher = () => {
  const { organization: currentOrg } = useApp()
  const fetcher = useFetcher({ key: 'org-list' })

  useEffect(() => {
    fetcher.load(ORG_LIST_PATH)
  }, [])

  return (
    <>
      <DropdownMenuLabel className="flex items-center justify-between">
        <span>My Organizations</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-4">
              <Settings className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <span>Settings</span>
          </TooltipContent>
        </Tooltip>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        {fetcher.state === 'loading' ? (
          <DropdownMenuItem disabled>
            <div className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              <span>Loading organizations...</span>
            </div>
          </DropdownMenuItem>
        ) : (
          (fetcher.data ?? []).map((org: OrganizationModel) => (
            <DropdownMenuItem
              key={org.id}
              className={`flex items-center justify-between ${
                currentOrg?.id === org.id ? 'font-medium' : ''
              }`}>
              <span>{org.name}</span>
              {currentOrg?.id === org.id && <CheckIcon className="size-4 text-primary" />}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuGroup>
    </>
  )
}
