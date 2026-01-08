import { useBulkCreateDomains } from '@/resources/domains';
import { toast } from '@datum-ui/components';
import { useRef } from 'react';

type SubmitSource = 'form' | 'file' | null;

interface UseBulkDomainsImportProps {
  projectId: string;
  onSuccess?: () => void;
}

export function useBulkDomainsImport({ projectId, onSuccess }: UseBulkDomainsImportProps) {
  const submitSourceRef = useRef<SubmitSource>(null);

  const bulkCreateMutation = useBulkCreateDomains(projectId, {
    onSuccess: (domains) => {
      submitSourceRef.current = null;
      toast.success('Domains', {
        description: `${domains.length} domain(s) added successfully`,
      });
      onSuccess?.();
    },
    onError: (error) => {
      submitSourceRef.current = null;
      toast.error('Domains', { description: error.message || 'Failed to add domains' });
    },
  });

  const submitDomains = (domains: string[], source: SubmitSource = 'form') => {
    if (domains.length === 0) {
      toast.error('No valid domains to add');
      return;
    }

    submitSourceRef.current = source;
    bulkCreateMutation.mutate(domains);
  };

  return {
    submitDomains,
    isFormPending: bulkCreateMutation.isPending && submitSourceRef.current === 'form',
    isFilePending: bulkCreateMutation.isPending && submitSourceRef.current === 'file',
  };
}
