import { InputName } from '@/components/input-name/input-name';
import { ProxyHostnamesField } from '@/features/edge/proxy/form/hostnames-field';
import { ProxyTlsField } from '@/features/edge/proxy/form/tls-field';
import {
  type HttpProxy,
  type HttpProxySchema,
  httpProxySchema,
  useCreateHttpProxy,
  useUpdateHttpProxy,
} from '@/resources/http-proxies';
import { toast } from '@datum-ui/components';
import { Form } from '@datum-ui/components/new-form';
import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';

export interface HttpProxyFormDialogRef {
  show: (initialValues?: HttpProxy) => void;
  hide: () => void;
}

interface HttpProxyFormDialogProps {
  projectId: string;
  onCreateSuccess?: (proxy: HttpProxy) => void;
  onEditSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const HttpProxyFormDialog = forwardRef<HttpProxyFormDialogRef, HttpProxyFormDialogProps>(
  ({ projectId, onCreateSuccess, onEditSuccess, onError }, ref) => {
    const [open, setOpen] = useState(false);
    const [defaultValues, setDefaultValues] = useState<Partial<HttpProxySchema>>();
    const [editProxyName, setEditProxyName] = useState('');

    const isEdit = !!editProxyName;

    const createMutation = useCreateHttpProxy(projectId);
    const updateMutation = useUpdateHttpProxy(projectId, editProxyName);

    const show = useCallback((initialValues?: HttpProxy) => {
      if (initialValues?.uid) {
        setEditProxyName(initialValues.name);
        setDefaultValues({
          name: initialValues.name,
          endpoint: initialValues.endpoint ?? '',
          hostnames: initialValues.hostnames,
          tlsHostname: initialValues.tlsHostname,
        });
      } else {
        setEditProxyName('');
        setDefaultValues(undefined);
      }
      setOpen(true);
    }, []);

    const hide = useCallback(() => {
      setOpen(false);
    }, []);

    useImperativeHandle(ref, () => ({ show, hide }), [show, hide]);

    const handleSubmit = async (data: HttpProxySchema) => {
      try {
        if (isEdit) {
          await updateMutation.mutateAsync({
            endpoint: data.endpoint,
            hostnames: data.hostnames,
            tlsHostname: data.tlsHostname,
          });
          toast.success('Proxy', {
            description: 'The proxy has been updated successfully',
          });
          setOpen(false);
          onEditSuccess?.();
        } else {
          const proxy = await createMutation.mutateAsync(data);
          toast.success('Proxy', {
            description: 'The proxy has been created successfully',
          });
          setOpen(false);
          onCreateSuccess?.(proxy);
        }
      } catch (error) {
        toast.error('Proxy', {
          description:
            (error as Error).message || `Failed to ${isEdit ? 'update' : 'create'} proxy`,
        });
        onError?.(error as Error);
      }
    };

    return (
      <Form.Dialog
        key={open ? `open-${editProxyName || 'create'}` : 'closed'}
        open={open}
        onOpenChange={setOpen}
        title={isEdit ? 'Edit Proxy' : 'Create a new Proxy'}
        description={`${isEdit ? 'Edit' : 'Create'} a Proxy to expose your service on a custom domain — with automatic HTTPS, smart routing, and zero hassle. Just tell us your backend endpoint, and we'll handle the rest.`}
        schema={httpProxySchema}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        submitText={isEdit ? 'Save' : 'Create'}
        submitTextLoading={isEdit ? 'Saving...' : 'Creating...'}
        className="w-full sm:max-w-2xl">
        <div className="divide-border space-y-0 divide-y [&>*]:px-5 [&>*]:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
          <Form.Field name="name">
            {({ field }) => (
              <InputName
                field={field}
                readOnly={isEdit}
                autoFocus={!isEdit}
                autoGenerate={false}
                description="This unique resource name will be used to identify your Proxy resource and cannot be changed."
              />
            )}
          </Form.Field>

          <Form.Field
            name="endpoint"
            label="Backend Endpoint"
            description="Enter the URL or hostname where your service is running"
            required>
            <Form.Input
              autoFocus={isEdit}
              placeholder="e.g. https://api.example.com or api.example.com"
            />
          </Form.Field>

          <ProxyHostnamesField projectId={projectId} />

          <ProxyTlsField />
        </div>
      </Form.Dialog>
    );
  }
);

HttpProxyFormDialog.displayName = 'HttpProxyFormDialog';
