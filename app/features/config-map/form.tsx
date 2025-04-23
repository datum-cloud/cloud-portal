import { SimpleConfigMapDetail } from './simple-detail'
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
import { useIsPending } from '@/hooks/useIsPending'
import { IConfigMapControlResponse } from '@/resources/interfaces/config-map.interface'
import {
  configMapSchema,
  updateConfigMapSchema,
} from '@/resources/schemas/config-map.schema'
import { jsonToYaml } from '@/utils/editor'
import { getFormProps, useForm, useInputControl } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { InfoIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Form, useNavigate } from 'react-router'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'

export const ConfigMapForm = ({
  defaultValue,
}: {
  defaultValue?: IConfigMapControlResponse
}) => {
  const isPending = useIsPending()
  const navigate = useNavigate()

  const [form, fields] = useForm({
    constraint: getZodConstraint(defaultValue ? updateConfigMapSchema : configMapSchema),
    shouldValidate: 'onInput',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema: defaultValue ? updateConfigMapSchema : configMapSchema,
      })
    },
    defaultValue: {
      content: '',
      format: 'yaml',
    },
  })

  const [hasData, setHasData] = useState<boolean>(true)
  const isEdit = useMemo(() => defaultValue?.uid !== undefined, [defaultValue])

  const configFormatControl = useInputControl(fields.format)
  const configValueControl = useInputControl(fields.content)

  useEffect(() => {
    if (defaultValue) {
      const data = Object.fromEntries(
        Object.entries(defaultValue).filter(([key]) =>
          ['data', 'binaryData'].includes(key),
        ),
      )

      setHasData(data?.data !== undefined)
      form.update({
        value: {
          // TODO: currently only supports data. add support for binaryData
          content: data?.data ? jsonToYaml(JSON.stringify(data.data)) : '',
          format: 'yaml',
        },
      })
    }
  }, [defaultValue])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Update' : 'Create a new'} config map</CardTitle>
        <CardDescription>
          {isEdit
            ? 'Update the config map with the new values below.'
            : 'Create a new config map to get started with Datum Cloud.'}
        </CardDescription>
      </CardHeader>
      <Form
        method="POST"
        autoComplete="off"
        {...getFormProps(form)}
        className="flex flex-col gap-6">
        <AuthenticityTokenInput />

        {isEdit && (
          <input
            type="hidden"
            name="resourceVersion"
            value={defaultValue?.resourceVersion}
          />
        )}

        <CardContent className="space-y-4">
          {isEdit && defaultValue && <SimpleConfigMapDetail configMap={defaultValue} />}

          {hasData ? (
            <Field
              isRequired
              label={isEdit ? 'Data' : 'Configuration'}
              errors={fields.content.errors}>
              <CodeEditorTabs
                error={fields.content.errors?.[0]}
                value={fields.content.value ?? ''}
                onChange={(newValue, format) => {
                  configValueControl.change(newValue)
                  configFormatControl.change(format as string)
                }}
                format={fields.format.value as EditorLanguage}
                onFormatChange={(format: EditorLanguage) => {
                  configFormatControl.change(format as string)
                }}
                name="configuration"
                minHeight="300px"
              />
            </Field>
          ) : (
            <Alert variant="secondary">
              <InfoIcon className="size-4" />
              <AlertTitle>Information</AlertTitle>
              <AlertDescription>This config map does not have any data.</AlertDescription>
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
            Return to List
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
