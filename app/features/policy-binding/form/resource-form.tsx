import { Field } from '@/components/field/field';
import { SelectProject } from '@/components/select-project/select-project';
import { POLICY_RESOURCES } from '@/features/policy-binding/form/constants';
import { SelectResource } from '@/features/policy-binding/form/select-resource';
import { useApp } from '@/providers/app.provider';
import {
  NewPolicyBindingSchema,
  PolicyBindingResourceSchema,
} from '@/resources/schemas/policy-binding.schema';
import { getInputProps, getSelectProps, useForm, useInputControl } from '@conform-to/react';
import { Input } from '@datum-ui/components';
import { useEffect, useState } from 'react';

export const ResourceForm = ({
  isEdit,
  fields,
  defaultValue,
}: {
  isEdit?: boolean;
  fields: ReturnType<typeof useForm<NewPolicyBindingSchema>>[1];
  defaultValue?: PolicyBindingResourceSchema;
}) => {
  const { orgId, organization } = useApp();
  const fieldset = fields.resource.getFieldset();

  const [currentRef, setCurrentRef] = useState<{
    label: string;
    apiGroup: string;
    kind: string;
  }>();

  const refControl = useInputControl(fieldset.ref);
  const valueControl = useInputControl(fieldset.name);
  const namespaceControl = useInputControl(fieldset.namespace);
  const uidControl = useInputControl(fieldset.uid);

  useEffect(() => {
    if (defaultValue) {
      if (defaultValue.ref && !fieldset.ref.value) {
        const ref = defaultValue.ref.toLowerCase();

        refControl.change(ref);
        setCurrentRef(POLICY_RESOURCES[ref as keyof typeof POLICY_RESOURCES]);
      }

      if (defaultValue.name && fieldset.name.value === '') {
        valueControl.change(defaultValue.name);
      }

      if (defaultValue.namespace && fieldset.namespace.value === '') {
        namespaceControl.change(defaultValue.namespace);
      }

      if (defaultValue.uid && fieldset.uid.value === '') {
        uidControl.change(defaultValue.uid);
      }
    }
  }, [
    defaultValue,
    refControl,
    valueControl,
    namespaceControl,
    uidControl,
    fieldset.ref.value,
    fieldset.name.value,
    fieldset.namespace.value,
    fieldset.uid.value,
  ]);

  return (
    <div className="flex w-full gap-4">
      <Field isRequired label="Resource Name" errors={fieldset.ref.errors} className="w-1/2">
        <SelectResource
          {...getSelectProps(fieldset.ref)}
          disabled={isEdit}
          name={fieldset.ref.name}
          id={fieldset.ref.id}
          defaultValue={defaultValue?.ref}
          onValueChange={(value) => {
            refControl.change(value.value);
            setCurrentRef(POLICY_RESOURCES[value.value as keyof typeof POLICY_RESOURCES]);

            // Use current organization if the resource is an organization
            if (value.value === 'resourcemanager.miloapis.com-organization') {
              valueControl.change(organization?.name);
              namespaceControl.change(organization?.namespace);
              uidControl.change(organization?.uid);
            }
          }}
        />
      </Field>

      <Field
        isRequired
        label={currentRef?.kind ?? 'Project'}
        errors={fieldset.name.errors}
        className="w-1/2">
        {fieldset.ref.value === 'resourcemanager.miloapis.com-project' && (
          <SelectProject
            {...getSelectProps(fieldset.name)}
            disabled={isEdit}
            key={fieldset.name.id}
            name={fieldset.name.name}
            id={fieldset.name.id}
            orgId={orgId ?? ''}
            defaultValue={defaultValue?.name as string}
            onSelect={(value) => {
              valueControl.change(value.value);
              namespaceControl.change(value.namespace);
              uidControl.change(value.uid);
            }}
          />
        )}

        {fieldset.ref.value === 'resourcemanager.miloapis.com-organization' && (
          <Input
            {...getInputProps(fieldset.name, { type: 'text' })}
            readOnly
            name={fieldset.name.name}
            id={fieldset.name.id}
            value={organization?.name}
          />
        )}
      </Field>
    </div>
  );
};
