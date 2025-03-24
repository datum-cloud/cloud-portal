import { Field } from '@/components/field/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { STORAGE_TYPES } from '@/constants/options'
import { StorageType } from '@/resources/interfaces/workload.interface'
import { StorageFieldSchema } from '@/resources/schemas/workload.schema'
import {
  getInputProps,
  getSelectProps,
  useForm,
  useInputControl,
} from '@conform-to/react'
import { useEffect } from 'react'

export const StorageField = ({
  fields,
  defaultValues,
  isVM,
}: {
  fields: ReturnType<typeof useForm<StorageFieldSchema>>[1]
  defaultValues?: StorageFieldSchema
  isVM: boolean
}) => {
  const typeControl = useInputControl(fields.type)
  const nameControl = useInputControl(fields.name)
  const bootImageControl = useInputControl(fields.bootImage)

  useEffect(() => {
    if (defaultValues) {
      // Only set values if they exist in defaultValues and current fields are empty
      if (defaultValues.name && fields.name.value === '') {
        nameControl.change(defaultValues?.name)
      }

      if (defaultValues.type && !fields.type.value) {
        typeControl.change(defaultValues?.type)
      }
    }

    if (isVM && !fields.bootImage.value) {
      bootImageControl.change('datumcloud/ubuntu-2204-lts')
    }
  }, [
    defaultValues,
    typeControl,
    nameControl,
    bootImageControl,
    fields.name.value,
    fields.type.value,
    fields.bootImage.value,
    isVM,
  ])

  return (
    <div className="relative flex w-full flex-col items-start gap-2">
      <div className="flex w-full gap-2">
        <Field label="Name" errors={fields.name.errors} className="w-1/2">
          <Input
            {...getInputProps(fields.name, { type: 'text' })}
            key={fields.name.id}
            placeholder="e.g. my-storage-us-3sd122"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = (e.target as HTMLInputElement).value
              nameControl.change(value)
            }}
          />
        </Field>
        <Field label="Type" errors={fields.type.errors} className="w-1/2">
          <Select
            {...getSelectProps(fields.type)}
            key={fields.type.id}
            value={fields.type.value}
            defaultValue={defaultValues?.type}
            onValueChange={(value) => {
              typeControl.change(value)
            }}>
            <SelectTrigger className="h-auto min-h-10 w-full items-center justify-between px-3 text-sm font-medium [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0">
              <SelectValue placeholder="Select a storage type" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(STORAGE_TYPES).map((storageType) => (
                <SelectItem
                  key={storageType}
                  value={storageType}
                  className="w-[var(--radix-select-trigger-width)]">
                  {STORAGE_TYPES[storageType as keyof typeof STORAGE_TYPES].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="flex w-full gap-2">
        {fields.type.value === StorageType.FILESYSTEM && (
          <Field
            label="Size"
            errors={fields.size.errors}
            className="flex-1"
            description="Enter the size of the storage in Gi (Gibibyte)">
            <Input
              {...getInputProps(fields.size, {
                type: 'number',
                min: 1,
              })}
              min={1}
              key={fields.size.id}
              placeholder="e.g. 10"
            />
          </Field>
        )}
        {isVM && (
          <Field label="Boot Image" errors={fields.bootImage.errors} className="flex-1">
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
        )}
      </div>
    </div>
  )
}
