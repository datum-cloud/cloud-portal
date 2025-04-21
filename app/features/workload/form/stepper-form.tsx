/* eslint-disable @typescript-eslint/no-explicit-any */
import { WorkloadHelper } from '../helper'
import { MetadataForm, MetadataPreview } from './metadata-form'
import { NetworksForm, NetworkPreview } from './network/networks-form'
import { PlacementsForm, PlacementsPreview } from './placement/placements-form'
import { RuntimeForm, RuntimePreview } from './runtime/runtime-form'
import { StoragesForm, StoragesPreview } from './storage/storages-form'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useIsPending } from '@/hooks/useIsPending'
import {
  IWorkloadControlResponse,
  RuntimeType,
} from '@/resources/interfaces/workload.interface'
import { MetadataSchema, metadataSchema } from '@/resources/schemas/metadata.schema'
import {
  NetworksSchema,
  networksSchema,
  NewWorkloadSchema,
  placementsSchema,
  PlacementsSchema,
  RuntimeSchema,
  runtimeSchema,
  StoragesSchema,
  storagesSchema,
} from '@/resources/schemas/workload.schema'
import { cn } from '@/utils/misc'
import { getFormProps, useForm, FormProvider, FormMetadata } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { defineStepper } from '@stepperize/react'
import { Cpu, HardDrive, Layers, Loader2, Network, Server } from 'lucide-react'
import React, { useEffect, useMemo } from 'react'
import { Form, useNavigate, useSubmit } from 'react-router'
import { useAuthenticityToken } from 'remix-utils/csrf/react'

const { useStepper } = defineStepper(
  {
    id: 'metadata',
    label: 'Metadata',
    description: 'Define essential information and labels for your workload resource.',
    icon: () => <Layers />,
    schema: metadataSchema,
    preview: (values?: any) => (
      <MetadataPreview values={values?.metadata as MetadataSchema} />
    ),
  },
  {
    id: 'runtime',
    label: 'Runtime',
    description:
      'Configure instance type and choose between Container or VM runtime environments.',
    icon: () => <Cpu />,
    schema: runtimeSchema,
    preview: (values?: any) => (
      <RuntimePreview values={values?.runtime as RuntimeSchema} />
    ),
  },
  {
    id: 'networks',
    label: 'Network Interfaces',
    description:
      'Configure network interfaces for your workload instances, including network selection and IP family options.',
    icon: () => <Network />,
    schema: networksSchema,
    preview: (values?: any) => (
      <NetworkPreview values={values?.networks as NetworksSchema} />
    ),
  },
  {
    id: 'storages',
    label: 'Storages',
    description: 'Add storage volumes with names and sizes.',
    icon: () => <HardDrive />,
    schema: storagesSchema,
    preview: (values?: any) => (
      <StoragesPreview
        values={values?.storages as StoragesSchema}
        vmBootImage={
          values?.runtime?.runtimeType === RuntimeType.VM
            ? values.runtime?.virtualMachine?.bootImage
            : undefined
        }
      />
    ),
  },
  {
    id: 'placements',
    label: 'Placements',
    description: 'Choose where to deploy your workload and set up scaling options.',
    icon: () => <Server />,
    schema: placementsSchema,
    preview: (values?: any) => (
      <PlacementsPreview values={values?.placements as PlacementsSchema} />
    ),
  },
)

export const WorkloadStepper = ({
  projectId,
  defaultValue,
}: {
  projectId?: string
  defaultValue?: IWorkloadControlResponse
}) => {
  const submit = useSubmit()
  const navigate = useNavigate()
  const isPending = useIsPending()
  const csrf = useAuthenticityToken()

  const initialValues = {
    runtime: {
      instanceType: 'datumcloud/d1-standard-2',
    },
    networks: [{ name: undefined, ipFamilies: [] }],
    storages: [],
    placements: [{ name: undefined, cityCode: undefined, minimumReplicas: 1 }],
  }

  const stepper = useStepper({ initialMetadata: initialValues })

  const [form, fields] = useForm({
    id: 'workload-form',
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

        const formatted: NewWorkloadSchema = {
          metadata: {
            name: allMetadata.name,
            labels: allMetadata.labels,
            annotations: allMetadata.annotations,
          },
          runtime: {
            instanceType: allMetadata.instanceType,
            runtimeType: allMetadata.runtimeType,
            virtualMachine: allMetadata.virtualMachine,
            containers: allMetadata.containers,
          },
          networks: allMetadata.networks,
          storages: allMetadata.storages,
          placements: allMetadata.placements,
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

  useEffect(() => {
    // Process default values when they exist to populate the form
    if (defaultValue) {
      const formValue = WorkloadHelper.mappingSpecToForm(defaultValue)
      const { metadata, runtime, networks, storages, placements } = formValue

      // Update form with the mapped values
      form.update({ value: formValue })

      // Update stepper metadata for each section
      // This allows each step to access its relevant data
      stepper.setMetadata('metadata', metadata)
      stepper.setMetadata('runtime', runtime)
      stepper.setMetadata('networks', { networks })
      stepper.setMetadata('storages', { storages })
      stepper.setMetadata('placements', { placements })
    }
  }, [defaultValue])

  // Enable this code if you want to automatically add a empty storage volume when creating a container workload
  /*   useEffect(() => {
    if (
      stepper.current.id === 'storages' &&
      stepper.metadata.runtime?.runtimeType === RuntimeType.CONTAINER &&
      stepper.metadata.storages?.length === 0
    ) {
      stepper.setMetadata('storages', {
        storages: [{ name: '', type: StorageType.FILESYSTEM }],
      })
    }
  }, [stepper.current, stepper.metadata]) */

  return (
    <Card className="relative">
      <CardHeader>
        <CardTitle>{isEdit ? 'Update' : 'Create a new'} workload</CardTitle>
        <CardDescription>
          {isEdit
            ? 'Update the workload with the new values below.'
            : 'Create a new workload to get started with Datum Cloud.'}
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
                {isEdit ? 'Saving' : 'Creating'} workload...
              </div>
            )}
            <nav aria-label="Workload Steps" className="group">
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
                                stepper.getMetadata('metadata') as MetadataSchema
                              }
                              fields={
                                fields as unknown as ReturnType<
                                  typeof useForm<MetadataSchema>
                                >[1]
                              }
                            />
                          ),
                          runtime: () => (
                            <RuntimeForm
                              defaultValues={
                                stepper.getMetadata('runtime') as RuntimeSchema
                              }
                              fields={
                                fields as unknown as ReturnType<
                                  typeof useForm<RuntimeSchema>
                                >[1]
                              }
                            />
                          ),
                          networks: () => (
                            <NetworksForm
                              form={form as FormMetadata<NetworksSchema>}
                              projectId={projectId}
                              defaultValues={
                                stepper.getMetadata('networks') as NetworksSchema
                              }
                              fields={
                                fields as ReturnType<typeof useForm<NetworksSchema>>[1]
                              }
                            />
                          ),
                          storages: () => (
                            <StoragesForm
                              form={form as FormMetadata<StoragesSchema>}
                              defaultValues={
                                stepper.getMetadata('storages') as StoragesSchema
                              }
                              fields={
                                fields as unknown as ReturnType<
                                  typeof useForm<StoragesSchema>
                                >[1]
                              }
                              vmBootImage={
                                stepper.metadata.runtime?.runtimeType === RuntimeType.VM
                                  ? stepper.metadata.runtime?.virtualMachine?.bootImage
                                  : undefined
                              }
                            />
                          ),
                          placements: () => (
                            <PlacementsForm
                              form={form as FormMetadata<PlacementsSchema>}
                              fields={
                                fields as ReturnType<typeof useForm<PlacementsSchema>>[1]
                              }
                              defaultValues={
                                stepper.getMetadata('placements') as PlacementsSchema
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
