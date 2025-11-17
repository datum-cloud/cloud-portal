import { IFlattenedDnsRecord } from '@/resources/interfaces/dns.interface';
import { Button } from '@datum-ui/components';
import { Input } from '@shadcn/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shadcn/ui/select';
import { useState } from 'react';

interface DnsRecordInlineFormProps {
  mode: 'create' | 'edit';
  initialData: IFlattenedDnsRecord | null;
  onClose: () => void;
}

const DNS_RECORD_TYPES = [
  { label: 'A', value: 'A' },
  { label: 'AAAA', value: 'AAAA' },
  { label: 'CNAME', value: 'CNAME' },
  { label: 'MX', value: 'MX' },
  { label: 'TXT', value: 'TXT' },
  { label: 'NS', value: 'NS' },
  { label: 'SRV', value: 'SRV' },
];

/**
 * Inline form for creating/editing DNS records
 * This is a sample implementation showing how to integrate with DataTable inline form
 */
export function DnsRecordInlineForm({ mode, initialData, onClose }: DnsRecordInlineFormProps) {
  const [formData, setFormData] = useState({
    type: initialData?.type || 'A',
    name: initialData?.name || '',
    value: initialData?.value || '',
    ttl: initialData?.ttl?.toString() || '3600',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log(`${mode === 'create' ? 'Creating' : 'Updating'} DNS record:`, formData);

      // Show success message (you can replace with toast)
      alert(`DNS record ${mode === 'create' ? 'created' : 'updated'} successfully!`);

      // Close the form
      onClose();
    } catch (error) {
      console.error('Failed to save DNS record:', error);
      alert('Failed to save DNS record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3 p-4">
      {/* Type Select */}
      <div className="w-28">
        <Select
          value={formData.type}
          onValueChange={(value: string) => setFormData({ ...formData, type: value })}
          disabled={isSubmitting || mode === 'edit'}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {DNS_RECORD_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Name Input */}
      <div className="min-w-[150px] flex-1">
        <Input
          placeholder="Name (e.g., www)"
          value={formData.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData({ ...formData, name: e.target.value })
          }
          disabled={isSubmitting}
          required
          className="h-9"
        />
      </div>

      {/* Value Input */}
      <div className="min-w-[200px] flex-1">
        <Input
          placeholder={
            formData.type === 'MX'
              ? 'Value (e.g., 10|mail.example.com)'
              : 'Value (e.g., 192.168.1.1)'
          }
          value={formData.value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData({ ...formData, value: e.target.value })
          }
          disabled={isSubmitting}
          required
          className="h-9"
        />
      </div>

      {/* TTL Input */}
      <div className="w-24">
        <Input
          type="number"
          placeholder="TTL"
          value={formData.ttl}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData({ ...formData, ttl: e.target.value })
          }
          disabled={isSubmitting}
          min="60"
          max="86400"
          className="h-9"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button htmlType="submit" theme="solid" size="small" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
        </Button>
        <Button
          htmlType="button"
          theme="outline"
          size="small"
          onClick={onClose}
          disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
