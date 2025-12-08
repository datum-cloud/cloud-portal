import { useDatumFetcher } from '@/hooks/useDatumFetcher';
import { useIsPending } from '@/hooks/useIsPending';
import {
  BulkImportResponse,
  ImportDomainDetail,
  ROUTE_PATH as DOMAINS_BULK_IMPORT_PATH,
} from '@/routes/api/domains/bulk-import';
import { toast } from '@datum-ui/components';
import { useRef } from 'react';
import { useAuthenticityToken } from 'remix-utils/csrf/react';

type SubmitSource = 'form' | 'file' | null;

type BulkImportFetcherData = {
  success: boolean;
  error?: string;
  data?: BulkImportResponse;
};

interface UseBulkDomainsImportProps {
  projectId: string;
  onSuccess?: () => void;
}

const getDetailsByAction = (
  details: ImportDomainDetail[] | undefined,
  action: ImportDomainDetail['action']
) => details?.filter((d) => d.action === action) ?? [];

const formatDomainList = (details: ImportDomainDetail[], withMessage = false) =>
  details
    .map((d) => (withMessage ? `${d.domain}: ${d.message || 'Failed'}` : d.domain))
    .join(withMessage ? '\n' : ', ');

const showResultToast = (
  summary: BulkImportResponse['summary'],
  details?: ImportDomainDetail[]
) => {
  const { created, skipped, failed } = summary;

  // All failed
  if (created === 0 && failed > 0) {
    const failedList = formatDomainList(getDetailsByAction(details, 'failed'), true);
    toast.error('Domains', { description: `Failed to add domains:\n${failedList}` });
    return;
  }

  // Partial success
  if (failed > 0) {
    toast.message('Domains', {
      description: `${created} domain(s) added, ${skipped} skipped, ${failed} failed`,
    });
    return;
  }

  // All skipped (0 created, 0 failed)
  if (created === 0) {
    const skippedList = formatDomainList(getDetailsByAction(details, 'skipped'));
    toast.message('Domains', {
      description: `${skipped} domain(s) skipped (already exist): ${skippedList}`,
    });
    return;
  }

  // All success
  toast.success('Domains', {
    description: `${created} domain(s) added successfully`,
  });
};

export function useBulkDomainsImport({ projectId, onSuccess }: UseBulkDomainsImportProps) {
  const csrf = useAuthenticityToken();
  const submitSourceRef = useRef<SubmitSource>(null);

  const fetcher = useDatumFetcher<BulkImportFetcherData>({
    key: 'domains-bulk-import',
    onSuccess: (response) => {
      submitSourceRef.current = null;
      const { summary, details } = response.data || {};

      if (!summary) {
        toast.success('Domains', { description: 'Domains added successfully' });
      } else {
        showResultToast(summary, details);
      }

      onSuccess?.();
    },
    onError: (error) => {
      submitSourceRef.current = null;
      toast.error('Domains', { description: error.error || 'Failed to add domains' });
    },
  });

  const isPending = useIsPending({ fetcherKey: 'domains-bulk-import' });

  const submitDomains = (domains: string[], source: SubmitSource = 'form') => {
    if (domains.length === 0) {
      toast.error('No valid domains to add');
      return;
    }

    submitSourceRef.current = source;
    fetcher.submit(
      JSON.stringify({
        projectId,
        domains,
        importOptions: { skipDuplicates: true },
        csrf,
      }),
      { method: 'POST', action: DOMAINS_BULK_IMPORT_PATH, encType: 'application/json' }
    );
  };

  return {
    submitDomains,
    isFormPending: isPending && submitSourceRef.current === 'form',
    isFilePending: isPending && submitSourceRef.current === 'file',
  };
}
