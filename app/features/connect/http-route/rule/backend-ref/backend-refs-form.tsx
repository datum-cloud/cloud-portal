import { BackendRefField } from './backend-ref-field'
import { FieldLabel } from '@/components/field/field-label'
import { Button } from '@/components/ui/button'
import {
  HttpRouteBackendRefSchema,
  HttpRouteRuleSchema,
} from '@/resources/schemas/http-route.schema'
import { cn } from '@/utils/misc'
import { useForm, useFormMetadata } from '@conform-to/react'
import { TrashIcon } from 'lucide-react'
import { useEffect, useMemo } from 'react'

export const BackendRefsForm = ({
  fields,
  defaultValues,
  projectId,
}: {
  fields: ReturnType<typeof useForm<HttpRouteRuleSchema>>[1]
  defaultValues?: HttpRouteBackendRefSchema[]
  projectId?: string
}) => {
  const form = useFormMetadata('http-route-form')
  const backendRefList = fields.backendRefs.getFieldList()

  const selectedEndpointSlice = useMemo(() => {
    // Extract all selected network names from the form fields
    return backendRefList
      .map((backendRef) => {
        const fieldset = backendRef.getFieldset()
        return fieldset.name.value
      })
      .filter(Boolean)
  }, [backendRefList])

  useEffect(() => {
    if (defaultValues) {
      form.update({
        name: fields.backendRefs.name,
        value: defaultValues,
      })
    }
  }, [defaultValues])

  return (
    <div className="flex flex-col gap-3">
      <FieldLabel label="Backend Refs" />

      <div className="space-y-4">
        {backendRefList.map((backendRef, index) => {
          const backendRefFields = backendRef.getFieldset()
          return (
            <div
              className="relative flex items-center gap-2 rounded-md border p-4"
              key={backendRef.key}>
              <BackendRefField
                selectedEndpointSlice={selectedEndpointSlice as string[]}
                fields={
                  backendRefFields as unknown as ReturnType<
                    typeof useForm<HttpRouteBackendRefSchema>
                  >[1]
                }
                defaultValues={defaultValues?.[index]}
                projectId={projectId}
              />
              {backendRefList.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'text-destructive relative w-fit',
                    (backendRefFields.name.errors ?? []).length > 0 ||
                      (backendRefFields.port.errors ?? []).length > 0
                      ? '-top-1'
                      : 'top-2.5',
                  )}
                  onClick={() => form.remove({ name: fields.backendRefs.name, index })}>
                  <TrashIcon className="size-4" />
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
