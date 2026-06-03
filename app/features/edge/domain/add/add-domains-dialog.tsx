import { AnalyticsAction, useAnalytics } from '@/modules/fathom';
import { useApp } from '@/providers/app.provider';
import {
  type Domain,
  bulkDomainsSchema,
  domainKeys,
  parseDomains,
  useCreateDomain,
} from '@/resources/domains';
import { readFileAsText } from '@/utils/common';
import { paths } from '@/utils/config/paths.config';
import { parseDomainsFromFile } from '@/utils/helpers/parse.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Dialog } from '@datum-cloud/datum-ui/dialog';
import { FileInputButton } from '@datum-cloud/datum-ui/dropzone';
import { Form, useWatch } from '@datum-cloud/datum-ui/form';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { useTaskQueue, createProjectMetadata } from '@datum-cloud/datum-ui/task-queue';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRightIcon, GlobeIcon } from 'lucide-react';
import { useNavigate } from 'react-router';

interface AddDomainsDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (domain: Domain) => void;
}

const AddDomainsSubmitButton = () => {
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

export const AddDomainsDialog = ({
  projectId,
  open,
  onOpenChange,
  onSuccess,
}: AddDomainsDialogProps) => {
  const { enqueue, showSummary } = useTaskQueue();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutateAsync: createDomain } = useCreateDomain(projectId);
  const { project, organization } = useApp();
  const { trackAction } = useAnalytics();

  const submitDomains = async (domains: string[]) => {
    // Single domain → create directly + navigate to detail (preserves single-add UX).
    // Dialog stays open on error so the user can correct and retry.
    if (domains.length === 1) {
      try {
        const domain = await createDomain({ domainName: domains[0] });
        trackAction(AnalyticsAction.AddDomain);
        onOpenChange(false);
        if (domain?.name) onSuccess?.(domain);
      } catch (error) {
        toast.error('Domain', {
          description: error instanceof Error ? error.message : 'Failed to add domain',
        });
      }
      return;
    }

    // Many → task-queue batch create, stay on the list.
    onOpenChange(false);

    const metadata =
      project && organization
        ? createProjectMetadata(
            { id: project.name, name: project.displayName || project.name },
            { id: organization.name, name: organization.displayName || organization.name }
          )
        : undefined;

    const taskTitle = `Add ${domains.length} domains`;

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
          type: 'primary' as const,
          theme: 'outline' as const,
          size: 'xs' as const,
          onClick: () =>
            navigate(getPathWithParams(paths.project.detail.domains.root, { projectId })),
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

      await submitDomains(result.data.domains);
    } catch {
      toast.error('Domains', { description: 'Failed to read file' });
    }
  };

  const handleFormSubmit = (data: { domains: string[] }) => submitDomains(data.domains);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="w-96">
        <Dialog.Header
          title="Add domains"
          description="Add one domain or many — separated by new lines or commas."
          onClose={() => onOpenChange(false)}
        />
        <Dialog.Body className="space-y-4 p-5 pt-0">
          <Form.Root
            schema={bulkDomainsSchema}
            mode="onSubmit"
            onSubmit={handleFormSubmit}
            className="space-y-4">
            <Form.Field name="domains" required>
              <Form.Textarea
                placeholder={'example.com, example.org\nexample.net'}
                className="h-48 resize-none"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                data-e2e="add-domains-input"
              />
            </Form.Field>
            <AddDomainsSubmitButton />
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
              Choose CSV file
            </FileInputButton>
          </div>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
};
