import { Field } from '@/components/field/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const BootField = ({
  defaultValues,
}: {
  defaultValues?: { name: string; bootImage: string }
}) => {
  return (
    <div className="relative flex w-full items-start gap-4">
      <Field label="Name" className="w-1/2">
        <Input
          type="text"
          readOnly
          placeholder="e.g. my-storage-us-3sd122"
          value={defaultValues?.name}
        />
      </Field>
      <Field label="Boot Image" className="w-1/2">
        <Select value={defaultValues?.bootImage}>
          <SelectTrigger
            disabled
            className="h-auto min-h-10 w-full items-center justify-between px-3 text-sm font-medium [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0">
            <SelectValue placeholder="Select a boot image" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              value="datumcloud/ubuntu-2204-lts"
              className="w-[var(--radix-select-trigger-width)]">
              datumcloud/ubuntu-2204-lts
            </SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </div>
  )
}
