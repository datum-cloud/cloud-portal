import { createInvoiceService, invoiceKeys } from './invoice.service';
import type { Invoice } from '@/features/billing/types';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

/** Query the invoices in one org's namespace. */
export function useInvoices(
  orgId: string | undefined,
  options?: Omit<UseQueryOptions<Invoice[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: invoiceKeys.list(orgId ?? ''),
    queryFn: () => createInvoiceService().list(orgId!),
    enabled: !!orgId,
    ...options,
  });
}
