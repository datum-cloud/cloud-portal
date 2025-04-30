import { PrometheusField } from './prometheus/prometheus-field'
import { Field } from '@/components/field/field'
import { MultiSelect } from '@/components/multi-select/multi-select'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { POLICY_SINK_TYPES } from '@/constants/options'
import { ExportPolicySinkType } from '@/resources/interfaces/export-policy.interface'
import {
  ExportPolicySinkFieldSchema,
  ExportPolicySinkPrometheusFieldSchema,
} from '@/resources/schemas/export-policy.schema'
import {
  getInputProps,
  getSelectProps,
  useForm,
  useInputControl,
} from '@conform-to/react'
import { isEqual } from 'es-toolkit/compat'
import { useEffect, useRef, useState } from 'react'
import { useHydrated } from 'remix-utils/use-hydrated'

export const SinkField = ({
  fields,
  isEdit = false,
  defaultValues,
  sourceList = [],
  projectId,
}: {
  fields: ReturnType<typeof useForm<ExportPolicySinkFieldSchema>>[1]
  isEdit?: boolean
  defaultValues?: ExportPolicySinkFieldSchema
  sourceList: string[]
  projectId?: string
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const isHydrated = useHydrated()

  const nameControl = useInputControl(fields.name)
  const typeControl = useInputControl(fields.type)
  const sourcesControl = useInputControl(fields.sources)

  const [sourcesName, setSourcesName] = useState<string[]>(sourceList)
  const [selectedSources, setSelectedSources] = useState<string[]>([])

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
  }, [defaultValues, nameControl, fields.name.value, typeControl, fields.type.value])

  useEffect(() => {
    if (defaultValues?.sources && !fields.sources.value) {
      setSelectedSources(defaultValues?.sources)
      sourcesControl.change(defaultValues?.sources)
    }
  }, [defaultValues])

  // Focus the input when the form is hydrated
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    isHydrated && inputRef.current?.focus()
  }, [isHydrated])

  useEffect(() => {
    const isSame = isEqual(sourceList, sourcesName)

    if (!isSame) {
      const filteredSources = selectedSources.filter((source) =>
        sourceList.includes(source),
      )
      setSourcesName(sourceList)
      setSelectedSources(filteredSources)
      sourcesControl.change(filteredSources)
    }
  }, [sourceList])

  return (
    <div className="relative flex flex-1 flex-col items-start gap-4">
      <Field isRequired label="Name" errors={fields.name.errors} className="w-full">
        <Input
          {...getInputProps(fields.name, { type: 'text' })}
          ref={isEdit ? undefined : inputRef}
          key={fields.name.id}
          placeholder="e.g. my-sink-3sd122"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const value = (e.target as HTMLInputElement).value
            nameControl.change(value)
          }}
        />
      </Field>

      <div className="flex w-full gap-2">
        <Field isRequired label="Type" errors={fields.type.errors} className="w-1/2">
          <Select
            {...getSelectProps(fields.type)}
            key={fields.type.id}
            value={typeControl.value}
            defaultValue={defaultValues?.type}
            onValueChange={typeControl.change}>
            <SelectTrigger disabled>
              <SelectValue placeholder="Select a sink type" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(POLICY_SINK_TYPES).map((type) => (
                <SelectItem key={type} value={type}>
                  {POLICY_SINK_TYPES[type as keyof typeof POLICY_SINK_TYPES].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {/* Remove debug output */}
        <Field
          isRequired
          label="Sources"
          errors={fields.sources.errors}
          className="w-1/2">
          <MultiSelect
            {...getSelectProps(fields.sources, { value: false })}
            name={fields.sources.name}
            placeholder="Select Sources"
            disabled={sourcesName.length === 0}
            defaultValue={selectedSources}
            options={sourcesName.map((source) => ({
              value: source,
              label: source,
            }))}
            onValueChange={(value) => {
              setSelectedSources(value)
              sourcesControl.change(value)
            }}
          />
        </Field>
      </div>

      {typeControl.value === ExportPolicySinkType.PROMETHEUS && (
        <PrometheusField
          projectId={projectId}
          fields={
            fields.prometheusRemoteWrite.getFieldset() as unknown as ReturnType<
              typeof useForm<ExportPolicySinkPrometheusFieldSchema>
            >[1]
          }
          defaultValues={
            defaultValues?.prometheusRemoteWrite as ExportPolicySinkPrometheusFieldSchema
          }
        />
      )}
    </div>
  )
}
