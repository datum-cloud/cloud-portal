/**
 * Shared type definitions for DNS Records components
 */
import { IFlattenedDnsRecord } from '@/resources/dns-records';

// =============================================================================
// Card Component Types
// =============================================================================

/**
 * Props for DNS record card wrapper component
 * Used in overview pages to display records in a card with optional row limit
 */
export interface DnsRecordCardProps {
  records: IFlattenedDnsRecord[];
  projectId: string;
  maxRows?: number;
  title?: string;
  actions?: React.ReactNode;
}

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
  onSuccess?: () => void;
}

/**
 * Ref interface for modal form (imperative handle)
 * Allows parent to programmatically show the modal
 */
export interface DnsRecordModalFormRef {
  show: (mode: 'create' | 'edit', initialData?: IFlattenedDnsRecord) => Promise<boolean>;
}
