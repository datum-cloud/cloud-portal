import { useBulkDomainsImport } from './use-bulk-domains-import';
import { bulkDomainsSchema } from '@/resources/domains';
import { readFileAsText } from '@/utils/common';
import { parseDomainsFromFile } from '@/utils/helpers/parse.helper';
import { Button, toast } from '@datum-ui/components';
import { FileInputButton } from '@datum-ui/components/file-input-button/file-input-button';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { Form } from '@datum-ui/components/new-form';
import { Popover, PopoverContent, PopoverTrigger } from '@shadcn/ui/popover';
import { ArrowRightIcon, ListChecksIcon } from 'lucide-react';
import { useState } from 'react';

export const BulkAddDomainsAction = ({ projectId }: { projectId: string }) => {
  const [popoverOpen, setPopoverOpen] = useState(false);

  const { submitDomains, isFormPending, isFilePending } = useBulkDomainsImport({
    projectId,
    onSuccess: () => setPopoverOpen(false),
  });

  const isPending = isFormPending || isFilePending;

  const handleFileSelect = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    try {
      const content = await readFileAsText(file);
      const domainsRaw = parseDomainsFromFile(content);

      // Validate using the same schema as textarea input
      const result = bulkDomainsSchema.safeParse({ domains: domainsRaw.join('\n') });

      if (!result.success) {
        const errorMessage = result.error.issues[0]?.message || 'Invalid domains in file';
        toast.error('Domains', { description: errorMessage });
        return;
      }

      submitDomains(result.data.domains, 'file');
    } catch {
      toast.error('Domains', { description: 'Failed to read file' });
    }
  };

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          htmlType="button"
          type="secondary"
          theme="outline"
          size="small"
          className="border-secondary/20 hover:border-secondary">
          <Icon icon={ListChecksIcon} className="size-4" />
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
          mode="onSubmit"
          onSubmit={(data) => submitDomains(data.domains, 'form')}
          className="space-y-4">
          <Form.Field name="domains" required>
            <Form.Textarea
              placeholder={'example.com, example.org\nexample.net'}
              className="h-48 resize-none"
            />
          </Form.Field>
          <Form.Submit
            icon={<Icon icon={ArrowRightIcon} className="size-4" />}
            iconPosition="right"
            type="secondary"
            theme="solid"
            size="small"
            htmlType="submit"
            disabled={isPending}
            loading={isFormPending}
            loadingText="Adding...">
            Add domains
          </Form.Submit>
        </Form.Root>

        <div className="mt-6 space-y-4">
          <h2 className="text-sm font-semibold">Import from file</h2>
          <FileInputButton
            htmlType="button"
            accept={{ 'text/csv': ['.csv'] }}
            type="quaternary"
            theme="outline"
            size="small"
            disabled={isPending}
            loading={isFilePending}
            onFileSelect={handleFileSelect}
            onFileError={(error) => toast.error('Domains', { description: error.message })}>
            {isFilePending ? 'Importing...' : 'Choose file'}
          </FileInputButton>
        </div>
      </PopoverContent>
    </Popover>
  );
};
