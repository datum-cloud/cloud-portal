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
import { useEffect, useRef } from 'react'
import { useHydrated } from 'remix-utils/use-hydrated'

export const VirtualMachineForm = ({
  fields,
  defaultValues,
  isEdit = false,
}: {
  fields: ReturnType<typeof useForm<RuntimeVMSchema>>[1]
  defaultValues?: RuntimeVMSchema
  isEdit?: boolean
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const isHydrated = useHydrated()
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

  // Focus the input when the form is hydrated
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    isHydrated && inputRef.current?.focus()
  }, [isHydrated])

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

      <Field
        label="SSH Key"
        errors={fields.sshKey.errors}
        className="w-full"
        description={
          <span className="text-muted-foreground text-xs">
            Required format:{' '}
            <code className="bg-muted rounded px-1 py-0.5 text-xs">username:key</code>
            (e.g.,{' '}
            <code className="bg-muted rounded px-1 py-0.5 text-xs">
              admin:ssh-rsa AAAAB3N...
            </code>
            )
          </span>
        }>
        <Input
          {...getInputProps(fields.sshKey, { type: 'text' })}
          ref={isEdit ? undefined : inputRef}
          key={fields.sshKey.id}
          placeholder="username:key"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const value = (e.target as HTMLInputElement).value
            sshKeyControl.change(value)
          }}
        />
      </Field>
    </div>
  )
}
