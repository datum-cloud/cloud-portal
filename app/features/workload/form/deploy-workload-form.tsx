import { MultiSelect } from '@/components/multi-select/multi-select';
import {
  buildWorkloadResource,
  createWorkloadInputSchema,
  createWorkloadService,
  type CreateWorkloadInput,
} from '@/resources/workloads';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Form } from '@datum-cloud/datum-ui/form';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { useNavigate } from 'react-router';

// Static stopgap pending a compute instance-types API.
const INSTANCE_TYPE_OPTIONS = [
  'datumcloud/d1-standard-1',
  'datumcloud/d1-standard-2',
  'datumcloud/d1-standard-4',
];

const PROTOCOL_OPTIONS = ['TCP', 'UDP'];

// Curated list of regions (cities) pending a compute locations API.
const CITY_OPTIONS = [
  { label: 'Dallas (DFW)', value: 'DFW' },
  { label: 'Ashburn (IAD)', value: 'IAD' },
  { label: 'San Jose (SJC)', value: 'SJC' },
  { label: 'Los Angeles (LAX)', value: 'LAX' },
];

interface DeployWorkloadFormProps {
  projectId: string;
}

export function DeployWorkloadForm({ projectId }: DeployWorkloadFormProps) {
  const navigate = useNavigate();

  const handleSubmit = async (data: CreateWorkloadInput) => {
    try {
      const payload = buildWorkloadResource(data);
      await createWorkloadService().create(projectId, payload);
      toast.success('Workload deployed');
      navigate(
        getPathWithParams(paths.project.detail.compute.workloads.detail.root, {
          projectId,
          workloadName: data.name,
        })
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to deploy workload');
    }
  };

  return (
    <Form.Root
      name="deploy-workload"
      id="deploy-workload-form"
      schema={createWorkloadInputSchema}
      defaultValues={{
        name: '',
        image: '',
        instanceType: 'datumcloud/d1-standard-2',
        protocol: 'TCP',
        env: [],
        cities: [],
        minReplicas: 1,
      }}
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-6">
      <Card className="rounded-xl shadow-none">
        <CardHeader>
          <CardTitle className="text-base font-medium">General</CardTitle>
        </CardHeader>
        <CardContent>
          <Form.Field name="name" label="Workload name" required>
            <Form.Input placeholder="e.g. my-api" autoFocus />
          </Form.Field>
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-none">
        <CardHeader>
          <CardTitle className="text-base font-medium">Container image</CardTitle>
        </CardHeader>
        <CardContent>
          <Form.Field name="image" label="Container image" required>
            <Form.Input placeholder="e.g. ghcr.io/acme/api:1.4.2" />
          </Form.Field>
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-none">
        <CardHeader>
          <CardTitle className="text-base font-medium">Runtime &amp; resources</CardTitle>
        </CardHeader>
        <CardContent>
          <Form.Field name="instanceType" label="Instance type" required>
            <Form.Select placeholder="Select an instance type">
              {INSTANCE_TYPE_OPTIONS.map((option) => (
                <Form.SelectItem key={option} value={option}>
                  {option}
                </Form.SelectItem>
              ))}
            </Form.Select>
          </Form.Field>
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-none">
        <CardHeader>
          <CardTitle className="text-base font-medium">Networking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex w-full flex-col gap-4 sm:flex-row">
            <Form.Field name="port" label="Container port" className="sm:w-1/2">
              <Form.Input type="number" placeholder="e.g. 8080" min={1} max={65535} />
            </Form.Field>
            <Form.Field name="protocol" label="Protocol" className="sm:w-1/2">
              <Form.Select placeholder="Select a protocol">
                {PROTOCOL_OPTIONS.map((option) => (
                  <Form.SelectItem key={option} value={option}>
                    {option}
                  </Form.SelectItem>
                ))}
              </Form.Select>
            </Form.Field>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-none">
        <CardHeader>
          <CardTitle className="text-base font-medium">Environment variables</CardTitle>
        </CardHeader>
        <CardContent>
          <Form.FieldArray name="env">
            {({ fields, append, remove }) => (
              <div className="flex flex-col gap-3">
                {fields.map((field, index) => (
                  <div key={field.key} className="flex items-end gap-2">
                    <Form.Field name={`env.${index}.name`} label="Name" className="flex-1">
                      <Form.Input placeholder="e.g. LOG_LEVEL" />
                    </Form.Field>
                    <Form.Field name={`env.${index}.value`} label="Value" className="flex-1">
                      <Form.Input placeholder="e.g. info" />
                    </Form.Field>
                    <Button
                      htmlType="button"
                      type="quaternary"
                      theme="borderless"
                      size="small"
                      className="text-destructive"
                      aria-label={`Remove variable ${index + 1}`}
                      onClick={() => remove(index)}>
                      <Icon icon={Trash2Icon} className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  htmlType="button"
                  type="quaternary"
                  theme="outline"
                  size="small"
                  className="w-fit"
                  onClick={() => append({ name: '', value: '' })}>
                  <Icon icon={PlusIcon} className="size-4" />
                  Add variable
                </Button>
              </div>
            )}
          </Form.FieldArray>
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-none">
        <CardHeader>
          <CardTitle className="text-base font-medium">Placement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex w-full flex-col gap-4 sm:flex-row">
            <Form.Field name="cities" label="Regions" required className="sm:w-1/2">
              {({ control }) => (
                <MultiSelect
                  options={CITY_OPTIONS}
                  value={(control.value as string[]) ?? []}
                  onValueChange={(value) => control.change(value)}
                  placeholder="Select regions"
                />
              )}
            </Form.Field>
            <Form.Field
              name="minReplicas"
              label="Instances per region"
              required
              className="sm:w-1/2">
              <Form.Input type="number" min={1} />
            </Form.Field>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          htmlType="button"
          type="quaternary"
          theme="outline"
          size="small"
          onClick={() =>
            navigate(getPathWithParams(paths.project.detail.compute.workloads.root, { projectId }))
          }>
          Cancel
        </Button>
        <Form.Submit size="small" loadingText="Deploying">
          Deploy Workload
        </Form.Submit>
      </div>
    </Form.Root>
  );
}
