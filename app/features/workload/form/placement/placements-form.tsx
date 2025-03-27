import { PlacementField } from './placement-field'
import { List, ListItem } from '@/components/list/list'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  PlacementFieldSchema,
  PlacementsSchema,
} from '@/resources/schemas/workload.schema'
import { cn } from '@/utils/misc'
import { FormMetadata, useForm } from '@conform-to/react'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { useEffect, useMemo } from 'react'

export const PlacementsForm = ({
  form,
  fields,
  defaultValues,
  isEdit = false,
}: {
  form: FormMetadata<PlacementsSchema>
  fields: ReturnType<typeof useForm<PlacementsSchema>>[1]
  defaultValues?: PlacementsSchema
  isEdit?: boolean
}) => {
  const placements = fields.placements.getFieldList()

  const values = useMemo(() => {
    return defaultValues?.placements
      ? defaultValues.placements
      : ((defaultValues ?? []) as PlacementFieldSchema[])
  }, [defaultValues])

  useEffect(() => {
    form.update({
      name: fields.placements.name,
      value: values as PlacementFieldSchema[],
    })
  }, [values])

  return (
    <div className="flex flex-col gap-2">
      <div className="space-y-4">
        {placements.map((placement, index) => {
          const placementFields = placement.getFieldset()
          return (
            <div
              className="relative flex items-center gap-2 rounded-md border p-4"
              key={placement.key}>
              <PlacementField
                isEdit={isEdit}
                fields={
                  placementFields as unknown as ReturnType<
                    typeof useForm<PlacementFieldSchema>
                  >[1]
                }
                defaultValues={values?.[index] as PlacementFieldSchema}
              />

              {placements.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'text-destructive relative w-fit',
                    (placementFields.name.errors ?? []).length > 0 ? 'top-2' : 'top-5.5',
                  )}
                  onClick={() => form.remove({ name: fields.placements.name, index })}>
                  <TrashIcon className="size-4" />
                </Button>
              )}
            </div>
          )
        })}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() =>
          form.insert({
            name: fields.placements.name,
            defaultValue: { name: '', cityCode: '', minimumReplicas: 1 },
          })
        }>
        <PlusIcon className="size-4" />
        Add Placement
      </Button>
    </div>
  )
}

export const PlacementsPreview = ({ values }: { values: PlacementsSchema }) => {
  const listItems: ListItem[] = useMemo(() => {
    if ((values.placements ?? []).length > 0) {
      return values.placements.map((placement, index) => ({
        label: `Placement ${index + 1}`,
        content: (
          <div className="flex items-center gap-2">
            <span className="font-medium">{placement.name}</span>
            <Separator orientation="vertical" className="h-4" />
            <Badge variant="outline">{placement.cityCode}</Badge>
            <Separator orientation="vertical" className="h-4" />
            <Badge variant="outline">Min Replicas: {placement.minimumReplicas}</Badge>
          </div>
        ),
      }))
    }

    return []
  }, [values])

  return <List items={listItems} itemClassName="!border-b-0 !px-0 py-1.5" />
}
