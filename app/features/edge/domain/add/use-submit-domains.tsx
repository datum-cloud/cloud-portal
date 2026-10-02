import { showMutationErrorToast } from '@/modules/quota';
import { AnalyticsAction, useAnalytics } from '@/modules/rybbit';
import { useApp } from '@/providers/app.provider';
import { type Domain, domainKeys, useCreateDomain } from '@/resources/domains';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { createProjectMetadata, useTaskQueue } from '@datum-cloud/datum-ui/task-queue';
import { useQueryClient } from '@tanstack/react-query';
import { GlobeIcon } from 'lucide-react';
import { useNavigate } from 'react-router';

/**
 * Creates the domains entered in the add-domains dialog or page:
 * - One domain is created right away. On success `onCreated` runs (open the
 *   domain); on failure the error shows and the caller stays put so the user
 *   can fix it.
 * - Several are queued as a background task, three at a time, with a summary
 *   of any failures. `onQueued` runs as soon as the task is queued.
 */
export function useSubmitDomains(
  projectId: string,
  { onCreated, onQueued }: { onCreated?: (domain: Domain) => void; onQueued?: () => void } = {}
) {
  const { enqueue, showSummary } = useTaskQueue();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutateAsync: createDomain } = useCreateDomain(projectId);
  const { project, organization } = useApp();
  const { trackAction } = useAnalytics();

  return async (domains: string[]) => {
    if (domains.length === 1) {
      try {
        const domain = await createDomain({ domainName: domains[0] });
        trackAction(AnalyticsAction.AddDomain);
        onCreated?.(domain);
      } catch (error) {
        showMutationErrorToast(error, { fallbackTitle: 'Domain', scope: 'project', projectId });
      }
      return;
    }

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
    onQueued?.();
  };
}
