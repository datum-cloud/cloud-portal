import { Field } from '@/components/field/field';
import { SelectBox } from '@/components/select-box/select-box';
import { SelectSecret } from '@/components/select-secret/select-secret';
import { SINK_AUTH_TYPES } from '@/features/metric/constants';
import { ExportPolicyAuthenticationType } from '@/resources/export-policies';
import { ExportPolicySinkAuthenticationSchema } from '@/resources/export-policies';
import { SecretType } from '@/resources/secrets';
import { getSelectProps, useForm, useInputControl } from '@conform-to/react';
import { Label, Switch } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { useEffect, useState } from 'react';

export const AuthField = ({
  fields,
  defaultValue,
  projectId,
}: {
  fields: ReturnType<typeof useForm<ExportPolicySinkAuthenticationSchema>>[1];
  defaultValue?: ExportPolicySinkAuthenticationSchema;
  projectId?: string;
}) => {
  const authTypeControl = useInputControl(fields.authType);
  const secretNameControl = useInputControl(fields.secretName);

  const [isAuthenticationEnabled, setIsAuthenticationEnabled] = useState<boolean>(false);

  useEffect(() => {
    if (defaultValue) {
      setIsAuthenticationEnabled(!!defaultValue.authType);

      if (defaultValue.authType && !fields.authType.value) {
        authTypeControl.change(defaultValue.authType);
      }

      if (defaultValue.secretName && !fields.secretName.value) {
        secretNameControl.change(defaultValue.secretName);
      }
    }
  }, [defaultValue]);

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="mb-2 flex items-center space-x-2">
        <Switch
          id="authentication"
          defaultChecked={isAuthenticationEnabled}
          checked={isAuthenticationEnabled}
          onCheckedChange={(value) => {
            setIsAuthenticationEnabled(value);

            if (value) {
              authTypeControl.change(
                defaultValue?.authType ?? ExportPolicyAuthenticationType.BASIC_AUTH
              );
              secretNameControl.change(defaultValue?.secretName ?? undefined);
            } else {
              authTypeControl.change(undefined);
              secretNameControl.change(undefined);
            }
          }}
        />
        <Label htmlFor="authentication">Enable Authentication</Label>
      </div>
      <div className={cn('flex gap-2', { hidden: !isAuthenticationEnabled })}>
        <Field
          isRequired={isAuthenticationEnabled}
          label="Authentication Type"
          errors={fields.authType.errors}
          className="w-1/3">
          <SelectBox
            {...getSelectProps(fields.authType, { value: false })}
            name={fields.authType.name}
            id={fields.authType.id}
            key={fields.authType.id}
            options={Object.values(ExportPolicyAuthenticationType).map((type) => ({
              value: type,
              label: SINK_AUTH_TYPES[type as keyof typeof SINK_AUTH_TYPES].label,
            }))}
            onChange={(value) => {
              authTypeControl.change(value?.value);
              secretNameControl.change(undefined);
            }}
            value={authTypeControl.value ?? undefined}
          />
        </Field>
        <Field
          isRequired={isAuthenticationEnabled}
          label="Secret"
          errors={fields.secretName.errors}
          className="w-1/2">
          <SelectSecret
            {...getSelectProps(fields.secretName, { value: false })}
            name={fields.secretName.name}
            id={fields.secretName.id}
            key={fields.secretName.id}
            defaultValue={secretNameControl.value}
            projectId={projectId}
            onValueChange={(value) => {
              secretNameControl.change(value?.value);
            }}
            filter={{ type: SecretType.BASIC_AUTH }}
          />
        </Field>
      </div>
    </div>
  );
};
