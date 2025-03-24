import { Field } from '@/components/field/field'
import { Input } from '@/components/ui/input'
import {
  SelectValue,
  SelectTrigger,
  SelectItem,
  SelectContent,
  Select,
} from '@/components/ui/select'
import { RuntimeVMSchema } from '@/resources/schemas/workload.schema'
import {
  getInputProps,
  getSelectProps,
  useForm,
  useInputControl,
} from '@conform-to/react'
import { useEffect } from 'react'

export const VirtualMachineForm = ({
  fields,
  defaultValues,
}: {
  fields: ReturnType<typeof useForm<RuntimeVMSchema>>[1]
  defaultValues?: RuntimeVMSchema
}) => {
  const bootImageControl = useInputControl(fields.bootImage)
  const sshKeyControl = useInputControl(fields.sshKey)
  useEffect(() => {
    bootImageControl.change('datumcloud/ubuntu-2204-lts')

    if (defaultValues) {
      if (defaultValues.sshKey && !fields.sshKey.value) {
        sshKeyControl.change(defaultValues.sshKey)
      }
    }
  }, [
    defaultValues,
    bootImageControl,
    sshKeyControl,
    fields.bootImage.value,
    fields.sshKey.value,
  ])

  return (
    <div className="flex w-full flex-col gap-4">
      <Field label="Boot Image" errors={fields.bootImage.errors} className="w-full">
        <Select
          {...getSelectProps(fields.bootImage)}
          onValueChange={bootImageControl.change}
          key={fields.bootImage.id}
          value={fields.bootImage.value?.toString()}
          defaultValue={defaultValues?.bootImage}>
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

      <Field label="SSH Key" errors={fields.sshKey.errors} className="w-full">
        <Input
          {...getInputProps(fields.sshKey, { type: 'text' })}
          key={fields.sshKey.id}
          placeholder="Enter your SSH key"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const value = (e.target as HTMLInputElement).value
            sshKeyControl.change(value)
          }}
        />
      </Field>
    </div>
  )
}
