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
import { useEffect, useRef } from 'react'
import { useHydrated } from 'remix-utils/use-hydrated'

export const StorageField = ({
  isEdit = false,
  fields,
  defaultValues,
}: {
  isEdit?: boolean
  fields: ReturnType<typeof useForm<StorageFieldSchema>>[1]
  defaultValues?: StorageFieldSchema
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const isHydrated = useHydrated()

  const typeControl = useInputControl(fields.type)
  const nameControl = useInputControl(fields.name)

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
  }, [defaultValues, typeControl, nameControl, fields.name.value, fields.type.value])

  // Focus the input when the form is hydrated
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    isHydrated && inputRef.current?.focus()
  }, [isHydrated])

  return (
    <div className="relative flex w-full flex-col items-start gap-4">
      <Field isRequired label="Name" errors={fields.name.errors} className="w-full">
        <Input
          {...getInputProps(fields.name, { type: 'text' })}
          ref={isEdit ? undefined : inputRef}
          key={fields.name.id}
          placeholder="e.g. my-storage-us-3sd122"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const value = (e.target as HTMLInputElement).value
            nameControl.change(value)
          }}
        />
      </Field>
      <div className="flex w-full gap-4">
        <Field isRequired label="Type" errors={fields.type.errors} className="w-1/2">
          <Select
            {...getSelectProps(fields.type)}
            key={fields.type.id}
            value={typeControl.value}
            defaultValue={defaultValues?.type}
            onValueChange={typeControl.change}>
            <SelectTrigger disabled>
              <SelectValue placeholder="Select a storage type" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(STORAGE_TYPES).map((storageType) => (
                <SelectItem key={storageType} value={storageType}>
                  {STORAGE_TYPES[storageType as keyof typeof STORAGE_TYPES].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {fields.type.value === StorageType.FILESYSTEM && (
          <Field
            isRequired
            label="Size"
            errors={fields.size.errors}
            className="w-1/2"
            description="Enter the size of the storage in Gi (Gibibyte)">
            <Input
              {...getInputProps(fields.size, {
                type: 'number',
                min: 10,
                max: 100,
              })}
              min={10}
              max={100}
              key={fields.size.id}
              placeholder="e.g. 10"
            />
          </Field>
        )}
      </div>
    </div>
  )
}
