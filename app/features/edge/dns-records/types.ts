/**
 * Shared type definitions for DNS Records components
 */
import { DataTableProps } from '@/modules/datum-ui/components/data-table';
import { IFlattenedDnsRecord } from '@/resources/dns-records';
import { EmptyContentProps } from '@datum-ui/components/empty-content';

// =============================================================================
// Table Component Types
// =============================================================================

/**
 * Base props shared by both compact and full table modes
 */
export interface DnsRecordTableBaseProps {
  data: IFlattenedDnsRecord[];
  projectId: string;
  className?: string;
  tableContainerClassName?: string;
  emptyContent?: EmptyContentProps;
  showStatus?: boolean;
  enableMultiSelect?: boolean;
  getRowId?: (row: IFlattenedDnsRecord) => string;
  onSelectionChange?: (selectedIds: string[], selectedRows: IFlattenedDnsRecord[]) => void;
}

/**
 * Compact mode props
 * Simple table without actions, pagination, or toolbar (for overview pages)
 */
export interface DnsRecordTableCompactProps extends DnsRecordTableBaseProps {
  mode: 'compact';
}

/**
 * Full mode props
 * Inherits ALL DataTable props for complete functionality (for standalone pages)
 */
export interface DnsRecordTableFullProps
  extends
    DnsRecordTableBaseProps,
    Omit<
      DataTableProps<IFlattenedDnsRecord, any>,
      'data' | 'columns' | 'className' | 'emptyContent' | 'mode'
    > {
  mode: 'full';
}

/**
 * Discriminated union: mode determines available props
 */
export type DnsRecordTableProps = DnsRecordTableCompactProps | DnsRecordTableFullProps;

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
