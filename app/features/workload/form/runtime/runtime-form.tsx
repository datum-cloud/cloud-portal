import { ContainerForm } from './container-form'
import { VirtualMachineForm } from './virtual-machine-form'
import { Field } from '@/components/field/field'
import { FieldLabel } from '@/components/field/field-label'
import { List, ListItem } from '@/components/list/list'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { RUNTIME_TYPES } from '@/constants/options'
import { RuntimeType } from '@/resources/interfaces/workload.interface'
import {
  RuntimeContainerSchema,
  RuntimeSchema,
  RuntimeVMSchema,
} from '@/resources/schemas/workload.schema'
import {
  getSelectProps,
  useForm,
  useFormMetadata,
  useInputControl,
} from '@conform-to/react'
import { useEffect, useMemo } from 'react'

export const RuntimeForm = ({
  fields,
  defaultValues,
  isEdit = false,
  projectId,
}: {
  fields: ReturnType<typeof useForm<RuntimeSchema>>[1]
  defaultValues?: RuntimeSchema
  isEdit?: boolean
  projectId?: string
}) => {
  const form = useFormMetadata('workload-form')
  const instanceTypeControl = useInputControl(fields.instanceType)
  const runtimeTypeControl = useInputControl(fields.runtimeType)

  useEffect(() => {
    if (!defaultValues) return

    if (defaultValues.instanceType && !fields.instanceType.value) {
      instanceTypeControl.change(defaultValues.instanceType)
    }

    if (defaultValues.runtimeType && !fields.runtimeType.value) {
      runtimeTypeControl.change(defaultValues.runtimeType)
    }
  }, [
    defaultValues,
    instanceTypeControl,
    runtimeTypeControl,
    fields.instanceType.value,
    fields.runtimeType.value,
  ])

  const handleRuntimeTypeChange = (value: string) => {
    runtimeTypeControl.change(value as RuntimeType)

    if (
      value === RuntimeType.CONTAINER &&
      (defaultValues?.containers ?? []).length === 0
    ) {
      form.update({
        name: fields.containers.name,
        value: [{ name: '', image: '' }],
      })
    }
  }

  return (
    <div className="flex w-full flex-col items-start gap-4">
      <Field
        isRequired
        label="Instance Type"
        errors={fields.instanceType.errors}
        className="w-full">
        <Select
          {...getSelectProps(fields.instanceType)}
          onValueChange={instanceTypeControl.change}
          key={fields.instanceType.id}
          value={instanceTypeControl.value}
          defaultValue={defaultValues?.instanceType}>
          <SelectTrigger disabled>
            <SelectValue placeholder="Select an instance type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="datumcloud/d1-standard-2">
              datumcloud/d1-standard-2
            </SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field
        isRequired
        label="Runtime Type"
        errors={fields.runtimeType.errors}
        className="w-full"
        tooltipInfo={
          <div className="max-w-2xs space-y-2">
            <p>
              <strong>Container:</strong> A sandbox is a managed isolated environment
              capable of running containers.
            </p>
            <p>
              <strong>Virtual Machine:</strong> A virtual machine is a classical VM
              environment, booting a full OS provided by the user via an image.
            </p>
          </div>
        }>
        <Select
          {...getSelectProps(fields.runtimeType)}
          onValueChange={handleRuntimeTypeChange}
          key={fields.runtimeType.id}
          value={runtimeTypeControl.value?.toString()}
          defaultValue={defaultValues?.runtimeType}>
          <SelectTrigger>
            <SelectValue placeholder="Select a type" />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(RUNTIME_TYPES).map((runtimeType) => (
              <SelectItem key={runtimeType} value={runtimeType}>
                {RUNTIME_TYPES[runtimeType as keyof typeof RUNTIME_TYPES].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      {fields.runtimeType.value === RuntimeType.VM ? (
        <VirtualMachineForm
          isEdit={isEdit}
          fields={
            fields.virtualMachine.getFieldset() as ReturnType<
              typeof useForm<RuntimeVMSchema>
            >[1]
          }
          defaultValues={defaultValues?.virtualMachine as RuntimeVMSchema}
        />
      ) : fields.runtimeType.value === RuntimeType.CONTAINER ? (
        <div className="flex w-full flex-col gap-2">
          <FieldLabel label="Containers" />
          <ContainerForm
            projectId={projectId}
            isEdit={isEdit}
            fields={fields as unknown as ReturnType<typeof useForm<RuntimeSchema>>[1]}
            defaultValues={defaultValues?.containers as RuntimeContainerSchema[]}
          />
        </div>
      ) : null}
    </div>
  )
}

export const RuntimePreview = ({ values }: { values: RuntimeSchema }) => {
  const vmSpecificItems = useMemo(() => {
    if (values.runtimeType !== RuntimeType.VM) return []

    return [
      { label: 'Boot Image', content: values.virtualMachine?.bootImage },
      {
        label: 'SSH Key',
        content: (
          <span className="max-w-2xs text-left text-ellipsis">
            {values.virtualMachine?.sshKey}
          </span>
        ),
      },
      {
        label: 'Ports',
        className: 'items-start',
        content: (
          <div className="flex flex-col gap-2">
            {(values.virtualMachine?.ports || []).map((port, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="font-medium">{port.name}</span>
                <Separator orientation="vertical" className="h-4" />
                <span className="text-muted-foreground text-sm">
                  {port.port}:{port.protocol}
                </span>
              </div>
            ))}
          </div>
        ),
        hidden: !((values.virtualMachine?.ports ?? []).length > 0),
      },
    ]
  }, [values.runtimeType, values.virtualMachine])

  const containerSpecificItems = useMemo(() => {
    if (values.runtimeType !== RuntimeType.CONTAINER) return []

    return [
      {
        label: 'Containers',
        className: 'items-start',
        content: (
          <div className="flex flex-col gap-2">
            {(values.containers || []).map((container, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="font-medium">{container.name}</span>
                <Separator orientation="vertical" className="h-4" />
                <Badge variant="outline">{container.image}</Badge>
                {(container.ports ?? []).length > 0 && (
                  <>
                    <Separator orientation="vertical" className="h-4" />
                    <span className="text-muted-foreground text-sm">
                      {container.ports
                        ?.map((port) => `${port.name}:${port.port}:${port.protocol}`)
                        .join(', ')}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        ),
        hidden: !((values.containers ?? []).length > 0),
      },
    ]
  }, [values.runtimeType, values.containers])

  const listItems: ListItem[] = useMemo(() => {
    if (!values) return []

    const commonItems = [
      { label: 'Instance Type', content: values.instanceType },
      {
        label: 'Runtime Type',
        content: values.runtimeType && (
          <span className="capitalize">
            {RUNTIME_TYPES[values.runtimeType as keyof typeof RUNTIME_TYPES]?.label ||
              'None'}
          </span>
        ),
        hidden: !values.runtimeType,
      },
    ]

    return [...commonItems, ...vmSpecificItems, ...containerSpecificItems]
  }, [values])

  return <List items={listItems} itemClassName="!border-b-0 !px-0 py-1.5" />
}
