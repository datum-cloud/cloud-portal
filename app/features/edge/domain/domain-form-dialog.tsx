import { AnalyticsAction, useAnalytics } from '@/modules/fathom';
import { type DomainSchema, domainSchema, useCreateDomain, type Domain } from '@/resources/domains';
import { toast } from '@datum-ui/components';
import { Form } from '@datum-ui/components/new-form';
import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';

export interface DomainFormDialogRef {
  show: (initialValues?: Partial<DomainSchema>) => void;
  hide: () => void;
}

interface DomainFormDialogProps {
  projectId: string;
  onSuccess?: (domain: Domain) => void;
  onError?: (error: Error) => void;
}

export const DomainFormDialog = forwardRef<DomainFormDialogRef, DomainFormDialogProps>(
  ({ projectId, onSuccess, onError }, ref) => {
    const [open, setOpen] = useState(false);
    const [defaultValues, setDefaultValues] = useState<Partial<DomainSchema>>();

    const createDomainMutation = useCreateDomain(projectId);
    const { trackAction } = useAnalytics();

    const show = useCallback((initialValues?: Partial<DomainSchema>) => {
      setDefaultValues(initialValues);
      setOpen(true);
    }, []);

    const hide = useCallback(() => {
      setOpen(false);
    }, []);

    useImperativeHandle(ref, () => ({ show, hide }), [show, hide]);

    const handleSubmit = async (formData: DomainSchema) => {
      try {
        const domain = await createDomainMutation.mutateAsync({ domainName: formData.domain });
        toast.success('Domain', {
          description: 'The domain has been added to your project',
        });
        trackAction(AnalyticsAction.AddDomain);
        setOpen(false);

        if (onSuccess && domain.name) {
          onSuccess?.(domain);
        }
      } catch (error) {
        toast.error('Domain', {
          description: (error as Error).message || 'Failed to add domain',
        });
        onError?.(error as Error);
      }
    };

    return (
      <Form.Dialog
        key={open ? 'open' : 'closed'}
        open={open}
        onOpenChange={setOpen}
        title="Add a Domain"
        description="To use a custom domain for your services, you must first verify ownership. This form creates a domain resource that provides the necessary DNS records for verification. Once verified, you can securely use your domain in HTTPProxies and Gateways."
        schema={domainSchema}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        submitText="Add domain"
        submitTextLoading="Adding..."
        className="w-full sm:max-w-2xl">
        <Form.Field
          name="domain"
          label="Domain"
          description="Enter the domain where your service is running"
          required
          className="px-5">
          <Form.Input placeholder="e.g. example.com" autoFocus />
        </Form.Field>
      </Form.Dialog>
    );
  }
);

DomainFormDialog.displayName = 'DomainFormDialog';
