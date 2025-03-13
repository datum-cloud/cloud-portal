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
import { useConfirmationDialog } from '@/providers/confirmationDialog.provider'
import { IWorkloadControlResponse } from '@/resources/interfaces/workload.interface'
import { workloadSchema, updateWorkloadSchema } from '@/resources/schemas/workload.schema'
import { ROUTE_PATH as WORKLOADS_ACTIONS_ROUTE_PATH } from '@/routes/api+/workloads+/actions'
import { jsonToYaml } from '@/utils/editor'
import { cn, useIsPending } from '@/utils/misc'
import { getFormProps, useForm, useInputControl } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { InfoIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Form, useNavigate, useSubmit } from 'react-router'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'

export const WorkloadForm = ({
  projectId,
  orgId,
  defaultValue,
  hideTitle = false,
}: {
  projectId?: string
  orgId?: string
  defaultValue?: IWorkloadControlResponse
  hideTitle?: boolean
}) => {
  const isPending = useIsPending()
  const navigate = useNavigate()
  const submit = useSubmit()
  const { confirm } = useConfirmationDialog()

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

  const deleteWorkload = async () => {
    await confirm({
      title: 'Delete Workload',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{defaultValue?.name}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      confirmInputLabel: `Type "${defaultValue?.name}" to confirm.`,
      confirmInputPlaceholder: 'Type the workload name to confirm deletion',
      confirmValue: defaultValue?.name ?? 'delete',
      onSubmit: async () => {
        await submit(
          {
            workloadId: defaultValue?.name ?? '',
            projectId: projectId ?? '',
            orgId: orgId ?? '',
          },
          {
            action: WORKLOADS_ACTIONS_ROUTE_PATH,
            method: 'DELETE',
            fetcherKey: 'workload-resources',
            navigate: false,
          },
        )
      },
    })
  }

  return (
    <Card>
      {!hideTitle && (
        <CardHeader>
          <CardTitle>{isEdit ? 'Update' : 'Create a new'} workload</CardTitle>
          <CardDescription>
            {isEdit
              ? 'Update the workload with the new values below.'
              : 'Create a new workload to get started with Datum Cloud.'}
          </CardDescription>
        </CardHeader>
      )}
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

        <CardContent className={cn('space-y-4', hideTitle && 'pt-6')}>
          {isEdit && defaultValue && (
            <SimpleWorkloadDetail projectId={projectId} workload={defaultValue} />
          )}

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
        <CardFooter
          className={cn(
            'flex items-center justify-between gap-2',
            !isEdit && 'justify-end',
          )}>
          {isEdit && (
            <Button
              type="button"
              variant="destructive"
              onClick={deleteWorkload}
              disabled={isPending}>
              Delete
            </Button>
          )}

          <div className="flex items-center gap-2">
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
          </div>
        </CardFooter>
      </Form>
    </Card>
  )
}
