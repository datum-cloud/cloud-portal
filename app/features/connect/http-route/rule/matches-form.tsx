import { FieldLabel } from '@/components/field/field-label'
import { Button } from '@/components/ui/button'
import {
  HttpRouteMatchSchema,
  HttpRouteRuleSchema,
} from '@/resources/schemas/http-route.schema'
import { cn } from '@/utils/misc'
import { useForm, useFormMetadata } from '@conform-to/react'
import { TrashIcon } from 'lucide-react'
import { useEffect } from 'react'

export const MatchesForm = ({
  fields,
  defaultValues,
}: {
  fields: ReturnType<typeof useForm<HttpRouteRuleSchema>>[1]
  defaultValues?: HttpRouteMatchSchema[]
}) => {
  const form = useFormMetadata('http-route-form')
  const matchList = fields.matches.getFieldList()

  useEffect(() => {
    if (defaultValues) {
      form.update({
        name: fields.matches.name,
        value: defaultValues as HttpRouteMatchSchema[],
      })
    }
  }, [defaultValues])

  return (
    <div className="flex w-full flex-col gap-2">
      <FieldLabel label="Matches" />
      <div className="space-y-4">
        {matchList.map((match, index) => {
          const matchFields = match.getFieldset()
          return (
            <div
              className="relative flex items-center gap-2 rounded-md border p-4"
              key={match.key}>
              {matchList.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'text-destructive relative w-fit',
                    (matchFields.path.errors ?? []).length > 0 ? '-top-1' : 'top-2.5',
                  )}
                  onClick={() => form.remove({ name: fields.matches.name, index })}>
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
