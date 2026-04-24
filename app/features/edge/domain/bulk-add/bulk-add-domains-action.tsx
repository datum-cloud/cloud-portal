import { useApp } from '@/providers/app.provider';
import { bulkDomainsSchema, domainKeys, parseDomains, useCreateDomain } from '@/resources/domains';
import { readFileAsText } from '@/utils/common';
import { paths } from '@/utils/config/paths.config';
import { parseDomainsFromFile } from '@/utils/helpers/parse.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button } from '@datum-cloud/datum-ui/button';
import { Dialog } from '@datum-cloud/datum-ui/dialog';
import { FileInputButton } from '@datum-cloud/datum-ui/dropzone';
import { Form, useWatch } from '@datum-cloud/datum-ui/form';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { ResponsiveDropdown } from '@datum-cloud/datum-ui/responsive-dropdown';
import { useTaskQueue, createProjectMetadata } from '@datum-cloud/datum-ui/task-queue';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRightIcon, GlobeIcon, ListChecksIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

interface BulkAddDomainsActionProps {
  projectId: string;
  popoverOpen?: boolean;
  onPopoverOpenChange?: (open: boolean) => void;
}

const BulkDomainsSubmitButton = () => {
  const domains = useWatch('domains') as string | undefined;
  const domainsCount = domains ? parseDomains(domains).length : 0;

  return (
    <Form.Submit
      icon={<Icon icon={ArrowRightIcon} className="size-4" />}
      iconPosition="right"
      type="secondary"
      theme="solid"
      size="small"
      htmlType="submit"
      disabled={domainsCount === 0}>
      {domainsCount > 0
        ? `Add ${domainsCount === 1 ? 'domain' : 'domains'} (${domainsCount})`
        : 'Add domains'}
    </Form.Submit>
  );
};

export const BulkAddDomainsAction = ({
  projectId,
  popoverOpen: controlledPopoverOpen,
  onPopoverOpenChange,
}: BulkAddDomainsActionProps) => {
  const [internalPopoverOpen, setInternalPopoverOpen] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const popoverOpen = controlledPopoverOpen ?? internalPopoverOpen;
  const setPopoverOpen = onPopoverOpenChange ?? setInternalPopoverOpen;

  const { enqueue, showSummary } = useTaskQueue();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutateAsync: createDomain } = useCreateDomain(projectId);
  const { project, organization } = useApp();

  const submitDomains = (domains: string[]) => {
    setPopoverOpen(false);

    // Build metadata for scope-aware task panel display
    const metadata =
      project && organization
        ? createProjectMetadata(
            { id: project.name, name: project.displayName || project.name },
            { id: organization.name, name: organization.displayName || organization.name }
          )
        : undefined;

    const taskTitle = `Add ${domains.length} ${domains.length === 1 ? 'domain' : 'domains'}`;

    enqueue({
      title: taskTitle,
      icon: <Icon icon={GlobeIcon} className="size-4" />,
      items: domains,
      metadata,
      itemConcurrency: 3,
      processItem: async (domain) => {
        await createDomain({ domainName: domain });
      },
      onComplete: () => queryClient.invalidateQueries({ queryKey: domainKeys.list(projectId) }),
      completionActions: (_result, { failed, items }) => [
        ...(failed > 0
          ? [
              {
                children: 'Summary',
                type: 'quaternary' as const,
                theme: 'outline' as const,
                size: 'xs' as const,
                onClick: () =>
                  showSummary(
                    taskTitle,
                    items.map((item) => ({
                      id: item.id,
                      label: item.id,
                      status: item.status === 'succeeded' ? 'success' : 'failed',
                      message: item.message,
                    }))
                  ),
              },
            ]
          : []),
        {
          children: 'View Domains',
          type: 'primary',
          theme: 'outline',
          size: 'xs',
          onClick: () =>
            navigate(
              getPathWithParams(paths.project.detail.domains.root, { projectId: projectId! })
            ),
        },
      ],
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

  // Use Dialog when controlled (for empty content), Popover when uncontrolled (for toolbar)
  const isControlled = controlledPopoverOpen !== undefined;

  const content = (
    <>
      {!isControlled && (
        <div className="hidden space-y-3 sm:block">
          <h2 className="text-sm font-semibold">Bulk Add Domains</h2>
          <p className="text-xs">
            Paste a list of domains below, separated by new lines or commas.
          </p>
        </div>
      )}

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
        <BulkDomainsSubmitButton />
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
    </>
  );

  if (isControlled) {
    return (
      <Dialog open={popoverOpen} onOpenChange={setPopoverOpen}>
        <Dialog.Content className="w-96">
          <Dialog.Header
            title="Bulk Add Domains"
            description="Paste a list of domains below, separated by new lines or commas."
            onClose={() => setPopoverOpen(false)}
          />
          <Dialog.Body className="space-y-4 p-5 pt-0">{content}</Dialog.Body>
        </Dialog.Content>
      </Dialog>
    );
  }

  return (
    <ResponsiveDropdown
      open={popoverOpen}
      onOpenChange={setPopoverOpen}
      sheetTitle="Bulk Add Domains"
      sheetDescription="Paste a list of domains below, separated by new lines or commas."
      contentClassName="w-96 rounded-xl p-7"
      trigger={
        <Button
          htmlType="button"
          type="secondary"
          theme="outline"
          size="small"
          className="border-secondary/20 hover:border-secondary w-full sm:w-auto">
          <Icon icon={ListChecksIcon} className="size-4" />
          Bulk add domains
        </Button>
      }>
      <div className="space-y-4 p-4 sm:p-0">{content}</div>
    </ResponsiveDropdown>
  );
};
