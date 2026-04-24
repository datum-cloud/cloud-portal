import { AnalyticsAction, useAnalytics } from '@/modules/fathom';
import { type DomainSchema, domainSchema, useCreateDomain, type Domain } from '@/resources/domains';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
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
        open={open}
        onOpenChange={setOpen}
        title="Add a Domain"
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
          <Form.Input
            placeholder="e.g. example.com"
            autoFocus
            data-e2e="create-domain-name-input"
          />
        </Form.Field>
      </Form.Dialog>
    );
  }
);

DomainFormDialog.displayName = 'DomainFormDialog';
