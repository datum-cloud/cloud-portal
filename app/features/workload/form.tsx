import { SimpleWorkloadDetail } from './simple-detail'
import { CodeEditorTabs } from '@/components/code-editor/code-editor-tabs'
import { EditorLanguage } from '@/components/code-editor/code-editor.types'
import { Field } from '@/components/field/field'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { IWorkloadControlResponse } from '@/resources/interfaces/workload.interface'
import { workloadSchema, updateWorkloadSchema } from '@/resources/schemas/workload.schema'
import { jsonToYaml } from '@/utils/editor'
import { useIsPending } from '@/utils/misc'
import { getFormProps, useForm, useInputControl } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { InfoIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Form, useNavigate } from 'react-router'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'

export const WorkloadForm = ({
  defaultValue,
}: {
  defaultValue?: IWorkloadControlResponse
}) => {
  const isPending = useIsPending()
  const navigate = useNavigate()

  const [form, fields] = useForm({
    constraint: getZodConstraint(defaultValue ? updateWorkloadSchema : workloadSchema),
    shouldValidate: 'onInput',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema: defaultValue ? updateWorkloadSchema : workloadSchema,
      })
    },
    defaultValue: {
      content: '',
      format: 'yaml',
    },
  })

  const [hasData, setHasData] = useState<boolean>(true)
  const isEdit = useMemo(() => defaultValue?.uid !== undefined, [defaultValue])

  const forrmatControl = useInputControl(fields.format)
  const valueControl = useInputControl(fields.content)

  useEffect(() => {
    if (defaultValue) {
      const { spec } = Object.fromEntries(
        Object.entries(defaultValue).filter(([key]) => key === 'spec'),
      )

      setHasData(true)
      form.update({
        value: {
          content: spec ? jsonToYaml(JSON.stringify(spec)) : '',
          format: 'yaml',
        },
      })
    }
  }, [defaultValue])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Update' : 'Create a new'} workload</CardTitle>
        <CardDescription>
          {isEdit
            ? 'Update the workload with the new values below.'
            : 'Create a new workload to get started with Datum Cloud.'}
        </CardDescription>
      </CardHeader>
      <Form method="POST" autoComplete="off" {...getFormProps(form)}>
        <AuthenticityTokenInput />

        {isEdit && (
          <input
            type="hidden"
            name="resourceVersion"
            value={defaultValue?.resourceVersion}
          />
        )}

        <CardContent className="space-y-4">
          {isEdit && defaultValue && <SimpleWorkloadDetail workload={defaultValue} />}

          {hasData ? (
            <Field
              label={isEdit ? 'Spec' : 'Configuration'}
              errors={fields.content.errors}>
              <CodeEditorTabs
                error={fields.content.errors?.[0]}
                value={fields.content.value ?? ''}
                onChange={(newValue, format) => {
                  valueControl.change(newValue)
                  forrmatControl.change(format as string)
                }}
                format={fields.format.value as EditorLanguage}
                onFormatChange={(format: EditorLanguage) => {
                  forrmatControl.change(format as string)
                }}
                name="configuration"
                minHeight="500px"
              />
            </Field>
          ) : (
            <Alert variant="secondary">
              <InfoIcon className="size-4" />
              <AlertTitle>Information</AlertTitle>
              <AlertDescription>This workload does not have any spec.</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button
            type="button"
            variant="link"
            disabled={isPending}
            onClick={() => {
              navigate(-1)
            }}>
            Cancel
          </Button>
          {hasData && (
            <Button
              variant="default"
              type="submit"
              disabled={isPending}
              isLoading={isPending}>
              {isPending
                ? `${isEdit ? 'Saving' : 'Creating'}`
                : `${isEdit ? 'Save' : 'Create'}`}
            </Button>
          )}
        </CardFooter>
      </Form>
    </Card>
  )
}
