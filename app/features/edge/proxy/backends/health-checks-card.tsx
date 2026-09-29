import { formatDuration, GATEWAY_DURATION_PATTERN, resolvedPassive } from './backend-pool';
import { FieldLabel } from '@/components/card/field-label';
import { ToggleState } from '@/components/card/toggle-state';
import { showMutationErrorToast } from '@/modules/quota';
import { PermissionButton } from '@/modules/rbac';
import {
  PASSIVE_HEALTH_CHECK_DEFAULTS,
  type HttpProxy,
  useUpdateHttpProxy,
} from '@/resources/http-proxies';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardField,
  CardFieldValue,
  CardHeader,
  CardTitle,
} from '@datum-cloud/datum-ui/card';
import { Form } from '@datum-cloud/datum-ui/form';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Switch } from '@datum-cloud/datum-ui/switch';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { HeartPulseIcon, PencilIcon } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';

const EDIT_DENIED = "You don't have permission to edit this Application Load Balancer";

const optionalNumber = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
  z.number().optional()
);

// Settings unmount while the switch is off, so they're only checked when on.
const healthCheckSchema = z
  .object({
    enabled: z.preprocess((val) => val === true || val === 'on' || val === 'true', z.boolean()),
    consecutive5xxErrors: optionalNumber,
    baseEjectionTime: z.string().trim().optional(),
    maxEjectionPercent: optionalNumber,
  })
  .superRefine((data, ctx) => {
    if (!data.enabled) return;
    const errors5xx = data.consecutive5xxErrors;
    if (errors5xx === undefined || !Number.isInteger(errors5xx) || errors5xx < 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'Enter a whole number of at least 1',
        path: ['consecutive5xxErrors'],
      });
    }
    if (!data.baseEjectionTime || !GATEWAY_DURATION_PATTERN.test(data.baseEjectionTime)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Use a duration such as 30s, 2m or 1m30s',
        path: ['baseEjectionTime'],
      });
    }
    const percent = data.maxEjectionPercent;
    if (percent === undefined || !Number.isInteger(percent) || percent < 1 || percent > 100) {
      ctx.addIssue({
        code: 'custom',
        message: 'Enter a whole number from 1 to 100',
        path: ['maxEjectionPercent'],
      });
    }
  });

type HealthCheckValues = z.infer<typeof healthCheckSchema>;

/**
 * Passive health checking (`spec.healthCheck.passive`): Envoy outlier
 * detection ejects an endpoint after a streak of 5xx responses. Active probes
 * aren't in the API yet, so they aren't offered here.
 */
export function HttpProxyHealthChecksCard({
  proxy,
  projectId,
  lockReason,
}: {
  proxy: HttpProxy;
  projectId: string;
  lockReason?: string;
}) {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const updateMutation = useUpdateHttpProxy(projectId, proxy.name);
  const passive = resolvedPassive(proxy.healthCheck?.passive);

  const handleSubmit = async (data: HealthCheckValues) => {
    try {
      await updateMutation.mutateAsync({
        healthCheck: data.enabled
          ? {
              passive: {
                consecutive5xxErrors: data.consecutive5xxErrors,
                baseEjectionTime: data.baseEjectionTime,
                maxEjectionPercent: data.maxEjectionPercent,
              },
            }
          : null,
      });
      toast.success('Application Load Balancer', {
        description: data.enabled ? 'Health checks saved' : 'Health checks turned off',
      });
      setOpen(false);
    } catch (error) {
      showMutationErrorToast(error, {
        fallbackTitle: 'Application Load Balancer',
        fallbackDescription: (error as Error).message || 'Failed to save health checks',
        scope: 'project',
        projectId,
      });
    }
  };

  const defaults = passive ?? PASSIVE_HEALTH_CHECK_DEFAULTS;
  // Editing from "Off" is almost always to turn it on.
  const enabledByDefault = !!passive || !proxy.healthCheck;

  const openDialog = () => {
    setEnabled(enabledByDefault);
    setOpen(true);
  };

  return (
    <Card size="sm" sectioned className="w-full overflow-hidden" data-e2e="alb-health-checks-card">
      <CardHeader size="sm" bordered>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon icon={HeartPulseIcon} size={16} className="text-secondary" />
          Health checks
        </CardTitle>
        <CardDescription className="text-xs">
          Removes a failing endpoint within a backend. Traffic isn’t moved between backends; each
          keeps its weighted share.
        </CardDescription>
        <CardAction>
          <PermissionButton
            resource="httpproxies"
            verb="patch"
            group="networking.datumapis.com"
            namespace="default"
            scope="project"
            projectId={projectId}
            deniedReason={EDIT_DENIED}
            type="secondary"
            theme="outline"
            size="xs"
            disabled={!!lockReason}
            onClick={openDialog}>
            <Icon icon={PencilIcon} size={12} />
            Edit
          </PermissionButton>
        </CardAction>
      </CardHeader>
      {/* Label | value rows, as on the Configuration tab's settings cards. */}
      <CardContent padding="none">
        <CardField>
          <FieldLabel hint="The load balancer watches responses and takes an endpoint out of rotation after a run of 5xx errors. It works within each backend, so a backend whose endpoints are all failing keeps its share of traffic.">
            Outlier detection
          </FieldLabel>
          <CardFieldValue>
            <ToggleState on={!!passive} onLabel="On" offLabel="Off" />
          </CardFieldValue>
        </CardField>
        {passive ? (
          <>
            <CardField>
              <FieldLabel hint="How many 5xx responses in a row eject an endpoint">
                Eject after
              </FieldLabel>
              <CardFieldValue>
                <Text className="tabular-nums">
                  {passive.consecutive5xxErrors} consecutive 5xx{' '}
                  {passive.consecutive5xxErrors === 1 ? 'response' : 'responses'}
                </Text>
              </CardFieldValue>
            </CardField>
            <CardField>
              <FieldLabel hint="How long an endpoint stays out after its first ejection. It's then re-admitted, and each repeat ejection lasts longer.">
                Ejection time
              </FieldLabel>
              <CardFieldValue>
                <Text className="tabular-nums">
                  {formatDuration(passive.baseEjectionTime)}, longer on each repeat
                </Text>
              </CardFieldValue>
            </CardField>
            <CardField>
              <FieldLabel hint="The most endpoints of one backend that can be ejected at the same time, so a bad run can't empty it">
                Max ejected
              </FieldLabel>
              <CardFieldValue>
                <Text className="tabular-nums">
                  {passive.maxEjectionPercent}% of a backend’s endpoints
                </Text>
              </CardFieldValue>
            </CardField>
          </>
        ) : (
          <CardField>
            <FieldLabel>Effect</FieldLabel>
            <CardFieldValue>
              <Text textColor="muted" className="text-pretty">
                Endpoints keep receiving traffic even while they return errors
              </Text>
            </CardFieldValue>
          </CardField>
        )}
      </CardContent>

      <Form.Dialog
        open={open}
        onOpenChange={setOpen}
        title="Health checks"
        description="Eject a failing endpoint within a backend after a run of 5xx responses. It's re-admitted when the ejection period ends, and each repeat ejection lasts longer. Traffic isn't moved between backends."
        schema={healthCheckSchema}
        defaultValues={{
          enabled: enabledByDefault,
          consecutive5xxErrors: defaults.consecutive5xxErrors,
          baseEjectionTime: defaults.baseEjectionTime,
          maxEjectionPercent: defaults.maxEjectionPercent,
        }}
        onSubmit={handleSubmit}
        submitText="Save"
        submitTextLoading="Saving..."
        className="w-full focus:ring-0 focus:outline-none sm:max-w-lg">
        {/* Same divided, padded sections as the other ALB dialogs. */}
        <div className="divide-border space-y-0 divide-y *:px-5 *:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
          <Form.Field name="enabled" label="Outlier detection">
            {({ control }) => (
              <div className="flex items-center gap-2">
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => {
                    control.change(String(checked));
                    setEnabled(checked);
                  }}
                />
                <Text>{enabled ? 'On' : 'Off'}</Text>
              </div>
            )}
          </Form.Field>
          {enabled ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <Form.Field
                name="consecutive5xxErrors"
                label="Consecutive 5xx"
                tooltip="How many 5xx responses in a row eject an endpoint"
                required>
                <Form.Input type="number" min={1} />
              </Form.Field>
              <Form.Field
                name="baseEjectionTime"
                label="Base ejection"
                tooltip="How long the first ejection lasts. Later ejections multiply it."
                required>
                <Form.Input placeholder="30s" autoCapitalize="none" spellCheck={false} />
              </Form.Field>
              <Form.Field
                name="maxEjectionPercent"
                label="Max ejected %"
                tooltip="The most endpoints of one backend that may be ejected at once"
                required>
                <Form.Input type="number" min={1} max={100} />
              </Form.Field>
            </div>
          ) : null}
        </div>
      </Form.Dialog>
    </Card>
  );
}
