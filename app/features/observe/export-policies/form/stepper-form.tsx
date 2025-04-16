/* eslint-disable @typescript-eslint/no-explicit-any */
import { MetadataForm, MetadataPreview } from './metadata-form'
import { SinksForm } from './sink/sinks-form'
import { SinksPreview } from './sink/sinks-preview'
import { SourcesForm } from './source/sources-form'
import { SourcesPreview } from './source/sources-preview'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { useIsPending } from '@/hooks/useIsPending'
import {
  ExportPolicySinkType,
  ExportPolicySourceType,
  IExportPolicyControlResponse,
} from '@/resources/interfaces/policy.interface'
import {
  exportPolicyMetadataSchema,
  exportPolicySourcesSchema,
  exportPolicySinksSchema,
  NewExportPolicySchema,
  ExportPolicyMetadataSchema,
  ExportPolicySourcesSchema,
  ExportPolicySinksSchema,
  ExportPolicySourceFieldSchema,
} from '@/resources/schemas/export-policy.schema'
import { cn } from '@/utils/misc'
import { FormMetadata, FormProvider, getFormProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { defineStepper } from '@stepperize/react'
import { FileIcon, Layers, Loader2, Terminal } from 'lucide-react'
import React, { useMemo } from 'react'
import { Form, useNavigate, useSubmit } from 'react-router'
import { useAuthenticityToken } from 'remix-utils/csrf/react'

const { useStepper } = defineStepper(
  {
    id: 'metadata',
    label: 'Metadata',
    description:
      'Define essential information and labels for your export policy resource.',
    icon: () => <Layers />,
    schema: exportPolicyMetadataSchema,
    preview: (values?: any) => (
      <MetadataPreview values={values?.metadata as ExportPolicyMetadataSchema} />
    ),
  },
  {
    id: 'sources',
    label: 'Sources',
    description:
      'Define essential information and labels for your export policy resource.',
    icon: () => <FileIcon />,
    schema: exportPolicySourcesSchema,
    preview: (values?: any) => (
      <SourcesPreview values={values?.sources as ExportPolicySourcesSchema} />
    ),
  },
  {
    id: 'sinks',
    label: 'Sinks',
    description:
      'Define essential information and labels for your export policy resource.',
    icon: () => <Terminal />,
    schema: exportPolicySinksSchema,
    preview: (values?: any) => (
      <SinksPreview values={values?.sinks as ExportPolicySinksSchema} />
    ),
  },
)

export const ExportPolicyStepperForm = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  projectId,
  defaultValue,
}: {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  projectId?: string
  defaultValue?: IExportPolicyControlResponse
}) => {
  const submit = useSubmit()
  const navigate = useNavigate()
  const isPending = useIsPending()
  const csrf = useAuthenticityToken()

  const initialValues = {
    sources: [
      {
        name: undefined,
        type: ExportPolicySourceType.METRICS,
        metricQuery: '{}',
      },
    ],
    sinks: [
      {
        name: undefined,
        type: ExportPolicySinkType.PROMETHEUS,
      },
    ],
  }

  const stepper = useStepper({ initialMetadata: initialValues })

  const [form, fields] = useForm({
    id: 'export-policy-form',
    constraint: getZodConstraint(stepper.current.schema),
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onBlur',
    defaultValue: initialValues,
    onValidate({ formData }) {
      const parsed = parseWithZod(formData, { schema: stepper.current.schema })
      if (parsed.status === 'success') {
        stepper.setMetadata(stepper.current.id, parsed.value ?? {})
      }
      return parsed
    },
    onSubmit(event, { submission }) {
      event.preventDefault()
      event.stopPropagation()
      const data = submission?.status === 'success' ? submission.value : {}

      if (stepper.isLast) {
        // Collect all metadata from all steps
        const allMetadata: any = stepper.all.reduce((acc, step) => {
          const stepMetadata = stepper.getMetadata(step.id)
          return { ...acc, ...(stepMetadata || {}) }
        }, {})

        const formatted: NewExportPolicySchema = {
          metadata: {
            name: allMetadata.name,
            labels: allMetadata.labels,
            annotations: allMetadata.annotations,
          },
          sources: allMetadata.sources,
          sinks: allMetadata.sinks,
          ...data,
        }

        // When we reach the last step, submit the complete form data to the server
        // using the Remix form submission mechanism with FormData

        // Since we've already called preventDefault() at the top of the handler,
        // we need to manually trigger the form submission to Remix
        const formElement = event.currentTarget as HTMLFormElement

        const payload = {
          ...formatted,
          csrf: csrf as string,
        }

        if (isEdit) {
          Object.assign(payload, {
            resourceVersion: defaultValue?.resourceVersion,
          })
        }

        // Submit the form using the Remix submit function
        // This will trigger the action defined in the route
        submit(payload, {
          method: 'POST',
          action: formElement.getAttribute('action') || undefined,
          encType: 'application/json',
          replace: true,
        })
      } else {
        stepper.next()
      }
    },
  })

  const isEdit = useMemo(() => {
    return defaultValue?.uid !== undefined
  }, [defaultValue])

  const handleBack = () => {
    if (stepper.isFirst) {
      navigate(-1)
    } else {
      stepper.prev()
    }
  }

  return (
    <Card className="relative">
      <CardHeader>
        <CardTitle>{isEdit ? 'Update' : 'Create a new'} export policy</CardTitle>
        <CardDescription>
          {isEdit
            ? 'Update the export policy with the new values below.'
            : 'Create a new export policy to get started with Datum Cloud.'}
        </CardDescription>
      </CardHeader>
      <FormProvider context={form.context}>
        <Form
          {...getFormProps(form)}
          id={form.id}
          method="POST"
          autoComplete="off"
          className="flex flex-col gap-6">
          <CardContent>
            {isPending && (
              <div className="bg-background/20 absolute inset-0 z-10 flex items-center justify-center gap-2 backdrop-blur-xs">
                <Loader2 className="size-4 animate-spin" />
                {isEdit ? 'Saving' : 'Creating'} export policy...
              </div>
            )}
            <nav aria-label="Export Policy Steps" className="group">
              <ol className="relative ml-4 border-s border-gray-200 dark:border-gray-700 dark:text-gray-400">
                {stepper.all.map((step, index, array) => (
                  <React.Fragment key={step.id}>
                    <li
                      className={cn(
                        'ms-7',
                        index < array.length - 1 && stepper.current.id !== step.id
                          ? 'mb-4'
                          : '',
                      )}>
                      <span className="absolute -start-4 flex size-8 items-center justify-center rounded-full bg-gray-100 ring-4 ring-white dark:bg-gray-700 dark:ring-gray-900">
                        {React.cloneElement(step.icon(), {
                          className: 'size-3.5 text-gray-600 dark:text-gray-500',
                        })}
                      </span>
                      <div className="flex flex-col gap-1 pt-1.5">
                        <p className="text-base leading-tight font-medium">
                          {step.label}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {step.description}
                        </p>
                      </div>
                    </li>
                    {stepper.current.id === step.id && !isPending ? (
                      <div className="flex-1 py-6 pl-7">
                        {stepper.switch({
                          metadata: () => (
                            <MetadataForm
                              isEdit={isEdit}
                              defaultValues={
                                stepper.getMetadata(
                                  'metadata',
                                ) as ExportPolicyMetadataSchema
                              }
                              fields={
                                fields as unknown as ReturnType<
                                  typeof useForm<ExportPolicyMetadataSchema>
                                >[1]
                              }
                            />
                          ),
                          sources: () => (
                            <SourcesForm
                              isEdit={isEdit}
                              form={form as FormMetadata<ExportPolicySourcesSchema>}
                              fields={
                                fields as unknown as ReturnType<
                                  typeof useForm<ExportPolicySourcesSchema>
                                >[1]
                              }
                              defaultValues={
                                stepper.getMetadata(
                                  'sources',
                                ) as ExportPolicySourcesSchema
                              }
                            />
                          ),
                          sinks: () => (
                            <SinksForm
                              isEdit={isEdit}
                              form={form as FormMetadata<ExportPolicySinksSchema>}
                              fields={
                                fields as unknown as ReturnType<
                                  typeof useForm<ExportPolicySinksSchema>
                                >[1]
                              }
                              defaultValues={
                                stepper.getMetadata('sinks') as ExportPolicySinksSchema
                              }
                              sourcesList={
                                stepper.getMetadata('sources')
                                  ?.sources as ExportPolicySourceFieldSchema[]
                              }
                            />
                          ),
                        })}

                        <div className="mt-4 flex items-center justify-end gap-2 border-t pt-4">
                          <div className="flex items-center gap-2">
                            <Button type="button" variant="link" onClick={handleBack}>
                              {stepper.isFirst ? 'Cancel' : 'Back'}
                            </Button>
                            <Button
                              variant="default"
                              type="submit"
                              disabled={isPending}
                              isLoading={isPending}>
                              {stepper.isLast ? (isEdit ? 'Save' : 'Create') : 'Next'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 px-7 pb-6">
                        {step.preview(stepper.metadata)}
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </ol>
            </nav>
          </CardContent>
        </Form>
      </FormProvider>
    </Card>
  )
}
