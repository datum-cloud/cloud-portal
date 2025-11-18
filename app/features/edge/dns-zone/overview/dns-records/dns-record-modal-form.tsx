import { DnsRecordForm } from '../../form/dns-record-form';
import { IFlattenedDnsRecord } from '@/resources/interfaces/dns.interface';
import { CreateDnsRecordSchema } from '@/resources/schemas/dns-record.schema';
import {
  DialogContent,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@shadcn/ui/dialog';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';

interface DnsRecordModalFormProps {
  projectId: string;
  dnsZoneId: string;
  dnsZoneName?: string;
  onSuccess?: () => void;
}

export interface DnsRecordModalFormRef {
  show: (mode: 'create' | 'edit', initialData?: IFlattenedDnsRecord) => Promise<boolean>;
}

export const DnsRecordModalForm = forwardRef<DnsRecordModalFormRef, DnsRecordModalFormProps>(
  ({ projectId, dnsZoneId, dnsZoneName, onSuccess }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const resolveRef = useRef<(value: boolean) => void>(null);
    const [mode, setMode] = useState<'create' | 'edit'>('create');
    const [initialData, setInitialData] = useState<IFlattenedDnsRecord | null>(null);

    useImperativeHandle(ref, () => ({
      show: (formMode: 'create' | 'edit', data?: IFlattenedDnsRecord) => {
        setMode(formMode);
        setInitialData(data || null);
        setIsOpen(true);
        return new Promise<boolean>((resolve) => {
          resolveRef.current = resolve;
        });
      },
    }));

    const handleOpenChange = (open: boolean) => {
      if (!open) {
        resolveRef.current?.(false);
      }
      setIsOpen(open);
    };

    // Transform flattened data to schema format if needed
    const defaultValue: CreateDnsRecordSchema | undefined = initialData
      ? ({
          recordType: initialData.type as any,
          name: initialData.name,
          ttl: initialData.ttl,

          // Simple types (single object)
          ...(initialData.type === 'A' && { a: { content: initialData.value || '' } }),
          ...(initialData.type === 'AAAA' && { aaaa: { content: initialData.value || '' } }),
          ...(initialData.type === 'CNAME' && { cname: { content: initialData.value || '' } }),
          ...(initialData.type === 'TXT' && { txt: { content: initialData.value || '' } }),
          ...(initialData.type === 'NS' && { ns: { content: initialData.value || '' } }),
          ...(initialData.type === 'PTR' && { ptr: { content: initialData.value || '' } }),

          // Complex types (use raw K8s data from record)
          ...(initialData.type === 'MX' && {
            mx: initialData.rawData?.mx || {
              exchange: '',
              preference: 10,
            },
          }),
          ...(initialData.type === 'SRV' && {
            srv: initialData.rawData?.srv || {
              target: '',
              port: 443,
              priority: 10,
              weight: 5,
            },
          }),
          ...(initialData.type === 'CAA' && {
            caa: initialData.rawData?.caa || {
              flag: 0,
              tag: 'issue',
              value: '',
            },
          }),
          ...(initialData.type === 'TLSA' && {
            tlsa: initialData.rawData?.tlsa || {
              usage: 3,
              selector: 1,
              matchingType: 1,
              certData: '',
            },
          }),
          ...(initialData.type === 'HTTPS' && {
            https: initialData.rawData?.https || {
              priority: 1,
              target: '',
              params: {},
            },
          }),
          ...(initialData.type === 'SVCB' && {
            svcb: initialData.rawData?.svcb || {
              priority: 1,
              target: '',
              params: {},
            },
          }),
          ...(initialData.type === 'SOA' &&
            (() => {
              try {
                // Parse JSON-encoded SOA object
                const soa = JSON.parse(initialData.value || '{}');
                return {
                  soa: {
                    mname: soa.mname || '',
                    rname: soa.rname || '',
                    refresh: soa.refresh || 3600,
                    retry: soa.retry || 600,
                    expire: soa.expire || 86400,
                    ttl: soa.ttl || 3600,
                  },
                };
              } catch {
                // Fallback to empty SOA if parsing fails
                return {
                  soa: {
                    mname: '',
                    rname: '',
                    refresh: 3600,
                    retry: 600,
                    expire: 86400,
                    ttl: 3600,
                  },
                };
              }
            })()),

          dnsZoneRef: dnsZoneName ? { name: dnsZoneName } : undefined,
        } as CreateDnsRecordSchema)
      : undefined;

    const handleSuccess = () => {
      resolveRef.current?.(true);
      onSuccess?.();
      setIsOpen(false);
    };

    const handleClose = () => {
      setIsOpen(false);
    };

    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-3xl sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{mode === 'create' ? 'Create DNS Record' : 'Edit DNS Record'}</DialogTitle>
            <DialogDescription>
              {mode === 'create'
                ? 'Add a new DNS record to your zone. Configure the record type, name, and values.'
                : 'Update the DNS record configuration. Changes will be applied immediately.'}
            </DialogDescription>
          </DialogHeader>
          <DnsRecordForm
            style="modal"
            mode={mode}
            defaultValue={defaultValue}
            projectId={projectId}
            dnsZoneId={dnsZoneId}
            dnsZoneName={dnsZoneName}
            recordSetName={initialData?.recordSetName}
            recordName={initialData?.name}
            oldValue={initialData?.value}
            oldTTL={initialData?.ttl ?? null}
            onClose={handleClose}
            onSuccess={handleSuccess}
          />
        </DialogContent>
      </Dialog>
    );
  }
);

DnsRecordModalForm.displayName = 'DnsRecordModalForm';
