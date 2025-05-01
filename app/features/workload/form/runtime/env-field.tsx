import { Field } from '@/components/field/field'
import { SelectConfigMap } from '@/components/select-configmap/select-configmap'
import { SelectSecret } from '@/components/select-secret/select-secret'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ENV_TYPES } from '@/constants/options'
import { ContainerEnvType } from '@/resources/interfaces/workload.interface'
import { RuntimeEnvSchema } from '@/resources/schemas/workload.schema'
import { cn } from '@/utils/misc'
import {
  getInputProps,
  getSelectProps,
  useForm,
  useInputControl,
} from '@conform-to/react'
import { useEffect, useRef, useState } from 'react'
import { useHydrated } from 'remix-utils/use-hydrated'

export const EnvField = ({
  isEdit,
  defaultValues,
  projectId,
  fields,
}: {
  isEdit?: boolean
  defaultValues?: RuntimeEnvSchema
  projectId?: string
  fields: ReturnType<typeof useForm<RuntimeEnvSchema>>[1]
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const isHydrated = useHydrated()

  const nameControl = useInputControl(fields.name)
  const typeControl = useInputControl(fields.type)

  // For text
  const valueControl = useInputControl(fields.value)

  // For secret and config map
  const [keyOptions, setKeyOptions] = useState<string[]>([])
  const refNameControl = useInputControl(fields.refName)
  const keyControl = useInputControl(fields.key)

  useEffect(() => {
    if (defaultValues) {
      // Only set values if they exist in defaultValues and current fields are empty
      if (defaultValues.name && fields.name.value === '') {
        nameControl.change(defaultValues?.name)
      }

      if (defaultValues.type && !fields.type.value) {
        typeControl.change(defaultValues?.type)

        if (
          defaultValues.type === ContainerEnvType.TEXT &&
          defaultValues.value &&
          fields.value.value === ''
        ) {
          valueControl.change(defaultValues?.value)
        }
      }
    }
  }, [
    defaultValues,
    typeControl,
    nameControl,
    valueControl,
    fields.name.value,
    fields.type.value,
    fields.value.value,
  ])

  useEffect(() => {
    // Focus the input when the form is hydrated
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    isHydrated && inputRef.current?.focus()
  }, [isHydrated])

  return (
    <div className="relative flex w-full flex-col items-start gap-4">
      <div className="flex w-full gap-2">
        <Field isRequired label="Name" errors={fields.name.errors} className="w-2/3">
          <Input
            {...getInputProps(fields.name, { type: 'text' })}
            ref={isEdit ? undefined : inputRef}
            key={fields.name.id}
            placeholder="e.g. ENV_VAR_NAME"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = (e.target as HTMLInputElement).value
              nameControl.change(value)
            }}
          />
        </Field>
        <Field
          isRequired
          label="Value Source"
          errors={fields.type.errors}
          className="w-1/3">
          <Select
            {...getSelectProps(fields.type, { value: false })}
            key={fields.type.id}
            value={typeControl.value}
            defaultValue={undefined}
            onValueChange={(value) => {
              typeControl.change(value)

              valueControl.change(undefined)
              refNameControl.change(undefined)
              keyControl.change(undefined)
            }}>
            <SelectTrigger>
              <SelectValue placeholder="Select a Source" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(ENV_TYPES).map((type) => (
                <SelectItem key={type} value={type}>
                  {ENV_TYPES[type as keyof typeof ENV_TYPES].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className={cn('flex w-full gap-2', { hidden: !fields.type.value })}>
        <Field
          isRequired
          label="Value"
          errors={fields.value.errors}
          className={cn('w-1/2', {
            hidden: fields.type.value !== ContainerEnvType.TEXT,
          })}>
          <Input
            {...getInputProps(fields.value, { type: 'text' })}
            key={fields.value.id}
            placeholder="e.g. my-value"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = (e.target as HTMLInputElement).value
              valueControl.change(value)
            }}
          />
        </Field>

        <Field
          isRequired
          label={fields.type.value === ContainerEnvType.SECRET ? 'Secret' : 'Config Map'}
          errors={fields.refName.errors}
          className={cn('w-1/2', {
            hidden: fields.type.value === ContainerEnvType.TEXT,
          })}>
          {fields.type.value === ContainerEnvType.SECRET ? (
            <SelectSecret
              {...getSelectProps(fields.refName, { value: false })}
              name={fields.refName.name}
              id={fields.refName.id}
              key={fields.refName.id}
              defaultValue={refNameControl.value}
              projectId={projectId}
              onValueChange={(value) => {
                if (value?.value !== refNameControl.value) {
                  keyControl.change(undefined)
                }

                refNameControl.change(value?.value)
                setKeyOptions(value?.data ?? [])
              }}
            />
          ) : (
            <SelectConfigMap
              {...getSelectProps(fields.refName, { value: false })}
              name={fields.refName.name}
              id={fields.refName.id}
              key={fields.refName.id}
              defaultValue={refNameControl.value}
              projectId={projectId}
              onValueChange={(value) => {
                if (value?.value !== refNameControl.value) {
                  keyControl.change(undefined)
                }

                refNameControl.change(value?.value)
                setKeyOptions(Object.keys(value?.data ?? {}))
              }}
            />
          )}
        </Field>

        <Field
          isRequired
          label="Key"
          errors={fields.key.errors}
          className={cn('w-1/2', {
            hidden: fields.type.value === ContainerEnvType.TEXT,
          })}>
          <Select
            {...getSelectProps(fields.key, { value: false })}
            key={fields.key.id}
            value={keyControl.value}
            defaultValue={defaultValues?.key}
            onValueChange={(value) => {
              keyControl.change(value)
            }}>
            <SelectTrigger disabled={!keyOptions.length}>
              <SelectValue placeholder="Select a Key" />
            </SelectTrigger>
            <SelectContent>
              {keyOptions.map((key) => (
                <SelectItem key={key} value={key}>
                  {key}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </div>
  )
}
