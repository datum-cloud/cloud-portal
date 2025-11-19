import { GrafanaAccessCard } from '@/features/edge/proxy/grafana/grafana-access-card';
import { PrometheusConfigCard } from '@/features/edge/proxy/grafana/prometheus-config-card';
import {
  DeployFormValues,
  InstanceFormValues,
  PrometheusConfig,
  deploySchema,
  instanceSchema,
} from '@/features/edge/proxy/grafana/stepper.schema';
import { useIsPending } from '@/hooks/useIsPending';
import {
  ExportPolicyAuthenticationType,
  ExportPolicySinkType,
  ExportPolicySourceType,
} from '@/resources/interfaces/export-policy.interface';
import { SecretType } from '@/resources/interfaces/secret.interface';
import { NewExportPolicySchema } from '@/resources/schemas/export-policy.schema';
import { SecretNewSchema } from '@/resources/schemas/secret.schema';
import { ROUTE_PATH as TELEMETRY_GRAFANA_ACTION } from '@/routes/api/telemetry/grafana';
import { yamlToJson } from '@/utils/helpers/format.helper';
import { FormProvider, getFormProps, useForm } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4';
import { Button } from '@datum-ui/components';
import { defineStepper } from '@datum-ui/components';
import { useEffect } from 'react';
import { Form, useFetcher, useNavigate } from 'react-router';
import { useAuthenticityToken } from 'remix-utils/csrf/react';

const { Stepper, useStepper, utils } = defineStepper(
  {
    id: 'grafana',
    label: 'Grafana Access',
    schema: instanceSchema,
  },
  {
    id: 'prometheus',
    label: 'Prometheus Config',
    schema: deploySchema,
  }
);

export default function GrafanaStepperForm({
  projectId,
  onComplete,
}: {
  projectId: string;
  onComplete: () => void;
}) {
  const navigate = useNavigate();
  const stepper = useStepper();
  const csrf = useAuthenticityToken();
  const fetcher = useFetcher({ key: 'grafana-form' });
  const isPending = useIsPending({ fetcherKey: 'grafana-form' });

  const [form, fields] = useForm({
    id: 'grafana-stepper-form',
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
    constraint: getZodConstraint(stepper.current.schema),
    onValidate({ formData }) {
      const parsed = parseWithZod(formData, { schema: stepper.current.schema });
      if (parsed.status === 'success') {
        stepper.setMetadata(stepper.current.id, parsed.value ?? {});
      }
      return parsed;
    },
    onSubmit(event, { submission }) {
      event.preventDefault();
      event.stopPropagation();
      const latestData = submission?.status === 'success' ? submission.value : {};

      if (stepper.isLast) {
        // Collect all metadata from all steps
        const allMetadata = stepper.all.reduce(
          (acc, step) => ({ ...acc, ...(stepper.getMetadata(step.id) || {}) }),
          {}
        );

        const combinedData: any = {
          ...allMetadata,
          ...latestData,
        };

        const prometheusJson = JSON.parse(
          yamlToJson(combinedData.prometheusConfig)
        ) as PrometheusConfig;

        const firstRemoteWrite = prometheusJson.remote_write[0];
        const username = firstRemoteWrite.basic_auth?.username?.toString() ?? '';
        const password = firstRemoteWrite.basic_auth?.password ?? '';

        const secretPayload: SecretNewSchema = {
          name: combinedData.secretName,
          type: SecretType.BASIC_AUTH,
          variables: [
            { key: 'username', value: username },
            { key: 'password', value: password },
          ],
        };

        const exportPolicyPayload: NewExportPolicySchema = {
          metadata: {
            name: combinedData.exportPolicyName,
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

        // Submit the form using the Remix submit function
        // This will trigger the action defined in the route
        fetcher.submit(payload, {
          method: 'POST',
          action: TELEMETRY_GRAFANA_ACTION,
          encType: 'application/json',
        });
      } else {
        stepper.next();
      }
    },
  });

  const getStepState = (currentIndex: number, stepIndex: number) => {
    if (currentIndex === stepIndex) {
      return 'active';
    }
    if (currentIndex > stepIndex) {
      return 'completed';
    }
    return 'inactive';
  };

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      if (fetcher.data?.success) {
        form.reset();
        stepper.reset();
        onComplete();
      }
    }
  }, [fetcher.data, fetcher.state]);

  return (
    <Stepper.Provider variant="horizontal" labelOrientation="vertical">
      <FormProvider context={form.context}>
        <Form
          {...getFormProps(form)}
          id={form.id}
          method="POST"
          autoComplete="off"
          className="mt-6 space-y-6">
          <Stepper.Navigation>
            {stepper.all.map((step) => (
              <Stepper.Step
                key={step.id}
                of={step.id}
                variant={
                  getStepState(utils.getIndex(stepper.current.id), utils.getIndex(step.id)) ===
                  'inactive'
                    ? 'secondary'
                    : ('default' as any)
                }>
                <Stepper.Title className="text-sm">{step.label}</Stepper.Title>
              </Stepper.Step>
            ))}
          </Stepper.Navigation>
          {stepper.switch({
            grafana: () => (
              <GrafanaAccessCard
                defaultValue={stepper.getMetadata('grafana') as InstanceFormValues}
                fields={fields as ReturnType<typeof useForm<InstanceFormValues>>[1]}
              />
            ),
            prometheus: () => (
              <PrometheusConfigCard
                instanceUrl={(stepper.getMetadata('grafana') as InstanceFormValues)?.instanceUrl}
                defaultValue={stepper.getMetadata('prometheus') as DeployFormValues}
                fields={fields as ReturnType<typeof useForm<DeployFormValues>>[1]}
              />
            ),
          })}
          <Stepper.Controls>
            <Button
              type="quaternary"
              theme="borderless"
              disabled={isPending}
              onClick={() => {
                stepper.isFirst ? navigate(-1) : stepper.prev();
              }}>
              {stepper.isFirst ? 'Back to Proxy' : 'Previous'}
            </Button>
            <Button loading={isPending} disabled={isPending}>
              {stepper.isLast ? 'Submit' : 'Next'}
            </Button>
          </Stepper.Controls>
        </Form>
      </FormProvider>
    </Stepper.Provider>
  );
}
