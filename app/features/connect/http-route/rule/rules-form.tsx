import { MatchesForm } from './matches-form'
import { FieldLabel } from '@/components/field/field-label'
import { Button } from '@/components/ui/button'
import { HTTPPathMatchType } from '@/resources/interfaces/http-route.interface'
import {
  HttpRouteRuleSchema,
  HttpRouteSchema,
} from '@/resources/schemas/http-route.schema'
import { cn } from '@/utils/misc'
import { useForm, useFormMetadata } from '@conform-to/react'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { useEffect } from 'react'

const defaultValue: HttpRouteRuleSchema = {
  matches: [
    {
      path: {
        type: HTTPPathMatchType.PATH_PREFIX,
        value: '/',
      },
    },
  ],
  backendRefs: [
    {
      name: '',
      port: 80,
    },
  ],
  filters: [],
}

export const RulesForm = ({
  fields,
  defaultValues,
}: {
  fields: ReturnType<typeof useForm<HttpRouteSchema>>[1]
  defaultValues?: HttpRouteRuleSchema[]
}) => {
  const form = useFormMetadata('http-route-form')
  const ruleList = fields.rules.getFieldList()

  useEffect(() => {
    if (defaultValues && defaultValues.length > 0) {
      form.update({
        name: fields.rules.name,
        value: defaultValues,
      })
    } else if (ruleList.length === 0) {
      form.insert({
        name: fields.rules.name,
        defaultValue: defaultValue,
      })
    }
  }, [defaultValues])

  return (
    <div className="flex flex-col gap-3">
      <FieldLabel label="Rules" />

      <div className="space-y-4">
        {ruleList.map((field, index) => {
          const ruleFields = field.getFieldset()
          return (
            <div
              className="relative flex items-center gap-2 rounded-md border p-4"
              key={field.key}>
              <MatchesForm
                fields={
                  ruleFields as unknown as ReturnType<
                    typeof useForm<HttpRouteRuleSchema>
                  >[1]
                }
                defaultValues={defaultValues?.[index].matches}
              />

              {ruleList.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn('text-destructive relative top-2 w-fit')}
                  onClick={() => form.remove({ name: fields.rules.name, index })}>
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
        className="ml-1 w-fit"
        onClick={() =>
          form.insert({
            name: fields.rules.name,
            defaultValue: defaultValue,
          })
        }>
        <PlusIcon className="size-4" />
        Add
      </Button>
    </div>
  )
}
