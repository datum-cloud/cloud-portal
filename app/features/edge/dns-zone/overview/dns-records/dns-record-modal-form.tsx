import { DnsRecordForm } from '../../form/dns-record-form';
import type { DnsRecordModalFormProps, DnsRecordModalFormRef } from './types';
import { IFlattenedDnsRecord } from '@/resources/interfaces/dns.interface';
import { CreateDnsRecordSchema } from '@/resources/schemas/dns-record.schema';
import { recordToFormDefaultValue } from '@/utils/helpers/dns-record.helper';
import {
  DialogContent,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@shadcn/ui/dialog';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';

export type { DnsRecordModalFormRef } from './types';

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
          ...recordToFormDefaultValue(initialData),
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
