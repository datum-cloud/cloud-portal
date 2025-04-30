import { Field } from '@/components/field/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BOOT_IMAGES } from '@/constants/bootImages'

export const BootField = ({
  defaultValues,
}: {
  defaultValues?: { name: string; bootImage: string }
}) => {
  return (
    <div className="relative flex w-full items-start gap-4">
      <Field isRequired label="Name" className="w-1/2">
        <Input
          type="text"
          readOnly
          placeholder="e.g. my-storage-us-3sd122"
          value={defaultValues?.name}
        />
      </Field>
      <Field isRequired label="Boot Image" className="w-1/2">
        <Select value={defaultValues?.bootImage}>
          <SelectTrigger disabled>
            <SelectValue placeholder="Select a boot image" />
          </SelectTrigger>
          <SelectContent>
            {BOOT_IMAGES.map((bootImage) => (
              <SelectItem key={bootImage} value={bootImage}>
                {bootImage}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  )
}
