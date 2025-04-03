import { Field } from '@/components/field/field'
import { SelectAutocomplete } from '@/components/select-autocomplete/select-autocomplete'
import { Option } from '@/components/select-autocomplete/select-autocomplete.types'
import { Input } from '@/components/ui/input'
import GCP_REGIONS from '@/constants/json/gcp-region.json'
import { LocationProvider } from '@/resources/interfaces/location.interface'
import { FieldMetadata, getInputProps, useInputControl } from '@conform-to/react'
import { Slash } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

const SelectRegion = ({
  defaultValue,
  onValueChange,
  disabled,
}: {
  defaultValue?: string
  onValueChange: (value: Option) => void
  disabled?: boolean
}) => {
  const [value, setValue] = useState<string>(defaultValue ?? '')
  const selectedValue = useMemo(() => {
    return GCP_REGIONS.find((option) => option.name === value)
  }, [value])

  useEffect(() => {
    setValue(defaultValue ?? '')
  }, [defaultValue])

  const ItemContent = ({ option }: { option: Option }) => {
    return (
      <div className="flex w-full items-center gap-0.5">
        <span className="font-medium">{option.name}</span>
        <Slash className="text-muted-foreground! mx-0.5 size-3!" />
        <span className="text-muted-foreground text-sm">{option.location}</span>
      </div>
    )
  }
  return (
    <SelectAutocomplete
      disabled={disabled}
      keyValue="name"
      selectedValue={selectedValue}
      triggerClassName="w-full h-auto min-h-10"
      options={GCP_REGIONS}
      placeholder="Select a region"
      itemPreview={(option) => <ItemContent option={option} />}
      itemContent={(option) => <ItemContent option={option} />}
      onValueChange={(option) => {
        // eslint-disable-next-line react/prop-types
        setValue(option.name)
        onValueChange(option)
      }}
    />
  )
}

const SelectZone = ({
  defaultValue,
  onValueChange,
  selectedRegion,
  disabled = false,
}: {
  defaultValue?: string
  onValueChange: (value: Option) => void
  selectedRegion: string | undefined
  disabled?: boolean
}) => {
  const [value, setValue] = useState<string>(defaultValue ?? '')

  const zones = useMemo(() => {
    const list = GCP_REGIONS.find((option) => option.name === selectedRegion)?.zones
    return list?.map((zone) => ({
      value: zone,
      label: zone,
    }))
  }, [selectedRegion])

  const selectedValue = useMemo(() => {
    return zones?.find((zone) => zone.value === value)
  }, [value])

  useEffect(() => {
    setValue(defaultValue ?? '')
  }, [defaultValue])

  return (
    <SelectAutocomplete
      disabled={zones?.length === 0 || !selectedRegion || disabled}
      selectedValue={selectedValue}
      triggerClassName="w-full h-auto min-h-10"
      options={zones ?? []}
      placeholder="Select a zone"
      boxClassName="h-[150px]"
      onValueChange={(option) => {
        // eslint-disable-next-line react/prop-types
        setValue(option.value ?? '')
        onValueChange(option)
      }}
    />
  )
}

export const GCPProvider = ({
  isEdit = false,
  meta,
}: {
  isEdit?: boolean
  meta: {
    provider: FieldMetadata<LocationProvider>
    projectId: FieldMetadata<string>
    region: FieldMetadata<string>
    zone: FieldMetadata<string>
  }
}) => {
  const regionControl = useInputControl(meta.region)
  const zoneControl = useInputControl(meta.zone)

  return (
    <div className="space-y-4">
      <Input
        hidden
        {...getInputProps(meta.provider, { type: 'text' })}
        key={meta.provider.id}
        placeholder="e.g. GCP"
        className="hidden"
      />
      <Field isRequired label="Project ID" errors={meta.projectId.errors}>
        <Input
          {...getInputProps(meta.projectId, { type: 'text' })}
          key={meta.projectId.id}
          placeholder="e.g. my-project-343j33"
          readOnly={isEdit}
        />
      </Field>
      <Field isRequired label="Region" errors={meta.region.errors}>
        <SelectRegion
          defaultValue={meta.region.value}
          onValueChange={(value) => {
            regionControl.change(value.name)
            zoneControl.change(undefined)
          }}
          disabled={isEdit}
        />
      </Field>
      <Field isRequired label="Zone" errors={meta.zone.errors}>
        <SelectZone
          selectedRegion={meta.region.value}
          defaultValue={meta.zone.value}
          onValueChange={(value) => {
            zoneControl.change(value.value ?? '')
          }}
          disabled={isEdit}
        />
      </Field>
    </div>
  )
}
