import { useDatumFetcher } from '@/hooks/useDatumFetcher';
import { useIsPending } from '@/hooks/useIsPending';
import { bulkDomainsSchema } from '@/resources/schemas/domain.schema';
import {
  BulkImportResponse,
  ImportDomainDetail,
  ROUTE_PATH as DOMAINS_BULK_IMPORT_PATH,
} from '@/routes/api/domains/bulk-import';
import { Button, toast } from '@datum-ui/components';
import { Form } from '@datum-ui/components/new-form';
import { Popover, PopoverContent, PopoverTrigger } from '@shadcn/ui/popover';
import { ArrowRightIcon, ListChecksIcon } from 'lucide-react';
import { useState } from 'react';
import { useAuthenticityToken } from 'remix-utils/csrf/react';

type BulkImportFetcherData = {
  success: boolean;
  error?: string;
  data?: BulkImportResponse;
};

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

export const BulkAddDomainsAction = ({ projectId }: { projectId: string }) => {
  const csrf = useAuthenticityToken();
  const fetcher = useDatumFetcher<BulkImportFetcherData>({
    key: 'domains-bulk-import',
    onSuccess: (response) => {
      setPopoverOpen(false);
      const { summary, details } = response.data || {};

      if (!summary) {
        toast.success('Domains', { description: 'Domains added successfully' });
        return;
      }

      showResultToast(summary, details);
    },
    onError: (error) => {
      toast.error('Domains', { description: error.error || 'Failed to add domains' });
    },
  });
  const isPending = useIsPending({ fetcherKey: 'domains-bulk-import' });

  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          htmlType="button"
          type="secondary"
          theme="outline"
          size="small"
          className="border-secondary/20 hover:border-secondary">
          <ListChecksIcon className="size-4" />
          Bulk add domains
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 space-y-4 rounded-xl p-7">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Bulk Add Domains</h2>
          <p className="text-xs">
            Paste a list of domains below, separated by new lines or commas.
          </p>
        </div>

        <Form.Root
          schema={bulkDomainsSchema}
          onSubmit={async (data) => {
            fetcher.submit(
              {
                projectId,
                domains: data.domains,
                importOptions: { skipDuplicates: true, dryRun: true },
                csrf,
              },
              { method: 'POST', action: DOMAINS_BULK_IMPORT_PATH, encType: 'application/json' }
            );
          }}
          className="space-y-4">
          <Form.Field name="domains" required>
            <Form.Textarea
              placeholder={'example.com, example.org\nexample.net'}
              className="h-48 resize-none"
            />
          </Form.Field>
          <Form.Submit
            icon={<ArrowRightIcon className="size-4" />}
            iconPosition="right"
            type="secondary"
            theme="solid"
            size="small"
            htmlType="submit"
            disabled={isPending}
            loading={isPending}
            loadingText="Adding...">
            Add domains
          </Form.Submit>
        </Form.Root>
      </PopoverContent>
    </Popover>
  );
};
