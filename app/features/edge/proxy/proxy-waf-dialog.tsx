import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { showMutationErrorToast } from '@/modules/quota';
import {
  type HttpProxy,
  OWASP_CRS_CATEGORIES,
  disabledCategoryIds,
  mergeCatalogExclusions,
  useUpdateHttpProxy,
} from '@/resources/http-proxies';
import { Form } from '@datum-cloud/datum-ui/form';
import { Switch } from '@datum-cloud/datum-ui/switch';
import { toast } from '@datum-cloud/datum-ui/toast';
import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import { z } from 'zod';

const wafConfigSchema = z.object({
  enabled: z.preprocess((val) => {
    if (typeof val === 'boolean') return val;
    return val === 'true' || val === 'on';
  }, z.boolean().default(false)),
  trafficProtectionMode: z.enum(['Observe', 'Enforce']).default('Enforce'),
  paranoiaLevelBlocking: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    const num = typeof val === 'string' ? Number.parseInt(val, 10) : Number(val);
    return Number.isNaN(num) ? undefined : num;
  }, z.number().int().min(1).max(4).optional()),
});

type WafConfigSchema = z.infer<typeof wafConfigSchema>;

export function getWafDialogDefaults(
  proxy: Pick<HttpProxy, 'trafficProtectionMode' | 'paranoiaLevels'>
): WafConfigSchema {
  const mode = proxy.trafficProtectionMode;
  const enabled = mode === 'Observe' || mode === 'Enforce';
  return {
    enabled,
    trafficProtectionMode: enabled ? mode : 'Enforce',
    paranoiaLevelBlocking: proxy.paranoiaLevels?.blocking ?? 1,
  };
}

export interface ProxyWafDialogRef {
  show: (proxy: HttpProxy) => void;
  hide: () => void;
}

interface ProxyWafDialogProps {
  projectId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const ProxyWafDialog = forwardRef<ProxyWafDialogRef, ProxyWafDialogProps>(
  ({ projectId, onSuccess, onError }, ref) => {
    const [open, setOpen] = useState(false);
    const [proxyName, setProxyName] = useState('');
    const [defaultValues, setDefaultValues] = useState<Partial<WafConfigSchema>>();
    const [enabled, setEnabled] = useState(false);
    const [hasActiveWaf, setHasActiveWaf] = useState(false);
    const [existingExclusions, setExistingExclusions] = useState<HttpProxy['ruleExclusions']>();
    const [disabledIds, setDisabledIds] = useState<string[]>([]);
    const { confirm } = useConfirmationDialog();

    const updateMutation = useUpdateHttpProxy(projectId, proxyName);

    const show = useCallback((proxy: HttpProxy) => {
      const defaults = getWafDialogDefaults(proxy);
      setProxyName(proxy.name);
      setEnabled(defaults.enabled);
      setDefaultValues(defaults);
      setHasActiveWaf(defaults.enabled);
      setExistingExclusions(proxy.ruleExclusions);
      setDisabledIds(disabledCategoryIds(proxy.ruleExclusions));
      setOpen(true);
    }, []);

    const hide = useCallback(() => {
      setOpen(false);
    }, []);

    useImperativeHandle(ref, () => ({ show, hide }), [show, hide]);

    const removeProtection = useCallback(async () => {
      const confirmed = await confirm({
        title: 'Remove protection',
        description:
          'This will remove WAF protection from this Application Load Balancer. Traffic will no longer be inspected for common web attacks.',
        submitText: 'Remove',
        cancelText: 'Cancel',
        variant: 'destructive',
        onSubmit: async () => {
          await updateMutation.mutateAsync({ removeTrafficProtection: true });
        },
      });
      if (confirmed) {
        toast.success('Application Load Balancer', {
          description: 'Protection has been removed',
        });
        setOpen(false);
        onSuccess?.();
      }
      return confirmed;
    }, [confirm, updateMutation, onSuccess]);

    const handleSubmit = async (data: WafConfigSchema) => {
      try {
        if (!data.enabled) {
          if (!hasActiveWaf) {
            setOpen(false);
            return;
          }
          await removeProtection();
          return;
        }

        const ruleExclusions = mergeCatalogExclusions(existingExclusions, disabledIds) ?? null;

        await updateMutation.mutateAsync({
          trafficProtectionMode: data.trafficProtectionMode,
          // CRS requires detection >= blocking; keep them locked together.
          paranoiaLevels: data.paranoiaLevelBlocking
            ? { blocking: data.paranoiaLevelBlocking, detection: data.paranoiaLevelBlocking }
            : undefined,
          ruleExclusions,
        });
        toast.success('Application Load Balancer', {
          description: 'Protection configuration has been updated successfully',
        });
        setOpen(false);
        onSuccess?.();
      } catch (error) {
        showMutationErrorToast(error, {
          fallbackTitle: 'Application Load Balancer',
          fallbackDescription:
            (error as Error).message || 'Failed to update Protection configuration',
          scope: 'project',
          projectId,
        });
        onError?.(error as Error);
      }
    };

    return (
      <Form.Dialog
        open={open}
        onOpenChange={setOpen}
        title="Edit Protection"
        description="Protection is provided by the Coraza Web Application Firewall (WAF). It uses the OWASP® CRS (Core Rule Set) to protect web applications from a wide range of attacks, including the OWASP Top Ten, with a minimum of false alerts."
        schema={wafConfigSchema}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        submitText="Save"
        submitTextLoading="Saving..."
        className="flex max-h-[80vh] min-h-0 w-full flex-col overflow-hidden focus:ring-0 focus:outline-none sm:max-w-2xl"
        formClassName="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="divide-border space-y-0 divide-y *:px-5 *:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
          <Form.Field
            name="enabled"
            label="Enable Protection?"
            tooltip="With protection enabled, the WAF will block common threats like SQL injection, Cross-Site Scripting (XSS), and malicious bots."
            required>
            {({ control }) => (
              <div className="flex items-center gap-2">
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => {
                    control.change(String(checked));
                    setEnabled(checked);
                  }}
                />
                <span className="text-sm">{enabled ? 'Enabled' : 'Disabled'}</span>
              </div>
            )}
          </Form.Field>

          {enabled && (
            <>
              <Form.Field
                name="trafficProtectionMode"
                label="Blocking mode"
                tooltip="Enforce blocks matching requests. Observe logs matches without blocking."
                required>
                {({ control }) => {
                  const isEnforce = control.value === 'Enforce';
                  return (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={isEnforce}
                        onCheckedChange={(checked) =>
                          control.change(checked ? 'Enforce' : 'Observe')
                        }
                      />
                      <span className="text-sm">
                        {isEnforce ? 'Enforce — blocking enabled' : 'Observe — detect only'}
                      </span>
                    </div>
                  );
                }}
              </Form.Field>

              <Form.Field
                name="paranoiaLevelBlocking"
                label="Paranoia Level"
                tooltip="Higher levels provide stronger protection but may result in false positives."
                required>
                <Form.Select placeholder="Select paranoia level" className="w-full sm:w-1/2">
                  <Form.SelectItem value="1">Level 1 — Relaxed (Recommended)</Form.SelectItem>
                  <Form.SelectItem value="2">Level 2 — Balanced</Form.SelectItem>
                </Form.Select>
              </Form.Field>

              <div>
                <div className="mb-3 text-sm font-medium">Core rule sets</div>
                <p className="text-muted-foreground mb-3 text-xs">
                  Turn off a category to exclude those OWASP CRS rules. Remaining categories stay
                  active.
                </p>
                <div className="space-y-3">
                  {OWASP_CRS_CATEGORIES.map((category) => {
                    const checked = !disabledIds.includes(category.id);
                    return (
                      <div key={category.id} className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{category.label}</div>
                          <p className="text-muted-foreground text-xs">{category.description}</p>
                        </div>
                        <Switch
                          checked={checked}
                          aria-label={category.label}
                          onCheckedChange={(nextChecked) => {
                            setDisabledIds((current) => {
                              const next = new Set(current);
                              if (nextChecked) next.delete(category.id);
                              else next.add(category.id);
                              return [...next];
                            });
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </Form.Dialog>
    );
  }
);

ProxyWafDialog.displayName = 'ProxyWafDialog';
