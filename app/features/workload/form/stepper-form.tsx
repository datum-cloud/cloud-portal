/* eslint-disable @typescript-eslint/no-explicit-any */
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
  StorageType,
} from '@/resources/interfaces/workload.interface'
import {
  MetadataSchema,
  metadataSchema,
  NetworkFieldSchema,
  NetworksSchema,
  networksSchema,
  NewWorkloadSchema,
  PlacementFieldSchema,
  placementsSchema,
  PlacementsSchema,
  RuntimeSchema,
  runtimeSchema,
  StorageFieldSchema,
  StoragesSchema,
  storagesSchema,
} from '@/resources/schemas/workload.schema'
import { cn, convertObjectToLabels } from '@/utils/misc'
import { getFormProps, useForm, FormProvider, FormMetadata } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { defineStepper } from '@stepperize/react'
import { filter, find, flatMap, get, has, map } from 'es-toolkit/compat'
import { Cpu, HardDrive, Layers, Loader2, Network, Server } from 'lucide-react'
import React, { useEffect, useMemo } from 'react'
import { Form, useNavigate, useSubmit } from 'react-router'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'

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

        // Get the form element
        const formElement = event.currentTarget as HTMLFormElement
        const formData = new FormData(formElement)
        const csrf = formData.get('csrf')

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
      const { spec, ...rest } = defaultValue

      // Extract relevant sections from the spec
      const placementsSpec = get(spec, 'placements', [])
      const runtimeSpec = get(spec, 'template.spec.runtime', {})
      const volumesSpec = get(spec, 'template.spec.volumes', [])
      const networkInterfaces = get(spec, 'template.spec.networkInterfaces', [])

      // Determine if this is a VM workload
      const isVm = has(runtimeSpec, 'virtualMachine')

      // Find boot storage and extract boot image information
      const bootStorage = find(volumesSpec, (volume) => volume.name === 'boot')
      const bootImage = get(bootStorage, 'disk.template.spec.populator.image.name', '')

      // ==========================================
      // Map API spec format to form schema format
      // ==========================================

      // 1. Metadata mapping
      const metadata: MetadataSchema = {
        name: rest?.name ?? '',
        labels: convertObjectToLabels(rest?.labels ?? {}),
        annotations: convertObjectToLabels(rest?.annotations ?? {}),
      }

      // 2. Runtime configuration mapping
      const runtime: RuntimeSchema = {
        instanceType: (runtimeSpec as any)?.resources?.instanceType ?? '',
        runtimeType: isVm ? RuntimeType.VM : RuntimeType.CONTAINER,
        // Only include VM-specific configuration if this is a VM workload
        virtualMachine: isVm
          ? {
              sshKey:
                spec?.template?.metadata?.annotations?.[
                  'compute.datumapis.com/ssh-keys'
                ] ?? '',
              bootImage: bootImage,
              ports: (runtimeSpec as any)?.virtualMachine?.ports ?? [],
            }
          : undefined,
        containers: !isVm
          ? (runtimeSpec as any)?.sandbox?.containers.map((container: any) => ({
              name: container.name,
              image: container.image,
              ports: container?.ports ?? [],
            }))
          : undefined,
      }

      // 3. Network configuration mapping
      // Extract network interfaces and their IP families
      const networks: NetworkFieldSchema[] = map(
        networkInterfaces,
        (networkInterface) => ({
          name: networkInterface?.network?.name ?? '',
          ipFamilies: flatMap(networkInterface.networkPolicy?.ingress ?? [], (ingress) =>
            flatMap(ingress.from ?? [], (from) =>
              // Determine IP family based on CIDR
              from.ipBlock?.cidr === '0.0.0.0/0' ? ['IPv4'] : ['IPv6'],
            ),
          ),
        }),
      )

      // 4. Storage configuration mapping
      // Filter out boot volume as it's handled separately in VM configuration
      const storages: StorageFieldSchema[] = map(
        filter(volumesSpec, (volume) => volume.name !== 'boot'),
        (volume) => ({
          name: volume.name ?? '',
          type: StorageType.FILESYSTEM,
          // Convert storage size from string (e.g., "10Gi") to number
          size:
            Number(
              String(
                get(volume, 'disk.template.spec.resources.requests.storage', '0'),
              ).replace('Gi', ''),
            ) || 0,
        }),
      )

      // 5. Placement configuration mapping
      const placements: PlacementFieldSchema[] = map(placementsSpec, (placement) => ({
        name: placement.name ?? '',
        cityCode: placement.cityCodes?.[0] ?? '',
        minimumReplicas: placement.scaleSettings?.minReplicas ?? 1,
      }))

      // Consolidate all mapped data
      const formValue = {
        metadata,
        runtime,
        networks,
        storages,
        placements,
      }

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
    <Card>
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
          <AuthenticityTokenInput />
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
