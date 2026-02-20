import { type HttpProxy, useUpdateHttpProxy } from '@/resources/http-proxies';
import { toast } from '@datum-ui/components';
import { Form } from '@datum-ui/components/new-form';
import { Switch } from '@shadcn/ui/switch';
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

    return (
      <Form.Dialog
        open={open}
        onOpenChange={setOpen}
        title="Edit Protection Configuration"
        description="Configure the Web Application Firewall protection mode and paranoia level."
        schema={wafConfigSchema}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        submitText="Save"
        submitTextLoading="Saving..."
        className="w-full focus:ring-0 focus:outline-none sm:max-w-2xl">
        <div className="divide-border space-y-0 divide-y *:px-5 *:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
          <Form.Field
            name="trafficProtectionMode"
            label="Protection Mode"
            tooltip="Built-in rules that detect common threats."
            description="CRS inspects traffic for threats like SQL injection, XSS, and malicious bots — no custom rules required."
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
            tooltip="Higher levels apply stricter security checks."
            description="Start with Level 1 for most applications. Higher levels provide stronger protection but may increase false positives."
            required>
            <Form.Select placeholder="Select paranoia level" className="w-1/2">
              <Form.SelectItem value="1">Level 1 — Relaxed (Recommended)</Form.SelectItem>
              <Form.SelectItem value="2">Level 2 — Balanced</Form.SelectItem>
            </Form.Select>
          </Form.Field>
        </div>
      </Form.Dialog>
    );
  }
);

ProxyWafDialog.displayName = 'ProxyWafDialog';
