import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { type HttpProxy, useUpdateHttpProxy } from '@/resources/http-proxies';
import { Form } from '@datum-cloud/datum-ui/form';
import { Switch } from '@datum-cloud/datum-ui/switch';
import { toast } from '@datum-cloud/datum-ui/toast';
import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import { z } from 'zod';

const wafConfigSchema = z.object({
  trafficProtectionMode: z.enum(['Observe', 'Enforce']).default('Enforce'),
  paranoiaLevelBlocking: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    const num = typeof val === 'string' ? Number.parseInt(val, 10) : Number(val);
    return Number.isNaN(num) ? undefined : num;
  }, z.number().int().min(1).max(4).optional()),
});

type WafConfigSchema = z.infer<typeof wafConfigSchema>;

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
    const [hasActiveWaf, setHasActiveWaf] = useState(false);
    const { confirm } = useConfirmationDialog();

    const updateMutation = useUpdateHttpProxy(projectId, proxyName);

    const show = useCallback((proxy: HttpProxy) => {
      setProxyName(proxy.name);
      setDefaultValues({
        trafficProtectionMode:
          proxy.trafficProtectionMode === 'Disabled'
            ? 'Enforce'
            : (proxy.trafficProtectionMode ?? 'Enforce'),
        paranoiaLevelBlocking: proxy.paranoiaLevels?.blocking ?? 1,
      });
      setHasActiveWaf(
        proxy.trafficProtectionMode === 'Observe' || proxy.trafficProtectionMode === 'Enforce'
      );
      setOpen(true);
    }, []);

    const hide = useCallback(() => {
      setOpen(false);
    }, []);

    useImperativeHandle(ref, () => ({ show, hide }), [show, hide]);

    const handleSubmit = async (data: WafConfigSchema) => {
      try {
        await updateMutation.mutateAsync({
          trafficProtectionMode: data.trafficProtectionMode,
          paranoiaLevels: data.paranoiaLevelBlocking
            ? { blocking: data.paranoiaLevelBlocking }
            : undefined,
        });
        toast.success('AI Edge', {
          description: 'Protection configuration has been updated successfully',
        });
        setOpen(false);
        onSuccess?.();
      } catch (error) {
        toast.error('AI Edge', {
          description: (error as Error).message || 'Failed to update Protection configuration',
        });
        onError?.(error as Error);
      }
    };

    const handleRemove = useCallback(async () => {
      try {
        const confirmed = await confirm({
          title: 'Remove protection',
          description:
            'This will remove WAF protection from this AI Edge. Traffic will no longer be inspected for common web attacks.',
          submitText: 'Remove',
          cancelText: 'Cancel',
          variant: 'destructive',
          onSubmit: async () => {
            await updateMutation.mutateAsync({ removeTrafficProtection: true });
          },
        });
        if (confirmed) {
          toast.success('AI Edge', {
            description: 'Protection has been removed',
          });
          setOpen(false);
          onSuccess?.();
        }
      } catch (error) {
        toast.error('AI Edge', {
          description: (error as Error).message || 'Failed to remove protection',
        });
        onError?.(error as Error);
        setOpen(false);
      }
    }, [confirm, updateMutation, onSuccess, onError]);

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
        className="w-full focus:ring-0 focus:outline-none sm:max-w-2xl">
        <div className="divide-border space-y-0 divide-y *:px-5 *:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
          <Form.Field
            name="trafficProtectionMode"
            label="Enable Protection?"
            tooltip="With protection enabled, the WAF will block common threats like SQL injection, Cross-Site Scripting (XSS), and malicious bots."
            required>
            {({ control }) => {
              const isEnforce = control.value === 'Enforce';
              return (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={isEnforce}
                    onCheckedChange={(checked) => control.change(checked ? 'Enforce' : 'Observe')}
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

          {hasActiveWaf && (
            <div className="flex pt-2">
              <button
                type="button"
                className="text-destructive hover:text-destructive/80 text-sm underline"
                onClick={handleRemove}>
                Remove protection
              </button>
            </div>
          )}
        </div>
      </Form.Dialog>
    );
  }
);

ProxyWafDialog.displayName = 'ProxyWafDialog';
