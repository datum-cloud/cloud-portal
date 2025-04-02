import { Field } from '@/components/field/field'
import { MultiSelect } from '@/components/multi-select/multi-select'
import { Option } from '@/components/select-autocomplete/select-autocomplete.types'
import { SelectNetwork } from '@/components/select-network/select-network'
import { NetworkFieldSchema } from '@/resources/schemas/workload.schema'
import { useForm, useInputControl } from '@conform-to/react'
import { useEffect, useState } from 'react'

export const NetworkFieldForm = ({
  projectId,
  fields,
  defaultValues,
  networkOptions = [],
  exceptItems,
}: {
  projectId?: string
  fields: ReturnType<typeof useForm<NetworkFieldSchema>>[1]
  defaultValues?: NetworkFieldSchema
  networkOptions?: Option[]
  exceptItems: string[]
}) => {
  const [ipFamilies, setIpFamilies] = useState<string[]>([])
  const [selectedIpFamilies, setSelectedIpFamilies] = useState<string[]>([])

  const networkNameControl = useInputControl({
    name: fields.name.name,
    formId: fields.name.formId,
    initialValue: defaultValues?.name,
  })
  const ipFamiliesControl = useInputControl(fields.ipFamilies)

  const onChangeNetwork = (value: Option) => {
    // Check if the current value different with the default value
    let selected: string[] = []
    if (value.value === networkNameControl.value) {
      selected = value?.ipFamilies || []
    }

    setSelectedIpFamilies(selected)
    ipFamiliesControl.change(selected)
    networkNameControl.change(value.value)

    setIpFamilies(value.ipFamilies)
  }

  useEffect(() => {
    if (defaultValues) {
      // Only set values if they exist in defaultValues and current fields are empty
      if (!fields.name.value) {
        networkNameControl.change(defaultValues?.name ?? '')
      }

      if (defaultValues.ipFamilies && !fields.ipFamilies.value) {
        ipFamiliesControl.change(defaultValues.ipFamilies ?? [])
      }
    }
  }, [
    defaultValues,
    networkNameControl,
    ipFamiliesControl,
    fields.name.value,
    fields.ipFamilies.value,
  ])

  return (
    <div className="relative flex w-full items-start gap-4">
      <Field isRequired label="Network" errors={fields.name.errors} className="w-1/2">
        <SelectNetwork
          defaultValue={fields.name.value}
          projectId={projectId}
          onValueChange={onChangeNetwork}
          defaultOptions={networkOptions}
          exceptItems={exceptItems}
        />
      </Field>
      <Field
        isRequired
        label="IP Families"
        errors={fields.ipFamilies.errors}
        className="w-1/2">
        <MultiSelect
          placeholder="Select IP Families"
          disabled={ipFamilies.length === 0 || !fields.name.value}
          defaultValue={selectedIpFamilies}
          options={ipFamilies.map((ipFamily) => ({
            label: ipFamily,
            value: ipFamily,
          }))}
          onValueChange={(value) => {
            ipFamiliesControl.change(value)
          }}
        />
      </Field>
    </div>
  )
}
