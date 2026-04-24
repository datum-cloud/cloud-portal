import { AnalyticsAction, useAnalytics } from '@/modules/fathom';
import {
  type CreateDnsZoneInput,
  createDnsZoneSchema,
  useCreateDnsZone,
} from '@/resources/dns-zones';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import { useNavigate } from 'react-router';

export interface DnsZoneFormDialogRef {
  show: (domainName?: string) => void;
  hide: () => void;
}

interface DnsZoneFormDialogProps {
  projectId: string;
}

export const DnsZoneFormDialog = forwardRef<DnsZoneFormDialogRef, DnsZoneFormDialogProps>(
  ({ projectId }, ref) => {
    const [open, setOpen] = useState(false);
    const [defaultDomainName, setDefaultDomainName] = useState('');
    const navigate = useNavigate();
    const { trackAction } = useAnalytics();

    const createZone = useCreateDnsZone(projectId, {
      onSuccess: (dnsZone) => {
        trackAction(AnalyticsAction.AddDnsZone);
        setOpen(false);
        // Navigate to discovery page — it creates the discovery on mount
        navigate(
          getPathWithParams(paths.project.detail.dnsZones.detail.discovery, {
            projectId,
            dnsZoneId: dnsZone.name,
          })
        );
      },
      onError: (error) => {
        toast.error('DNS', {
          description: error.message || 'Failed to create DNS zone',
        });
      },
    });

    const show = useCallback((domainName?: string) => {
      setDefaultDomainName(domainName ?? '');
      setOpen(true);
    }, []);

    const hide = useCallback(() => {
      setOpen(false);
    }, []);

    useImperativeHandle(ref, () => ({ show, hide }), [show, hide]);

    const handleSubmit = useCallback(
      (data: CreateDnsZoneInput) => {
        createZone.mutate(data);
      },
      [createZone]
    );

    return (
      <Form.Dialog
        key={open ? `open-${defaultDomainName}` : 'closed'}
        open={open}
        onOpenChange={setOpen}
        title="Add a DNS Zone"
        description="Create a new zone to get started with Datum's advanced DNS features."
        schema={createDnsZoneSchema}
        defaultValues={defaultDomainName ? { domainName: defaultDomainName } : undefined}
        onSubmit={handleSubmit}
        loading={createZone.isPending}
        submitText="Create"
        submitTextLoading="Creating..."
        className="w-full sm:max-w-3xl">
        <div className="divide-border space-y-0 divide-y [&>*]:px-5 [&>*]:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
          <Form.Field
            name="domainName"
            label="Zone Name"
            description="Should be a valid domain or subdomain"
            required>
            <Form.Input
              autoFocus
              placeholder="e.g. example.com"
              data-e2e="create-dns-zone-name-input"
            />
          </Form.Field>

          <Form.Field name="description" label="Description">
            <Form.Input placeholder="e.g. Our main marketing site" />
          </Form.Field>
        </div>
      </Form.Dialog>
    );
  }
);

DnsZoneFormDialog.displayName = 'DnsZoneFormDialog';
