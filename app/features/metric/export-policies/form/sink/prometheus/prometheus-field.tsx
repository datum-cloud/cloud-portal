import { AuthField } from './auth-field';
import { BatchField } from './batch-field';
import { RetryField } from './retry-field';
import { FieldLabel } from '@/components/field/field-label';
import { Form } from '@datum-cloud/datum-ui/form';
import { Separator } from '@datum-cloud/datum-ui/separator';

export const PrometheusField = ({
  baseName,
  projectId,
}: {
  baseName: string;
  projectId?: string;
}) => {
  return (
    <div className="flex w-full flex-col gap-2">
      <FieldLabel label="Prometheus Configuration" />
      <div className="flex w-full flex-col gap-4 rounded-md border p-4">
        <Form.Field name={`${baseName}.endpoint`} label="Endpoint URL" required className="w-full">
          <Form.Input type="text" placeholder="e.g. http://localhost:9090" />
        </Form.Field>

        <Separator />
        <BatchField baseName={baseName} />

        <Separator />
        <RetryField baseName={baseName} />

        <Separator />
        <AuthField baseName={baseName} projectId={projectId} />
      </div>
    </div>
  );
};
