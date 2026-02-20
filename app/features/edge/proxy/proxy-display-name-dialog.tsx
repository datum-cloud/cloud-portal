import { type HttpProxy, useUpdateHttpProxy } from '@/resources/http-proxies';
import { toast } from '@datum-ui/components';
import { Form } from '@datum-ui/components/new-form';
import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import { z } from 'zod';

const displayNameSchema = z.object({
  chosenName: z
    .string({ error: 'Display name is required' })
    .min(1, { message: 'Display name is required' })
    .max(50, { message: 'Display name must be less than 50 characters' }),
});

type DisplayNameSchema = z.infer<typeof displayNameSchema>;

export interface ProxyDisplayNameDialogRef {
  show: (proxy: HttpProxy) => void;
  hide: () => void;
}

interface ProxyDisplayNameDialogProps {
  projectId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const ProxyDisplayNameDialog = forwardRef<
  ProxyDisplayNameDialogRef,
  ProxyDisplayNameDialogProps
>(({ projectId, onSuccess, onError }, ref) => {
  const [open, setOpen] = useState(false);
  const [proxyName, setProxyName] = useState('');
  const [defaultValues, setDefaultValues] = useState<Partial<DisplayNameSchema>>();

  const updateMutation = useUpdateHttpProxy(projectId, proxyName);

  const show = useCallback((proxy: HttpProxy) => {
    setProxyName(proxy.name);
    setDefaultValues({
      chosenName: proxy.chosenName || '',
    });
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    setOpen(false);
  }, []);

  useImperativeHandle(ref, () => ({ show, hide }), [show, hide]);

  const handleSubmit = async (data: DisplayNameSchema) => {
    try {
      await updateMutation.mutateAsync({
        chosenName: data.chosenName,
      });
      toast.success('AI Edge', {
        description: 'Name has been updated successfully',
      });
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error('AI Edge', {
        description: (error as Error).message || 'Failed to update name',
      });
      onError?.(error as Error);
    }
  };

  return (
    <Form.Dialog
      open={open}
      onOpenChange={setOpen}
      title="Edit Name"
      description="Update the name shown for this AI Edge."
      schema={displayNameSchema}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      submitText="Save"
      submitTextLoading="Saving..."
      className="w-full focus:ring-0 focus:outline-none sm:max-w-lg">
      <div className="px-5">
        <Form.Field name="chosenName" label="Name" required>
          <Form.Input autoFocus placeholder="e.g. Customer API" />
        </Form.Field>
      </div>
    </Form.Dialog>
  );
});

ProxyDisplayNameDialog.displayName = 'ProxyDisplayNameDialog';
