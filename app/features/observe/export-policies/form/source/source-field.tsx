import { CodeEditor } from '@/components/code-editor/code-editor'
import { Field } from '@/components/field/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { POLICY_SOURCE_TYPES } from '@/constants/options'
import { useTheme } from '@/hooks/useTheme'
import { ExportPolicySourceFieldSchema } from '@/resources/schemas/export-policy.schema'
import { cn } from '@/utils/misc'
import {
  getInputProps,
  getSelectProps,
  useForm,
  useInputControl,
} from '@conform-to/react'
import { useEffect, useRef } from 'react'
import { useHydrated } from 'remix-utils/use-hydrated'

export const SourceField = ({
  fields,
  defaultValues,
  isEdit = false,
  isMultiple = false,
}: {
  fields: ReturnType<typeof useForm<ExportPolicySourceFieldSchema>>[1]
  defaultValues?: ExportPolicySourceFieldSchema
  isEdit?: boolean
  isMultiple?: boolean
}) => {
  const theme = useTheme()
  const inputRef = useRef<HTMLInputElement>(null)
  const isHydrated = useHydrated()

  const nameControl = useInputControl(fields.name)
  const typeControl = useInputControl(fields.type)
  const metricQueryControl = useInputControl(fields.metricQuery)

  useEffect(() => {
    if (defaultValues) {
      // Only set values if they exist in defaultValues and current fields are empty
      if (defaultValues.name && fields.name.value === '') {
        nameControl.change(defaultValues?.name)
      }

      if (defaultValues.type && !fields.type.value) {
        typeControl.change(defaultValues?.type)
      }

      if (defaultValues.metricQuery && fields.metricQuery.value === '') {
        metricQueryControl.change(defaultValues?.metricQuery)
      }
    }
  }, [
    defaultValues,
    nameControl,
    fields.name.value,
    typeControl,
    fields.type.value,
    metricQueryControl,
    fields.metricQuery.value,
  ])

  // Focus the input when the form is hydrated
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    isHydrated && inputRef.current?.focus()
  }, [isHydrated])

  return (
    <div className="relative flex flex-1 flex-col items-start gap-4">
      <div className="flex w-full gap-2">
        <Field isRequired label="Name" errors={fields.name.errors} className="w-1/2">
          <Input
            {...getInputProps(fields.name, { type: 'text' })}
            ref={isEdit ? undefined : inputRef}
            key={fields.name.id}
            placeholder="e.g. my-source-3sd122"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = (e.target as HTMLInputElement).value
              nameControl.change(value)
            }}
          />
        </Field>

        <Field isRequired label="Type" errors={fields.type.errors} className="w-1/2">
          <Select
            {...getSelectProps(fields.type)}
            key={fields.type.id}
            value={typeControl.value}
            defaultValue={defaultValues?.type}
            onValueChange={typeControl.change}>
            <SelectTrigger
              disabled
              className="h-auto min-h-10 w-full items-center justify-between px-3 text-sm font-medium [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0">
              <SelectValue placeholder="Select a source type" />
            </SelectTrigger>
            <SelectContent className="w-[var(--radix-select-trigger-width)]">
              {Object.keys(POLICY_SOURCE_TYPES).map((type) => (
                <SelectItem key={type} value={type}>
                  {POLICY_SOURCE_TYPES[type as keyof typeof POLICY_SOURCE_TYPES].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="w-full">
        <Field
          isRequired
          label="MetricsQL Query"
          errors={fields.metricQuery.errors}
          className={cn('w-full', isMultiple ? 'max-w-[590px]' : '')}
          tooltipInfo="MetricsQL query to select metrics. Default {} selects all metrics.">
          <CodeEditor
            darkMode={theme === 'dark'}
            language="promql"
            value={fields.metricQuery.value ?? '{}'}
            onChange={(newValue) => {
              metricQueryControl.change(newValue)
            }}
            id={fields.metricQuery.id}
            name={fields.metricQuery.name}
            error={fields.metricQuery.errors?.[0]}
            minHeight="150px"
          />
        </Field>
      </div>
    </div>
  )
}
