import { StorageField } from './storage-field'
import { List, ListItem } from '@/components/list/list'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { STORAGE_TYPES } from '@/constants/options'
import { StorageFieldSchema, StoragesSchema } from '@/resources/schemas/workload.schema'
import { cn } from '@/utils/misc'
import { FormMetadata, useForm } from '@conform-to/react'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { useEffect, useMemo } from 'react'

export const StoragesForm = ({
  form,
  fields,
  defaultValues,
  isVM,
}: {
  form: FormMetadata<StoragesSchema>
  fields: ReturnType<typeof useForm<StoragesSchema>>[1]
  defaultValues?: StoragesSchema
  isVM: boolean
}) => {
  const storages = fields.storages.getFieldList()

  const values = useMemo(() => {
    return defaultValues?.storages
      ? defaultValues.storages
      : ((defaultValues ?? []) as StorageFieldSchema[])
  }, [defaultValues])

  useEffect(() => {
    form.update({
      name: fields.storages.name,
      value: values as StorageFieldSchema[],
    })
  }, [values])

  return (
    <div className="flex flex-col gap-2">
      <div className="space-y-4">
        {storages.map((storage, index) => {
          const storageFields = storage.getFieldset()
          return (
            <div
              className="relative flex items-center gap-2 rounded-md border p-4"
              key={storage.key}>
              <StorageField
                isVM={isVM}
                fields={
                  storageFields as unknown as ReturnType<
                    typeof useForm<StorageFieldSchema>
                  >[1]
                }
                defaultValues={values?.[index] as StorageFieldSchema}
              />

              {storages.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'text-destructive relative w-fit',
                    (storageFields.name.errors ?? []).length > 0 ||
                      (storageFields.type.errors ?? []).length > 0
                      ? 'top-2'
                      : 'top-2',
                  )}
                  onClick={() => form.remove({ name: fields.storages.name, index })}>
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
            name: fields.storages.name,
            defaultValue: { name: '', type: '' },
          })
        }>
        <PlusIcon className="size-4" />
        Add Storage
      </Button>
    </div>
  )
}

export const StoragesPreview = ({ values }: { values: StoragesSchema }) => {
  const listItems: ListItem[] = useMemo(() => {
    if ((values.storages ?? []).length > 0) {
      return values.storages.map((storage, index) => ({
        label: `Storage ${index + 1}`,
        content: (
          <div className="flex items-center gap-2">
            <span className="font-medium">{storage.name}</span>
            <Badge variant="outline">
              {STORAGE_TYPES[storage.type as keyof typeof STORAGE_TYPES].label}
            </Badge>
          </div>
        ),
      }))
    }

    return []
  }, [values])

  return <List items={listItems} itemClassName="!border-b-0 !px-0 py-1.5" />
}
