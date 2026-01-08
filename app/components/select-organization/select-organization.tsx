import { OrganizationItem } from './organization-item';
import type { Organization } from '@/resources/organizations';
import { useOrganizations } from '@/resources/organizations/organization.queries';
import { paths } from '@/utils/config/paths.config';
import { Button, SpinnerIcon } from '@datum-ui/components';
import { toast } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { cn } from '@shadcn/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@shadcn/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@shadcn/ui/popover';
import { BuildingIcon, CheckIcon, ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';

export const SelectOrganization = ({
  currentOrg,
  onSelect,
  selectedContent,
  triggerClassName,
  hideContent = false,
  hideNewOrganization = false,
  disabled = false,
}: {
  currentOrg: Partial<Organization>;
  onSelect?: (org: Organization) => void;
  selectedContent?: React.ReactNode;
  triggerClassName?: string;
  hideContent?: boolean;
  hideNewOrganization?: boolean;
  disabled?: boolean;
}) => {
  const [open, setOpen] = useState(false);

  const { data, isLoading, error } = useOrganizations(undefined, {
    enabled: open,
  });
  const organizations = data?.items ?? [];

  useEffect(() => {
    if (error) {
      toast.error(error.message || 'Failed to load organizations');
    }
  }, [error]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          disabled={disabled}
          type="quaternary"
          theme="borderless"
          size="small"
          className={cn(
            'flex cursor-pointer gap-2 border-none p-0 px-2 hover:bg-transparent active:bg-transparent data-[state=open]:bg-transparent',
            triggerClassName
          )}>
          {!hideContent &&
            (selectedContent ?? <OrganizationItem org={currentOrg} className="flex-1" />)}
          <Icon
            icon={ChevronDown}
            className={cn('text-icon-secondary size-4 w-fit transition-all', open && 'rotate-180')}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="popover-content-width-full border-input min-w-[310px] rounded-lg p-0"
        align="center">
        <Command className="rounded-lg">
          <CommandInput
            className="placeholder:text-secondary/60 h-7 border-none text-xs placeholder:text-xs focus-visible:ring-0"
            iconClassName="text-secondary size-3.5"
            wrapperClassName="px-3 py-2"
            placeholder="Find organization"
          />
          <CommandList className="max-h-none">
            <CommandEmpty>No results found.</CommandEmpty>
            {isLoading && organizations.length === 0 ? (
              <CommandItem disabled className="px-4 py-2.5">
                <div className="flex items-center justify-center">
                  <SpinnerIcon size="xs" aria-hidden="true" />
                </div>
                <span className="text-xs">Loading...</span>
              </CommandItem>
            ) : (
              <CommandGroup className="max-h-[300px] overflow-y-auto px-0 py-0">
                {organizations.length > 0 &&
                  organizations.map((org: Organization) => {
                    const isSelected = org.name === currentOrg?.name;
                    return (
                      <CommandItem
                        value={`${org.name}`}
                        key={org.name}
                        onSelect={() => {
                          setOpen(false);
                          if (!isSelected) {
                            onSelect?.(org);
                          }
                        }}
                        className="cursor-pointer justify-between px-3 py-2">
                        <OrganizationItem org={org} />
                        {isSelected && <Icon icon={CheckIcon} className="text-primary size-4" />}
                      </CommandItem>
                    );
                  })}
              </CommandGroup>
            )}

            {!hideNewOrganization && (
              <>
                <CommandSeparator />
                <CommandItem className="cursor-pointer" asChild>
                  <Link
                    to={paths.account.organizations.root}
                    className="flex items-center gap-2 px-3 py-2">
                    <Icon icon={BuildingIcon} className="size-3.5" />
                    <span className="text-xs">Organizations</span>
                  </Link>
                </CommandItem>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
