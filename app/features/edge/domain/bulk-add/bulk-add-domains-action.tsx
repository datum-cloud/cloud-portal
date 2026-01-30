import { bulkDomainsSchema, domainKeys, useCreateDomain } from '@/resources/domains';
import { readFileAsText } from '@/utils/common';
import { parseDomainsFromFile } from '@/utils/helpers/parse.helper';
import { Button, toast, useTaskQueue } from '@datum-ui/components';
import { FileInputButton } from '@datum-ui/components/file-input-button/file-input-button';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { Form } from '@datum-ui/components/new-form';
import { Popover, PopoverContent, PopoverTrigger } from '@shadcn/ui/popover';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRightIcon, GlobeIcon, ListChecksIcon } from 'lucide-react';
import { useState } from 'react';

export const BulkAddDomainsAction = ({ projectId }: { projectId: string }) => {
  const [popoverOpen, setPopoverOpen] = useState(false);

  const { enqueue } = useTaskQueue();
  const queryClient = useQueryClient();
  const { mutateAsync: createDomain } = useCreateDomain(projectId);

  const submitDomains = (domains: string[]) => {
    setPopoverOpen(false);

    enqueue({
      title: `Adding ${domains.length} domains`,
      icon: <GlobeIcon className="size-4" />,
      items: domains,
      itemConcurrency: 3,
      processItem: async (domain) => {
        await createDomain({ domainName: domain });
      },
      onComplete: () => queryClient.invalidateQueries({ queryKey: domainKeys.list(projectId) }),
    });
  };

  const handleFileSelect = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    try {
      const content = await readFileAsText(file);
      const domainsRaw = parseDomainsFromFile(content);
      const result = bulkDomainsSchema.safeParse({ domains: domainsRaw.join('\n') });

      if (!result.success) {
        toast.error('Domains', {
          description: result.error.issues[0]?.message || 'Invalid domains in file',
        });
        return;
      }

      submitDomains(result.data.domains);
    } catch {
      toast.error('Domains', { description: 'Failed to read file' });
    }
  };

  const handleFormSubmit = (data: { domains: string[] }) => {
    submitDomains(data.domains);
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
          onSubmit={handleFormSubmit}
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
            htmlType="submit">
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
            onFileSelect={handleFileSelect}
            onFileError={(error) => toast.error('Domains', { description: error.message })}>
            Choose file
          </FileInputButton>
        </div>
      </PopoverContent>
    </Popover>
  );
};
