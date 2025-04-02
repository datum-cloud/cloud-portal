import { PortsForm } from './ports-form'
import { Field } from '@/components/field/field'
import { Input } from '@/components/ui/input'
import {
  RuntimeContainerSchema,
  RuntimePortSchema,
} from '@/resources/schemas/workload.schema'
import { getInputProps, useForm, useInputControl } from '@conform-to/react'
import { useEffect, useRef } from 'react'
import { useHydrated } from 'remix-utils/use-hydrated'

export const ContainerField = ({
  isEdit,
  defaultValues,
  fields,
}: {
  isEdit: boolean
  defaultValues?: RuntimeContainerSchema
  fields: ReturnType<typeof useForm<RuntimeContainerSchema>>[1]
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const isHydrated = useHydrated()

  const imageControl = useInputControl(fields.image)
  const nameControl = useInputControl(fields.name)

  useEffect(() => {
    if (defaultValues) {
      // Only set values if they exist in defaultValues and current fields are empty
      if (defaultValues.name && fields.name.value === '') {
        nameControl.change(defaultValues?.name)
      }

      if (defaultValues.image && fields.image.value === '') {
        imageControl.change(defaultValues?.image)
      }
    }
  }, [defaultValues, imageControl, nameControl, fields.name.value, fields.image.value])

  // Focus the input when the form is hydrated
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    isHydrated && inputRef.current?.focus()
  }, [isHydrated])

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="relative flex w-full items-start gap-4">
        <Field isRequired label="Name" errors={fields.name.errors} className="w-full">
          <Input
            {...getInputProps(fields.name, { type: 'text' })}
            ref={isEdit ? undefined : inputRef}
            key={fields.name.id}
            placeholder="e.g. netdata"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = (e.target as HTMLInputElement).value
              nameControl.change(value)
            }}
          />
        </Field>
        <Field isRequired label="Image" errors={fields.image.errors} className="w-full">
          <Input
            {...getInputProps(fields.image, { type: 'text' })}
            ref={isEdit ? undefined : inputRef}
            key={fields.image.id}
            placeholder="e.g. http://docker.io/netdata/netdata:latest"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = (e.target as HTMLInputElement).value
              imageControl.change(value)
            }}
          />
        </Field>
      </div>

      <div className="flex w-full flex-col gap-2">
        <h3 className="text-sm font-medium">Ports</h3>
        <PortsForm
          fields={
            fields as unknown as ReturnType<
              typeof useForm<{ ports: RuntimePortSchema[] }>
            >[1]
          }
          defaultValues={defaultValues?.ports}
          isEdit={isEdit}
        />
      </div>
    </div>
  )
}
