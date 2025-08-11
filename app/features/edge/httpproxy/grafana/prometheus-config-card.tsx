import { CodeEditor } from '@/components/code-editor/code-editor';
import { Field } from '@/components/field/field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { GuideStepItem } from '@/features/edge/httpproxy/grafana/step-item';
import { DeployFormValues } from '@/features/edge/httpproxy/grafana/stepper.schema';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { getInputProps, useForm, useInputControl } from '@conform-to/react';
import { CopyIcon, ExternalLinkIcon, LightbulbIcon, TriangleAlertIcon } from 'lucide-react';
import { useEffect, useMemo } from 'react';

const prometheusConfig = `
remote_write:
  - url: https://prometheus-prod-56-prod-us-east-2.grafana.net/api/prom/push
    basic_auth:
      username: 123456
      password: glc_eyJyIjoiNzA2....
`;

export const PrometheusConfigCard = ({
  instanceUrl,
  defaultValue,
  fields,
}: {
  instanceUrl: string;
  defaultValue?: DeployFormValues;
  fields: ReturnType<typeof useForm<DeployFormValues>>[1];
}) => {
  const [isCopied, copy] = useCopyToClipboard();

  const prometheusConfigControl = useInputControl(fields.prometheusConfig);
  const secretNameControl = useInputControl(fields.secretName);
  const exportPolicyNameControl = useInputControl(fields.exportPolicyName);

  const steps = useMemo(() => {
    const connectionUrl = instanceUrl
      ? `${instanceUrl.replace(/\/$/, '')}/connections/add-new-connection/hmInstancePromId?remoteWrite=direct`
      : '';

    const items = [
      {
        id: 'view-connection-url',
        title: 'Open the Generated Connection URL',
        description:
          'Use the generated link to navigate to Grafana Cloud and create a new connection.',
        body: (
          <div className="flex flex-col gap-2">
            <div className="group border-input ring-offset-background bg-muted flex w-full overflow-hidden rounded-md border focus-within:outline-hidden">
              <div className="bg-background flex w-full items-center overflow-hidden px-3 py-2 text-sm text-ellipsis opacity-50">
                {connectionUrl}
              </div>
              <div className="flex items-center gap-2 py-2 pr-3">
                <Button
                  type="button"
                  size="sm"
                  className="h-7 w-fit gap-1 px-2 text-xs"
                  onClick={() => window.open(connectionUrl, '_blank')}>
                  <ExternalLinkIcon className="size-3!" />
                  Open
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 w-fit gap-1 px-2 text-xs"
                  onClick={() =>
                    copy(connectionUrl, {
                      withToast: true,
                      toastMessage: 'Connection URL copied to clipboard',
                    })
                  }>
                  <CopyIcon className="size-3!" />
                  {isCopied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>

            <Alert variant="info" className="border-dashed">
              <LightbulbIcon className="size-4" />
              <AlertDescription className="text-info-500">
                The link opens the connection flow for your instance. After you create or select an
                API token, Grafana will show the Prometheus remote_write YAML you need below.
              </AlertDescription>
            </Alert>
          </div>
        ),
      },
      {
        id: 'get-prometheus-config',
        title: 'Copy the Prometheus Configuration',
        description:
          'After creating the connection, copy the generated Prometheus configuration YAML.',
        body: (
          <div className="flex w-full flex-col gap-1">
            <p className="text-sm">The configuration looks similar to this:</p>
            <div className="group border-input ring-offset-background bg-muted flex w-full overflow-hidden rounded-md border focus-within:outline-hidden">
              <pre className="bg-background flex w-full items-center overflow-hidden px-3 py-2 text-sm text-ellipsis opacity-50">
                <code>{prometheusConfig.trim()}</code>
              </pre>
            </div>
            <Alert variant="warning" className="mt-1 border-dashed">
              <TriangleAlertIcon className="size-4" />
              <AlertDescription className="text-yellow-700">
                Your actual configuration will contain your specific endpoint URL and an API token
                for the password. Please store these credentials securely.
              </AlertDescription>
            </Alert>
          </div>
        ),
      },
      {
        id: 'prometheus-config',
        title: 'Configure Prometheus Remote Write',
        description:
          'Enter your Prometheus remote_write configuration to automatically generate the required Datum Secret and ExportPolicy resources',
        body: (
          <div className="flex w-full flex-col gap-6">
            <div className="w-full">
              <Field
                isRequired
                label="Prometheus Configuration YAML"
                errors={fields.prometheusConfig.errors}
                className="'w-full'">
                <CodeEditor
                  language="yaml"
                  value={fields.prometheusConfig.value ?? ''}
                  onChange={(newValue) => {
                    prometheusConfigControl.change(newValue);
                  }}
                  id={fields.prometheusConfig.id}
                  name={fields.prometheusConfig.name}
                  error={fields.prometheusConfig.errors?.[0]}
                  minHeight="150px"
                />
              </Field>
            </div>
            <div className="flex w-full gap-6">
              <Field
                isRequired
                label="Secret Name"
                description="This will store your Grafana credentials securely"
                errors={fields.secretName.errors}
                className="w-1/2">
                <Input
                  {...getInputProps(fields.secretName, { type: 'text' })}
                  placeholder="e.g. secret-name-3sd122"
                />
              </Field>
              <Field
                isRequired
                label="ExportPolicy Name"
                description="This defines how metrics are exported to Grafana"
                errors={fields.exportPolicyName.errors}
                className="w-1/2">
                <Input
                  {...getInputProps(fields.exportPolicyName, { type: 'text' })}
                  placeholder="e.g. exportpolicy-name-3sd122"
                />
              </Field>
            </div>
          </div>
        ),
      },
    ];

    return items;
  }, [instanceUrl, fields.prometheusConfig, fields.secretName, fields.exportPolicyName]);

  useEffect(() => {
    if (defaultValue) {
      prometheusConfigControl.change(defaultValue.prometheusConfig);
      secretNameControl.change(defaultValue.secretName);
      exportPolicyNameControl.change(defaultValue.exportPolicyName);
    } else {
      secretNameControl.change('grafana-prometheus-secret');
      exportPolicyNameControl.change('grafana-export-policy');
    }
  }, [defaultValue]);

  return (
    <Card className="gap-6">
      <CardHeader className="border-b pb-6">
        <CardTitle>Generate and apply Datum resources</CardTitle>
        <CardDescription>
          Paste your Prometheus configuration below to generate the Secret and ExportPolicy
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-8">
        {steps.map((step, index) => (
          <GuideStepItem key={step.id} stepNumber={index + 1} {...step} />
        ))}
      </CardContent>
    </Card>
  );
};
