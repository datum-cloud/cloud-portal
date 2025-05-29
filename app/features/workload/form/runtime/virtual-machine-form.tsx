import { PortsForm } from './ports-form';
import { Field } from '@/components/field/field';
import {
  SelectValue,
  SelectTrigger,
  SelectItem,
  SelectContent,
  Select,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { BOOT_IMAGES } from '@/constants/bootImages';
import { RuntimePortSchema, RuntimeVMSchema } from '@/resources/schemas/workload.schema';
import { getSelectProps, getTextareaProps, useForm, useInputControl } from '@conform-to/react';
import { useEffect, useRef } from 'react';
import { useHydrated } from 'remix-utils/use-hydrated';

export const VirtualMachineForm = ({
  fields,
  defaultValue,
  isEdit = false,
}: {
  fields: ReturnType<typeof useForm<RuntimeVMSchema>>[1];
  defaultValue?: RuntimeVMSchema;
  isEdit?: boolean;
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isHydrated = useHydrated();
  const bootImageControl = useInputControl(fields.bootImage);
  const sshKeyControl = useInputControl(fields.sshKey);

  useEffect(() => {
    if (defaultValue) {
      if (defaultValue.sshKey && !fields.sshKey.value) {
        sshKeyControl.change(defaultValue.sshKey);
      }

      if (defaultValue.bootImage && !fields.bootImage.value) {
        bootImageControl.change(defaultValue.bootImage);
      }
    }
  }, [defaultValue, bootImageControl, sshKeyControl, fields.bootImage.value, fields.sshKey.value]);

  // Focus the input when the form is hydrated
  useEffect(() => {
    isHydrated && inputRef.current?.focus();
  }, [isHydrated]);

  return (
    <div className="flex w-full flex-col gap-4">
      <Field isRequired label="Boot Image" errors={fields.bootImage.errors} className="w-full">
        <Select
          {...getSelectProps(fields.bootImage)}
          onValueChange={(value) => bootImageControl.change(value?.toString())}
          key={fields.bootImage.id}
          value={fields.bootImage.value?.toString()}
          defaultValue={defaultValue?.bootImage}>
          <SelectTrigger disabled>
            <SelectValue placeholder="Select a boot image" />
          </SelectTrigger>
          <SelectContent>
            {BOOT_IMAGES.map((bootImage) => (
              <SelectItem key={bootImage} value={bootImage}>
                {bootImage}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        isRequired
        label="SSH Key"
        errors={fields.sshKey.errors}
        className="w-full"
        description={
          <span className="text-muted-foreground text-xs">
            Required format:{' '}
            <code className="bg-muted rounded px-1 py-0.5 text-xs">username:key</code>
            (e.g.,{' '}
            <code className="bg-muted rounded px-1 py-0.5 text-xs">admin:ssh-rsa AAAAB3N...</code>)
          </span>
        }>
        <Textarea
          {...getTextareaProps(fields.sshKey)}
          ref={isEdit ? undefined : inputRef}
          key={fields.sshKey.id}
          placeholder="username:key"
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const value = (e.target as HTMLTextAreaElement).value;
            sshKeyControl.change(value);
          }}
        />
      </Field>

      <div className="flex w-full flex-col gap-2">
        <h3 className="text-sm font-medium">Ports</h3>
        <PortsForm
          fields={
            fields as unknown as ReturnType<typeof useForm<{ ports: RuntimePortSchema[] }>>[1]
          }
          defaultValue={defaultValue?.ports}
          isEdit={isEdit}
        />
      </div>
    </div>
  );
};
