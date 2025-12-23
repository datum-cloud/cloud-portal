import type { GrafanaFormProps, GrafanaSubmitResponse } from './grafana.types';
import { CodeEditor } from '@/components/code-editor/code-editor';
import { InputName } from '@/components/input-name/input-name';
import { NoteCard } from '@/components/note-card/note-card';
import { TextCopyBox } from '@/components/text-copy/text-copy-box';
import { useDatumFetcher } from '@/hooks/useDatumFetcher';
import {
  ExportPolicyAuthenticationType,
  ExportPolicySinkType,
  ExportPolicySourceType,
  IExportPolicyControlResponse,
} from '@/resources/interfaces/export-policy.interface';
import { ISecretControlResponse, SecretType } from '@/resources/interfaces/secret.interface';
import type { NewExportPolicySchema } from '@/resources/schemas/export-policy.schema';
import type { SecretNewSchema } from '@/resources/schemas/secret.schema';
import { ROUTE_PATH as TELEMETRY_GRAFANA_ACTION } from '@/routes/api/telemetry/grafana';
import { isValidPrometheusConfig, isValidYaml, yamlToJson } from '@/utils/helpers/format.helper';
import { createNameSchema } from '@/utils/helpers/validation.helper';
import { LinkButton, toast } from '@datum-ui/components';
import { Dialog } from '@datum-ui/components/dialog';
import { Form } from '@datum-ui/components/new-form';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@shadcn/ui/collapsible';
import { ChevronDownIcon, ExternalLinkIcon } from 'lucide-react';
import { useAuthenticityToken } from 'remix-utils/csrf/react';
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

const schema = instanceSchema.extend(deploySchema.shape);

type GrafanaFormData = z.infer<typeof schema>;

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
  const csrf = useAuthenticityToken();

  const fetcher = useDatumFetcher<GrafanaSubmitResponse>({
    key: 'grafana-export-policy',
    onSuccess: (data) => {
      if (onSuccess) {
        onSuccess({
          exportPolicy: data.data?.exportPolicy as IExportPolicyControlResponse,
          secret: data.data?.secret as ISecretControlResponse,
        });
      } else {
        onClose();
      }
    },
    onError: (data) => {
      toast.error('Export policy', {
        description: data.error || 'Failed to create export policy',
      });
    },
  });

  const handleSubmit = (data: GrafanaFormData) => {
    const prometheusJson = JSON.parse(yamlToJson(data.prometheusConfig));

    const firstRemoteWrite = prometheusJson.remote_write[0];
    const username = firstRemoteWrite.basic_auth?.username?.toString() ?? '';
    const password = firstRemoteWrite.basic_auth?.password ?? '';

    const secretPayload: SecretNewSchema = {
      name: data.secretName,
      type: SecretType.BASIC_AUTH,
      variables: [
        { key: 'username', value: username },
        { key: 'password', value: password },
      ],
    };

    const exportPolicyPayload: NewExportPolicySchema = {
      metadata: {
        name: data.exportPolicyName,
      },
      sources: [
        {
          name: 'datum-metrics',
          type: ExportPolicySourceType.METRICS,
          metricQuery: '{}',
        },
      ],
      sinks: [
        {
          name: 'grafana-cloud-metrics',
          type: ExportPolicySinkType.PROMETHEUS,
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

    const payload = {
      projectId,
      exportPolicy: exportPolicyPayload,
      secret: secretPayload,
      csrf: csrf as string,
    };

    fetcher.submit(payload, {
      method: 'POST',
      action: TELEMETRY_GRAFANA_ACTION,
      encType: 'application/json',
    });
  };

  return (
    <Form.Stepper
      steps={steps}
      onComplete={(data) => handleSubmit(data as GrafanaFormData)}
      className="space-y-0"
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
          <>
            <Dialog.Header title="Export to Grafana Cloud" className="border-b" onClose={onClose} />
            <Dialog.Body className="p-0">
              {/* Step navigation */}
              <div className="border-b p-5">
                <Form.StepperNavigation variant="horizontal" className="mx-auto max-w-[265px]" />
              </div>

              {/* Step 1: Grafana Access */}
              <Form.Step id="grafana">
                <div className="divide-y">
                  <div className="flex items-center justify-between gap-4 p-5">
                    <div className="flex flex-col gap-1.5">
                      <p className="text-sm font-medium">Create a Grafana Cloud account</p>
                      <p className="text-xs opacity-60">
                        If you don&apos;t have an account, create one to get started.
                      </p>
                    </div>

                    <LinkButton
                      to="https://grafana.com"
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
                <div className="divide-y">
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
                        to={connectionUrl}
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
            <Dialog.Footer className="border-t">
              <Form.StepperControls
                prevLabel={(isFirst) => (isFirst ? 'Cancel' : 'Back')}
                nextLabel={(isLast) => (isLast ? 'Submit' : 'Continue')}
                loading={fetcher.isPending}
                disabled={fetcher.isPending}
                loadingText="Submitting..."
                onCancel={onClose}
              />
            </Dialog.Footer>
          </>
        );
      }}
    </Form.Stepper>
  );
}
