import { Field } from '@/components/field/field'
import { TagsInput } from '@/components/ui/tag-input'
import { EndpointSliceEndpointSchema } from '@/resources/schemas/endpoint-slice.schema'
import { getCollectionProps, useForm, useInputControl } from '@conform-to/react'
import { useEffect } from 'react'

export const EndpointField = ({
  fields,
  defaultValues,
}: {
  fields: ReturnType<typeof useForm<EndpointSliceEndpointSchema>>[1]
  defaultValues?: EndpointSliceEndpointSchema
}) => {
  const addressesControl = useInputControl(fields.addresses)

  useEffect(() => {
    if (defaultValues) {
      if (defaultValues.addresses && !fields.addresses.value) {
        addressesControl.change(defaultValues?.addresses)
      }
    }
  }, [defaultValues, addressesControl, fields.addresses.value])

  return (
    <div className="relative flex w-full flex-col items-start gap-4">
      <div className="flex w-full gap-2">
        <Field
          isRequired
          label="Addresses"
          errors={fields.addresses.errors}
          className="w-1/2"
          description="Enter one or more addresses (e.g example.com)">
          <TagsInput
            showValidationErrors={false}
            name={fields.addresses.name}
            id={fields.addresses.id}
            key={fields.addresses.key}
            value={(addressesControl.value as string[]) || []}
            onValueChange={(newValue) => addressesControl.change(newValue)}
            placeholder="Enter addresses"
          />
        </Field>

        <Field label="Conditions" errors={fields.conditions.errors} className="w-1/2">
          <div className="flex h-9 items-center gap-2">
            {getCollectionProps(fields.conditions, {
              type: 'checkbox',
              options: ['ready', 'reachable', 'terminating'],
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }).map((props: any) => {
              const { key, ...rest } = props
              return (
                <div key={rest.id} className="flex items-center space-x-2">
                  <input
                    key={key}
                    className="border-primary bg-background text-primary accent-primary focus:ring-primary size-4 shrink-0 rounded-sm border transition-all duration-200 focus:ring-1 focus:ring-offset-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    {...rest}
                  />
                  <label
                    htmlFor={rest.id}
                    className="text-sm leading-none font-medium capitalize peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {rest.value}
                  </label>
                </div>
              )
            })}
          </div>
        </Field>
      </div>
    </div>
  )
}
