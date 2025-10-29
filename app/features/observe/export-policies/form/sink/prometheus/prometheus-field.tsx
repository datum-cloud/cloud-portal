import { AuthField } from './auth-field';
import { BatchField } from './batch-field';
import { RetryField } from './retry-field';
import { Field } from '@/components/field/field';
import { FieldLabel } from '@/components/field/field-label';
import {
  ExportPolicySinkAuthenticationSchema,
  ExportPolicySinkPrometheusFieldSchema,
} from '@/resources/schemas/export-policy.schema';
import { getInputProps, useForm, useInputControl } from '@conform-to/react';
import { Input } from '@shadcn/ui/input';
import { Separator } from '@shadcn/ui/separator';
import { useEffect } from 'react';

export const PrometheusField = ({
  fields,
  defaultValue,
  projectId,
}: {
  fields: ReturnType<typeof useForm<ExportPolicySinkPrometheusFieldSchema>>[1];
  defaultValue?: ExportPolicySinkPrometheusFieldSchema;
  projectId?: string;
}) => {
  const endpointUrlControl = useInputControl(fields.endpoint);

  useEffect(() => {
    if (defaultValue) {
      if (defaultValue.endpoint && !fields.endpoint.value) {
        endpointUrlControl.change(defaultValue.endpoint);
      }
    }
  }, [defaultValue, endpointUrlControl, fields.endpoint.value]);

  return (
    <div className="flex w-full flex-col gap-2">
      <FieldLabel label="Prometheus Configuration" />
      <div className="flex w-full flex-col gap-4 rounded-md border p-4">
        <Field isRequired label="Endpoint URL" errors={fields.endpoint.errors} className="w-full">
          <Input
            {...getInputProps(fields.endpoint, { type: 'text' })}
            key={fields.endpoint.id}
            placeholder="e.g. http://localhost:9090"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = (e.target as HTMLInputElement).value;
              endpointUrlControl.change(value);
            }}
          />
        </Field>

        <Separator />

        {/* Batch Section */}
        <BatchField
          fields={
            fields.batch.getFieldset() as unknown as ReturnType<
              typeof useForm<ExportPolicySinkPrometheusFieldSchema['batch']>
            >[1]
          }
          defaultValue={defaultValue?.batch as ExportPolicySinkPrometheusFieldSchema['batch']}
        />

        <Separator />
        {/* Retry Section */}
        <RetryField
          fields={
            fields.retry.getFieldset() as unknown as ReturnType<
              typeof useForm<ExportPolicySinkPrometheusFieldSchema['retry']>
            >[1]
          }
          defaultValue={defaultValue?.retry as ExportPolicySinkPrometheusFieldSchema['retry']}
        />

        {/* Authentication Section */}
        <Separator />
        <AuthField
          projectId={projectId}
          fields={
            fields.authentication.getFieldset() as unknown as ReturnType<
              typeof useForm<ExportPolicySinkAuthenticationSchema>
            >[1]
          }
          defaultValue={defaultValue?.authentication as ExportPolicySinkAuthenticationSchema}
        />
      </div>
    </div>
  );
};
