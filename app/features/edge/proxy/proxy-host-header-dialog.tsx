import { HostHeaderField } from '@/features/edge/proxy/form/host-header-field';
import { type HttpProxy, useUpdateHttpProxy, validateHostHeader } from '@/resources/http-proxies';
import { Alert, AlertDescription } from '@datum-cloud/datum-ui/alert';
import { Button } from '@datum-cloud/datum-ui/button';
import { Dialog } from '@datum-cloud/datum-ui/dialog';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Info } from 'lucide-react';
import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import { z } from 'zod';

const hostHeaderSchema = z.object({
  hostHeader: z
    .string()
    .superRefine((val, ctx) => {
      if (!val) return;
      const error = validateHostHeader(val);
      if (error) ctx.addIssue({ code: 'custom', message: error });
    })
    .optional(),
});

type HostHeaderSchema = z.infer<typeof hostHeaderSchema>;

const TITLE = 'Edit Host Header';
const DESCRIPTION =
  'Override the Host header forwarded to the upstream backend. Leave blank to forward the incoming Host unchanged.';

export interface ProxyHostHeaderDialogRef {
  show: (proxy: HttpProxy) => void;
  hide: () => void;
}

interface ProxyHostHeaderDialogProps {
  projectId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const ProxyHostHeaderDialog = forwardRef<
  ProxyHostHeaderDialogRef,
  ProxyHostHeaderDialogProps
>(function ProxyHostHeaderDialog({ projectId, onSuccess, onError }, ref) {
  const [open, setOpen] = useState(false);
  const [proxyName, setProxyName] = useState('');
  const [defaultValues, setDefaultValues] = useState<Partial<HostHeaderSchema>>();
  const [isAdvanced, setIsAdvanced] = useState(false);

  const updateMutation = useUpdateHttpProxy(projectId, proxyName);

  const show = useCallback((proxy: HttpProxy) => {
    setProxyName(proxy.name);
    setDefaultValues({ hostHeader: proxy.hostHeader ?? '' });
    setIsAdvanced(proxy.complexity === 'advanced');
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    setOpen(false);
  }, []);

  useImperativeHandle(ref, () => ({ show, hide }), [show, hide]);

  const handleSubmit = async (data: HostHeaderSchema) => {
    try {
      await updateMutation.mutateAsync({ hostHeader: data.hostHeader ?? '' });
      toast.success('AI Edge', { description: 'Host header updated successfully' });
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error('AI Edge', {
        description: (error as Error).message || 'Failed to update Host header',
      });
      onError?.(error as Error);
    }
  };

  // Advanced configuration: read-only banner, no form, no Save button.
  if (isAdvanced) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <Dialog.Content className="sm:max-w-2xl">
          <Dialog.Header title={TITLE} description={DESCRIPTION} onClose={hide} />
          <Dialog.Body className="px-5 py-5">
            <Alert variant="info">
              <Info className="size-4" />
              <AlertDescription>
                <p>
                  This proxy has advanced configuration that the portal form doesn&apos;t support.
                  To make changes, use <code className="text-xs font-semibold">datumctl</code> or
                  edit the resource directly.
                </p>
              </AlertDescription>
            </Alert>
          </Dialog.Body>
          <Dialog.Footer>
            <Button type="secondary" size="small" onClick={hide}>
              Close
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    );
  }

  return (
    <Form.Dialog
      open={open}
      onOpenChange={setOpen}
      title={TITLE}
      description={DESCRIPTION}
      schema={hostHeaderSchema}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      submitText="Save"
      submitTextLoading="Saving..."
      className="w-full focus:ring-0 focus:outline-none sm:max-w-2xl">
      <div className="divide-border space-y-0 divide-y *:px-5 *:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
        <HostHeaderField />
      </div>
    </Form.Dialog>
  );
});

ProxyHostHeaderDialog.displayName = 'ProxyHostHeaderDialog';
