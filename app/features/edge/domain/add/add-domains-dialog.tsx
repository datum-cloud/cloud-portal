import { annotateSummaryItems } from './annotate-summary';
import { renderBulkSummaryContent } from './bulk-summary-content';
import { DuplicateDomainNotice } from './duplicate-domain-notice';
import { showMutationErrorToast } from '@/modules/quota';
import { AnalyticsAction, useAnalytics } from '@/modules/rybbit';
import { useApp } from '@/providers/app.provider';
import {
  type Domain,
  type SiblingDomainMatch,
  type SiblingDomainMatches,
  bulkDomainsSchema,
  domainKeys,
  findSiblingDomains,
  normalizeDomainName,
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
import { Title } from '@datum-cloud/datum-ui/typography';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRightIcon, GlobeIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

interface AddDomainsDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (domain: Domain) => void;
}

interface PendingDuplicate {
  domainName: string;
  matches: SiblingDomainMatch[];
}

// Clears the pending notice when the textarea changes, so an edited domain is looked up again.
const ClearOnDomainsChange = ({ onChange }: { onChange: () => void }) => {
  const domains = useWatch('domains') as string | undefined;
  const previous = useRef(domains);

  useEffect(() => {
    if (previous.current === domains) return;
    previous.current = domains;
    onChange();
  }, [domains, onChange]);

  return null;
};

const AddDomainsSubmitButton = ({ hidden }: { hidden?: boolean }) => {
  const domains = useWatch('domains') as string | undefined;
  const domainsCount = domains ? parseDomains(domains).length : 0;

  if (hidden) return null;

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

// Starts the sibling lookup without awaiting it, so creation is never delayed.
function startBulkLookup(
  orgId: string | undefined,
  projectId: string,
  domains: string[]
): Promise<SiblingDomainMatches> {
  return orgId
    ? findSiblingDomains({ orgId, currentProjectId: projectId, domainNames: domains })
    : Promise.resolve({});
}

interface SummaryActionArgs {
  taskTitle: string;
  items: { id: string; status: string; message?: string }[];
  lookup: Promise<SiblingDomainMatches>;
  showSummary: ReturnType<typeof useTaskQueue>['showSummary'];
}

// The Summary action awaits the lookup on click, so annotations appear whenever it is shown.
function buildSummaryAction({ taskTitle, items, lookup, showSummary }: SummaryActionArgs) {
  return {
    children: 'Summary',
    type: 'quaternary' as const,
    theme: 'outline' as const,
    size: 'xs' as const,
    onClick: async () => {
      const matches = await lookup;
      // Custom renderer: the default table hides messages on succeeded rows. This withdraws the
      // plan's earlier "no custom renderContent" decision.
      showSummary(
        taskTitle,
        annotateSummaryItems(
          items.map((item) => ({
            id: item.id,
            label: item.id,
            status: item.status === 'succeeded' ? ('success' as const) : ('failed' as const),
            message: item.message,
          })),
          matches
        ),
        { renderContent: renderBulkSummaryContent }
      );
    },
  };
}

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
  const [pendingDuplicate, setPendingDuplicate] = useState<PendingDuplicate | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Bumped on open/close and on every edit, so a lookup that was in flight is ignored on arrival.
  const lookupToken = useRef(0);

  const resetPendingDuplicate = useCallback(() => {
    lookupToken.current += 1;
    setPendingDuplicate(null);
  }, []);

  useEffect(() => {
    resetPendingDuplicate();
  }, [open, resetPendingDuplicate]);

  // Single domain → create directly + navigate to detail (preserves single-add UX).
  // Dialog stays open on error so the user can correct and retry.
  const createSingle = async (domainName: string) => {
    setIsAdding(true);
    try {
      const domain = await createDomain({ domainName });
      trackAction(AnalyticsAction.AddDomain);
      onOpenChange(false);
      if (domain?.name) onSuccess?.(domain);
    } catch (error) {
      showMutationErrorToast(error, { fallbackTitle: 'Domain', scope: 'project', projectId });
    } finally {
      setIsAdding(false);
      setPendingDuplicate(null);
    }
  };

  // A single domain from a CSV file skips the duplicate lookup: file imports never prompt.
  const submitSingle = async (domainName: string, { fromFile }: { fromFile: boolean }) => {
    if (organization?.name && !fromFile) {
      const token = ++lookupToken.current;
      const matches = await findSiblingDomains({
        orgId: organization.name,
        currentProjectId: projectId,
        domainNames: [domainName],
      });
      if (token !== lookupToken.current) return;
      const hit = matches[normalizeDomainName(domainName)];
      if (hit?.length) {
        setPendingDuplicate({ domainName, matches: hit });
        return;
      }
    }
    await createSingle(domainName);
  };

  // Many → task-queue batch create, stay on the list.
  const submitBulk = (domains: string[]) => {
    onOpenChange(false);

    const metadata =
      project && organization
        ? createProjectMetadata(
            { id: project.name, name: project.displayName || project.name },
            { id: organization.name, name: organization.displayName || organization.name }
          )
        : undefined;
    const taskTitle = `Add ${domains.length} domains`;
    const lookup = startBulkLookup(organization?.name, projectId, domains);

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
      // Card actions are evaluated once when the batch completes, and the lookup may still be
      // pending then, so Summary is always offered; its click awaits the lookup and annotates.
      completionActions: (_result, { items }) => [
        buildSummaryAction({ taskTitle, items, lookup, showSummary }),
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

  const submitDomains = async (domains: string[], { fromFile = false } = {}) => {
    if (domains.length === 1) return submitSingle(domains[0], { fromFile });
    submitBulk(domains);
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

      await submitDomains(result.data.domains, { fromFile: true });
    } catch {
      toast.error('Domains', { description: 'Failed to read file' });
    }
  };

  const handleFormSubmit = (data: { domains: string[] }) => submitDomains(data.domains);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="w-full sm:max-w-2xl">
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
            <ClearOnDomainsChange onChange={resetPendingDuplicate} />
            <AddDomainsSubmitButton hidden={pendingDuplicate !== null} />
          </Form.Root>

          {pendingDuplicate && (
            <DuplicateDomainNotice
              domainName={pendingDuplicate.domainName}
              matches={pendingDuplicate.matches}
              onOpenExisting={(match) => {
                onOpenChange(false);
                navigate(
                  getPathWithParams(paths.project.detail.domains.detail.overview, {
                    projectId: match.projectId,
                    domainId: match.domainId,
                  })
                );
              }}
              isAdding={isAdding}
              onAddAnyway={() => void createSingle(pendingDuplicate.domainName)}
              onCancel={() => {
                setPendingDuplicate(null);
                onOpenChange(false);
              }}
            />
          )}

          <div className="mt-6 space-y-4">
            <Title as="h2" level={7} weight="semibold">
              Import from file
            </Title>
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
