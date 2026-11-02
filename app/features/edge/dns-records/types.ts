/**
 * Shared type definitions for DNS Records components
 */
import { IFlattenedDnsRecord } from '@/resources/dns-records';

// =============================================================================
// Form Component Types
// =============================================================================

/**
 * Props for inline DNS record form (used in DataTable)
 */
export interface DnsRecordInlineFormProps {
  mode: 'create' | 'edit';
  initialData: IFlattenedDnsRecord | null;
  projectId: string;
  dnsZoneId: string;
  dnsZoneName?: string;
  /** Zone domain (e.g. example.com) for name-field guidance */
  zoneDomain?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Props for modal DNS record form
 */
export interface DnsRecordModalFormProps {
  projectId: string;
  dnsZoneId: string;
  dnsZoneName?: string;
  /** Zone domain (e.g. example.com) for name-field guidance */
  zoneDomain?: string;
  onSuccess?: () => void;
}

/**
 * Ref interface for modal form (imperative handle)
 * Allows parent to programmatically show the modal
 */
export interface DnsRecordModalFormRef {
  show: (mode: 'create' | 'edit', initialData?: IFlattenedDnsRecord) => Promise<boolean>;
}
