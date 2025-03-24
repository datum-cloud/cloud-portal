import { Field } from '@/components/field/field'
import { List, ListItem } from '@/components/list/list'
import { SelectAnnotations } from '@/components/select-annotations/select-annotations'
import { SelectLabels } from '@/components/select-labels/select-labels'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { MetadataSchema } from '@/resources/schemas/workload.schema'
import { getInputProps, useForm, useInputControl } from '@conform-to/react'
import { useEffect, useMemo } from 'react'

export const MetadataForm = ({
  fields,
  defaultValues,
}: {
  fields: ReturnType<typeof useForm<MetadataSchema>>[1]
  defaultValues?: MetadataSchema
}) => {
  const nameControl = useInputControl(fields.name)
  const labelsControl = useInputControl(fields.labels)
  const annotationsControl = useInputControl(fields.annotations)

  useEffect(() => {
    if (defaultValues) {
      nameControl.change(defaultValues.name)
      labelsControl.change(defaultValues.labels)
      annotationsControl.change(defaultValues.annotations)
    }
  }, [defaultValues])
  return (
    <div className="space-y-4">
      <Field
        label="Name"
        description="A namespace-unique stable identifier for your workload. This cannot be changed once the workload is created"
        errors={fields.name.errors}>
        <Input
          {...getInputProps(fields.name, { type: 'text' })}
          key={fields.name.id}
          placeholder="e.g. my-workload-us-3sd122"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const value = (e.target as HTMLInputElement).value
            nameControl.change(value)
          }}
        />
      </Field>
      <Field
        label="Labels"
        errors={fields.labels.errors}
        description="Add labels to help identify, organize, and filter your workloads.">
        <SelectLabels
          defaultValue={fields.labels.value as string[]}
          onChange={(value) => {
            labelsControl.change(value)
          }}
        />
      </Field>
      <Field
        label="Annotations"
        errors={fields.annotations.errors}
        description="Add annotations to help identify, organize, and filter your workloads.">
        <SelectAnnotations
          defaultValue={fields.annotations.value as string[]}
          onChange={(value) => {
            annotationsControl.change(value)
          }}
        />
      </Field>
    </div>
  )
}

export const MetadataPreview = ({ values }: { values: MetadataSchema }) => {
  const listItems: ListItem[] = useMemo(() => {
    if (values) {
      return [
        { label: 'Name', content: values.name },
        {
          label: 'Labels',
          hidden: (values.labels ?? []).length === 0,
          content: (
            <div className="flex flex-wrap gap-2">
              {values.labels?.map((label) => (
                <Badge key={label} variant="outline">
                  {label}
                </Badge>
              ))}
            </div>
          ),
        },
        {
          label: 'Annotations',
          hidden: (values.annotations ?? []).length === 0,
          content: (
            <div className="flex flex-wrap gap-2">
              {values.annotations?.map((annotation) => (
                <Badge key={annotation} variant="outline">
                  {annotation}
                </Badge>
              ))}
            </div>
          ),
        },
      ]
    }

    return []
  }, [values])

  return <List items={listItems} itemClassName="!border-b-0 !px-0 py-1.5" />
}
