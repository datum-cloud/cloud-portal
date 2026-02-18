import type { GrafanaFormProps } from './grafana.types';
import { CodeEditor } from '@/components/code-editor/code-editor';
import { InputName } from '@/components/input-name/input-name';
import { NoteCard } from '@/components/note-card/note-card';
import { TextCopyBox } from '@/components/text-copy/text-copy-box';
import {
  ExportPolicyAuthenticationType,
  ExportPolicySinkTypeEnum,
  ExportPolicySourceTypeEnum,
  useCreateExportPolicy,
  type CreateExportPolicyInput,
} from '@/resources/export-policies';
import { SecretType, useCreateSecret, type CreateSecretInput } from '@/resources/secrets';
import { isValidPrometheusConfig, isValidYaml, yamlToJson } from '@/utils/helpers/format.helper';
import { createNameSchema } from '@/utils/helpers/validation.helper';
import { LinkButton, toast } from '@datum-ui/components';
import { Dialog } from '@datum-ui/components/dialog';
import { Form } from '@datum-ui/components/new-form';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@shadcn/ui/collapsible';
import { ChevronDownIcon, ExternalLinkIcon } from 'lucide-react';
import { z } from 'zod';

// ============================================================================
// Schemas
// ============================================================================

const instanceSchema = z.object({
  instanceUrl: z.string({ error: 'Instance URL is required' }).url(),
});

const deploySchema = z.object({
  prometheusConfig: z
    .string({ error: 'YAML content is required' })
    .refine(isValidYaml, { message: 'Invalid YAML format' })
    .refine(
      (value) => {
        try {
          const json = yamlToJson(value);
          return isValidPrometheusConfig(json);
        } catch {
          return false;
        }
      },
      { message: 'Invalid Prometheus configuration format' }
    ),
  secretName: createNameSchema('Secret name').optional().default('grafana-prometheus-secret'),
  exportPolicyName: createNameSchema('Export policy name')
    .optional()
    .default('grafana-export-policy'),
});

type GrafanaFormData = z.infer<typeof instanceSchema> & z.infer<typeof deploySchema>;

// ============================================================================
// Steps Configuration
// ============================================================================

const steps = [
  {
    id: 'grafana',
    label: 'Grafana Access',
    schema: instanceSchema,
  },
  {
    id: 'prometheus',
    label: 'Prometheus Config',
    schema: deploySchema,
  },
];

// ============================================================================
// Component
// ============================================================================

export function GrafanaForm({ projectId, onClose, onSuccess }: GrafanaFormProps) {
  const createSecretMutation = useCreateSecret(projectId);
  const createExportPolicyMutation = useCreateExportPolicy(projectId);

  const isPending = createSecretMutation.isPending || createExportPolicyMutation.isPending;

  const handleSubmit = async (data: GrafanaFormData) => {
    const prometheusJson = JSON.parse(yamlToJson(data.prometheusConfig));

    const firstRemoteWrite = prometheusJson.remote_write[0];
    const username = firstRemoteWrite.basic_auth?.username?.toString() ?? '';
    const password = firstRemoteWrite.basic_auth?.password ?? '';

    const secretPayload: CreateSecretInput = {
      name: data.secretName,
      type: SecretType.BASIC_AUTH,
      variables: [
        { key: 'username', value: username },
        { key: 'password', value: password },
      ],
    };

    const exportPolicyPayload: CreateExportPolicyInput = {
      metadata: {
        name: data.exportPolicyName,
      },
      sources: [
        {
          name: 'datum-metrics',
          type: ExportPolicySourceTypeEnum.METRICS,
          metricQuery: '{}',
        },
      ],
      sinks: [
        {
          name: 'grafana-cloud-metrics',
          type: ExportPolicySinkTypeEnum.PROMETHEUS,
          sources: ['datum-metrics'],
          prometheusRemoteWrite: {
            endpoint: firstRemoteWrite.url,
            authentication: {
              authType: ExportPolicyAuthenticationType.BASIC_AUTH,
              secretName: secretPayload.name,
            },
            batch: {
              maxSize: 100,
              timeout: 5,
            },
            retry: {
              backoffDuration: 5,
              maxAttempts: 3,
            },
          },
        },
      ],
    };

    try {
      const secret = await createSecretMutation.mutateAsync(secretPayload);
      const exportPolicy = await createExportPolicyMutation.mutateAsync(exportPolicyPayload);

      if (onSuccess) {
        onSuccess({
          exportPolicy: exportPolicy as unknown as Parameters<
            NonNullable<typeof onSuccess>
          >[0]['exportPolicy'],
          secret: secret as unknown as Parameters<NonNullable<typeof onSuccess>>[0]['secret'],
        });
      } else {
        onClose();
      }
    } catch (error) {
      toast.error('Export policy', {
        description: error instanceof Error ? error.message : 'Failed to create export policy',
      });
    }
  };

  return (
    <Form.Stepper
      steps={steps}
      onComplete={(data) => handleSubmit(data as GrafanaFormData)}
      className="flex min-h-0 flex-1 flex-col space-y-0"
      defaultValues={{
        secretName: 'grafana-prometheus-secret',
        exportPolicyName: 'grafana-export-policy',
      }}>
      {({ getStepData }) => {
        const grafanaData = getStepData('grafana');
        const instanceUrl = grafanaData?.instanceUrl as string;
        const connectionUrl = instanceUrl
          ? `${instanceUrl.replace(/\/$/, '')}/connections/add-new-connection/hmInstancePromId?remoteWrite=direct`
          : '';

        return (
          <div className="flex min-h-0 flex-1 flex-col">
            <Dialog.Header
              title="Export to Grafana Cloud"
              className="border-stepper-line border-b"
              onClose={onClose}
            />
            <Dialog.Body className="p-0">
              {/* Step navigation */}
              <div className="border-stepper-line border-b p-5">
                <Form.StepperNavigation variant="horizontal" className="mx-auto max-w-[265px]" />
              </div>

              {/* Step 1: Grafana Access */}
              <Form.Step id="grafana">
                <div className="divide-stepper-line divide-y">
                  <div className="flex items-center justify-between gap-4 p-5">
                    <div className="flex flex-col gap-1.5">
                      <p className="text-sm font-medium">Create a Grafana Cloud account</p>
                      <p className="text-xs opacity-60">
                        If you don&apos;t have an account, create one to get started.
                      </p>
                    </div>

                    <LinkButton
                      href="https://grafana.com"
                      target="_blank"
                      rel="noreferrer"
                      type="secondary"
                      theme="outline"
                      size="small"
                      className="w-fit text-xs font-semibold"
                      icon={<ExternalLinkIcon className="size-4" />}
                      iconPosition="right">
                      Create account
                    </LinkButton>
                  </div>
                  <div className="flex flex-col gap-4 p-5">
                    <div className="flex flex-col gap-1.5">
                      <p className="text-sm font-medium">Enter Grafana instance URL</p>
                      <p className="text-xs opacity-60">
                        Navigate to the instance you want to integrate and paste the URL below.
                      </p>
                    </div>
                    <Form.Field name="instanceUrl" required>
                      <Form.Input placeholder="e.g. https://your-instance.grafana.net" />
                    </Form.Field>
                  </div>
                </div>
              </Form.Step>

              {/* Step 2: Prometheus Config */}
              <Form.Step id="prometheus">
                <div className="divide-stepper-line divide-y">
                  <div className="flex flex-col gap-4 p-5">
                    <div className="flex flex-col gap-1.5">
                      <p className="text-sm font-medium">Open the generated connection URL</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <TextCopyBox
                        value={connectionUrl}
                        className="border-input-border bg-input-background/50 h-9 rounded-lg"
                        contentClassName="text-sm text-foreground opacity-100"
                        buttonVariant="icon-only"
                      />
                      <LinkButton
                        href={connectionUrl}
                        target="_blank"
                        rel="noreferrer"
                        type="secondary"
                        theme="outline"
                        size="small"
                        className="w-fit text-xs font-semibold"
                        icon={<ExternalLinkIcon className="size-4" />}
                        iconPosition="right">
                        Open link
                      </LinkButton>
                    </div>
                    <NoteCard
                      size="sm"
                      description={
                        <div className="text-secondary text-xs">
                          The link opens the connection flow for your instance. After you create or
                          select an API token, Grafana will show the Prometheus remote_write YAML
                          you need to copy and paste below.
                        </div>
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-4 p-5">
                    <div className="flex flex-col gap-1.5">
                      <p className="text-sm font-medium">Configure Prometheus remote_write </p>
                      <p className="text-xs opacity-60">
                        Paste in your remote_write YAML to automatically generate the required Datum
                        Secret and ExportPolicy resources
                      </p>
                    </div>
                    <Form.Custom>
                      {({ form, fields }) => (
                        <CodeEditor
                          language="yaml"
                          value={fields.prometheusConfig.value as string}
                          onChange={(newValue) => {
                            form.update({ name: 'prometheusConfig', value: newValue });
                          }}
                          id={fields.prometheusConfig.id}
                          name={fields.prometheusConfig.name}
                          error={fields.prometheusConfig.errors?.[0]}
                          minHeight="128px"
                          placeholder="e.g.
  remote_write:
    - url: https://prometheus-prod-56-prod-us-east-2.grafana.net/api/prom/push
      basic_auth:
        username: 123456
        password: glc_eyJyIjoiNzA2...."
                        />
                      )}
                    </Form.Custom>
                  </div>
                  <div className="p-5">
                    <Collapsible>
                      <CollapsibleTrigger className="flex w-full items-center gap-2 text-sm font-medium [&[data-state=open]>svg]:rotate-180">
                        <ChevronDownIcon className="size-4 transition-transform duration-200" />
                        Advanced options
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-5 flex gap-5">
                        <Form.Custom>
                          {({ fields }) => (
                            <InputName
                              required
                              field={fields.secretName}
                              description={''}
                              label="Secret name"
                              autoGenerate
                              showTooltip={false}
                              labelClassName="text-xs font-medium"
                              className="flex-1"
                              disabledRandomSuffix={true}
                              baseName="grafana-prometheus-secret"
                            />
                          )}
                        </Form.Custom>

                        <Form.Custom>
                          {({ fields }) => (
                            <InputName
                              required
                              field={fields.exportPolicyName}
                              description={''}
                              label="Export policy name"
                              autoGenerate
                              showTooltip={false}
                              labelClassName="text-xs font-medium"
                              className="flex-1"
                              disabledRandomSuffix={true}
                              baseName="grafana-export-policy"
                            />
                          )}
                        </Form.Custom>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </div>
              </Form.Step>
            </Dialog.Body>
            <Dialog.Footer className="border-stepper-line border-t">
              <Form.StepperControls
                prevLabel={(isFirst) => (isFirst ? 'Cancel' : 'Back')}
                nextLabel={(isLast) => (isLast ? 'Submit' : 'Continue')}
                loading={isPending}
                disabled={isPending}
                loadingText="Submitting..."
                onCancel={onClose}
              />
            </Dialog.Footer>
          </div>
        );
      }}
    </Form.Stepper>
  );
}
