import { ContainerField } from './container-field'
import { Button } from '@/components/ui/button'
import {
  RuntimeContainerSchema,
  RuntimeSchema,
} from '@/resources/schemas/workload.schema'
import { cn } from '@/utils/misc'
import { useForm, useFormMetadata } from '@conform-to/react'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { useEffect } from 'react'

export const ContainerForm = ({
  isEdit,
  fields,
  defaultValues,
}: {
  isEdit: boolean
  fields: ReturnType<typeof useForm<RuntimeSchema>>[1]
  defaultValues?: RuntimeContainerSchema[]
}) => {
  const form = useFormMetadata('workload-form')
  const containers = fields.containers.getFieldList()

  useEffect(() => {
    if (defaultValues) {
      form.update({
        name: fields.containers.name,
        value: defaultValues as RuntimeContainerSchema[],
      })
    }
  }, [defaultValues])

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="space-y-4">
        {containers.map((container, index) => {
          const containerFields = container.getFieldset()
          return (
            <div
              className="relative flex items-center gap-2 rounded-md border p-4"
              key={container.key}>
              <ContainerField
                isEdit={isEdit}
                defaultValues={defaultValues?.[index]}
                fields={
                  containerFields as unknown as ReturnType<
                    typeof useForm<RuntimeContainerSchema>
                  >[1]
                }
              />

              {containers.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'text-destructive relative w-fit',
                    (containerFields.name.errors ?? []).length > 0 ||
                      (containerFields.image.errors ?? []).length > 0
                      ? '-top-1'
                      : 'top-2.5',
                  )}
                  onClick={() => form.remove({ name: fields.containers.name, index })}>
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
            name: fields.containers.name,
            defaultValue: { name: '', image: '' },
          })
        }>
        <PlusIcon className="size-4" />
        Add Container
      </Button>
    </div>
  )
}
