import { VirtualMachineForm } from './virtual-machine-form'
import { Field } from '@/components/field/field'
import { List, ListItem } from '@/components/list/list'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RUNTIME_TYPES } from '@/constants/options'
import { RuntimeType } from '@/resources/interfaces/workload.interface'
import { RuntimeSchema, RuntimeVMSchema } from '@/resources/schemas/workload.schema'
import { getSelectProps, useForm, useInputControl } from '@conform-to/react'
import { useEffect, useMemo } from 'react'

export const RuntimeForm = ({
  fields,
  defaultValues,
}: {
  fields: ReturnType<typeof useForm<RuntimeSchema>>[1]
  defaultValues?: RuntimeSchema
}) => {
  const instanceTypeControl = useInputControl(fields.instanceType)
  const runtimeTypeControl = useInputControl(fields.runtimeType)

  useEffect(() => {
    if (!defaultValues) return

    // Only set values if they exist in defaultValues and current fields are empty
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

  return (
    <div className="flex w-full flex-col items-start gap-4">
      <Field label="Instance Type" errors={fields.instanceType.errors} className="w-full">
        <Select
          {...getSelectProps(fields.instanceType)}
          onValueChange={instanceTypeControl.change}
          key={fields.instanceType.id}
          value={fields.instanceType.value?.toString()}
          defaultValue={defaultValues?.instanceType}>
          <SelectTrigger
            disabled
            className="h-auto min-h-10 w-full items-center justify-between px-3 text-sm font-medium [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0">
            <SelectValue placeholder="Select an instance type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              value="datumcloud/d1-standard-2"
              className="w-[var(--radix-select-trigger-width)]">
              datumcloud/d1-standard-2
            </SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field
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
          onValueChange={runtimeTypeControl.change}
          key={fields.runtimeType.id}
          value={fields.runtimeType.value?.toString()}
          defaultValue={defaultValues?.runtimeType}>
          <SelectTrigger className="h-auto min-h-10 w-full items-center justify-between px-3 text-sm font-medium [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0">
            <SelectValue placeholder="Select a type" />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(RUNTIME_TYPES).map((runtimeType) => (
              <SelectItem
                disabled={runtimeType === RuntimeType.CONTAINER}
                key={runtimeType}
                value={runtimeType}
                className="w-[var(--radix-select-trigger-width)]">
                {RUNTIME_TYPES[runtimeType as keyof typeof RUNTIME_TYPES].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      {fields.runtimeType.value === RuntimeType.VM && (
        <VirtualMachineForm
          fields={
            fields.virtualMachine.getFieldset() as ReturnType<
              typeof useForm<RuntimeVMSchema>
            >[1]
          }
          defaultValues={defaultValues?.virtualMachine as RuntimeVMSchema}
        />
      )}
    </div>
  )
}

export const RuntimePreview = ({ values }: { values: RuntimeSchema }) => {
  const listItems: ListItem[] = useMemo(() => {
    if (values) {
      return [
        { label: 'Instance Type', content: values.instanceType },
        {
          label: 'Runtime Type',
          content: (
            <span className="capitalize">
              {values.runtimeType
                ? RUNTIME_TYPES[values.runtimeType as keyof typeof RUNTIME_TYPES]?.label
                : 'None'}
            </span>
          ),
          hidden: !values.runtimeType,
        },
        {
          label: 'Boot Image',
          content: values.virtualMachine?.bootImage,
          hidden: values.runtimeType !== RuntimeType.VM,
        },
        {
          label: 'SSH Key',
          content: (
            <span className="max-w-2xs text-left text-ellipsis">
              {values.virtualMachine?.sshKey}
            </span>
          ),
          hidden: values.runtimeType !== RuntimeType.VM,
        },
      ]
    }

    return []
  }, [values])

  return <List items={listItems} itemClassName="!border-b-0 !px-0 py-1.5" />
}
