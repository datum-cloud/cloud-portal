import { Button } from '@/components/ui/button'
import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'

export const ProjectSwitcher = () => {
  return (
    <Popover modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-11gap-2 px-2 data-[state=open]:bg-primary/5">
          <span className="truncate text-sm font-medium text-primary">Datum Project</span>
          <ChevronsUpDownIcon className="size-4 text-primary/60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0" align="start">
        <Command>
          <CommandInput
            className="h-9 rounded-md border-none focus-visible:ring-0"
            placeholder="Search Project"
          />
          <CommandList className="max-h-full">
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup className="max-h-[18.75rem] overflow-y-auto overflow-x-hidden">
              <CommandItem>Yahya&apos;s Project</CommandItem>
              <CommandItem className="flex items-center justify-between font-medium">
                <span>Datum Project</span>
                <CheckIcon className="size-4 text-primary" />
              </CommandItem>
              <CommandItem>Localhost</CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem>
                <PlusIcon className="size-4" />
                New Project
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
