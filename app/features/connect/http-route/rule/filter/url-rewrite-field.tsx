import { Field } from '@/components/field/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { HTTPPathRewriteType } from '@/resources/interfaces/http-route.interface'
import { HttpURLRewriteSchema } from '@/resources/schemas/http-route.schema'
import {
  getInputProps,
  getSelectProps,
  useForm,
  useInputControl,
} from '@conform-to/react'
import { useEffect } from 'react'

export const URLRewriteField = ({
  fields,
  defaultValues,
}: {
  fields: ReturnType<typeof useForm<HttpURLRewriteSchema>>[1]
  defaultValues?: HttpURLRewriteSchema
}) => {
  const hostnameControl = useInputControl(fields.hostname)

  const pathFields = fields.path.getFieldset()
  const typeControl = useInputControl(pathFields?.type)
  const valueControl = useInputControl(pathFields?.value)

  useEffect(() => {
    if (defaultValues) {
      if (defaultValues.hostname && fields.hostname.value === '') {
        hostnameControl.change(defaultValues?.hostname)
      }

      if (defaultValues.path?.type && !pathFields?.type.value) {
        typeControl.change(defaultValues?.path?.type)
      }

      if (defaultValues.path?.value && pathFields?.value.value === '') {
        valueControl.change(defaultValues?.path?.value)
      }
    }
  }, [
    defaultValues,
    fields.hostname.value,
    typeControl,
    pathFields?.type.value,
    valueControl,
    pathFields?.value.value,
  ])

  return (
    <div className="relative flex w-full flex-col items-start gap-4">
      <Field
        isRequired
        label="Hostname"
        errors={fields.hostname.errors}
        className="w-full">
        <Input
          {...getInputProps(fields.hostname, { type: 'text' })}
          key={fields.hostname.id}
          placeholder="e.g. example.com"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const value = (e.target as HTMLInputElement).value
            hostnameControl.change(value)
          }}
        />
      </Field>
      <div className="flex w-full gap-4">
        <Field isRequired label="Type" errors={pathFields?.type.errors} className="w-1/3">
          <Select
            {...getSelectProps(pathFields?.type)}
            key={pathFields?.type.id}
            value={typeControl.value}
            defaultValue={defaultValues?.path?.type}
            onValueChange={(value) => {
              typeControl.change(value)
            }}>
            <SelectTrigger>
              <SelectValue placeholder="Select a type" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(HTTPPathRewriteType).map((protocol) => (
                <SelectItem key={protocol} value={protocol}>
                  {protocol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field
          isRequired
          label="Value"
          errors={pathFields?.value.errors}
          className="w-2/3">
          <Input
            {...getInputProps(pathFields?.value, { type: 'text' })}
            key={pathFields?.value.id}
            placeholder="e.g. /path"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = (e.target as HTMLInputElement).value
              valueControl.change(value)
            }}
          />
        </Field>
      </div>
    </div>
  )
}
