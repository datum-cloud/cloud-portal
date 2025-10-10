import { Field } from '@/components/field/field';
import { SelectBox } from '@/components/select-box/select-box';
import { SelectMember } from '@/components/select-member/select-member';
import { Input } from '@/components/ui/input';
import { useApp } from '@/providers/app.provider';
import { PolicyBindingSubjectKind } from '@/resources/interfaces/policy-binding.interface';
import { PolicyBindingSubjectSchema } from '@/resources/schemas/policy-binding.schema';
import { getInputProps, getSelectProps, useForm, useInputControl } from '@conform-to/react';
import { useEffect } from 'react';

export const SubjectField = ({
  fields,
  defaultValue,
  exceptItems,
}: {
  fields: ReturnType<typeof useForm<PolicyBindingSubjectSchema>>[1];
  defaultValue?: PolicyBindingSubjectSchema;
  exceptItems?: string[];
}) => {
  const { orgId } = useApp();
  const kindControl = useInputControl(fields.kind);
  const nameControl = useInputControl(fields.name);
  const uidControl = useInputControl(fields.uid);
  useEffect(() => {
    if (defaultValue) {
      if (defaultValue.kind && !fields.kind.value) {
        kindControl.change(defaultValue?.kind);
      }
      if (defaultValue.name && !fields.name.value) {
        nameControl.change(defaultValue?.name);
      }
      if (defaultValue.uid && !fields.uid.value) {
        uidControl.change(defaultValue?.uid);
      }
    }
  }, [
    defaultValue,
    kindControl,
    nameControl,
    uidControl,
    fields.kind.value,
    fields.name.value,
    fields.uid.value,
  ]);

  return (
    <div className="relative flex w-full flex-col items-start gap-4">
      <div className="flex w-full gap-4">
        <Field isRequired label="Type" errors={fields.kind.errors} className="w-1/3">
          <SelectBox
            {...getSelectProps(fields.kind, { value: false })}
            name={fields.kind.name}
            id={fields.kind.id}
            key={fields.kind.id}
            disabled
            value={kindControl.value}
            onChange={(value) => {
              kindControl.change(value.value);
            }}
            options={Object.values(PolicyBindingSubjectKind).map((kind) => ({
              value: kind,
              label: kind,
            }))}
          />
        </Field>

        <Field isRequired label="User" errors={fields.name.errors} className="w-2/3">
          {fields.kind.value === PolicyBindingSubjectKind.User && (
            <SelectMember
              {...getSelectProps(fields.name, { value: false })}
              name={fields.name.name}
              id={fields.name.id}
              key={fields.name.id}
              orgId={orgId ?? ''}
              defaultValue={defaultValue?.name}
              onSelect={(value) => {
                nameControl.change(value.value);
                uidControl.change(value.uid);
              }}
              exceptItems={exceptItems ?? []}
            />
          )}
        </Field>

        <Field isRequired label="UID" errors={fields.uid.errors} className="hidden w-1/3">
          <Input
            {...getInputProps(fields.uid, { type: 'text' })}
            name={fields.uid.name}
            id={fields.uid.id}
            key={fields.uid.id}
            defaultValue={defaultValue?.uid}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = (e.target as HTMLInputElement).value;
              uidControl.change(value);
            }}
          />
        </Field>
      </div>
    </div>
  );
};
