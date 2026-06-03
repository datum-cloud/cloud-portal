import { DOMAIN_CSV_HEADERS, domainToCsvRow } from './domain-csv';
import { useApp } from '@/providers/app.provider';
import { type Domain } from '@/resources/domains';
import { downloadFile } from '@/utils/common';
import { toCsv } from '@/utils/helpers/csv.helper';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { createProjectMetadata, useTaskQueue } from '@datum-cloud/datum-ui/task-queue';
import { toast } from '@datum-cloud/datum-ui/toast';
import { DownloadIcon } from 'lucide-react';

// Dummy-progress pacing: aim for ~1.5s smooth, never drag past ~2s for large lists.
const PROGRESS_TARGET_MS = 1500;
const PROGRESS_MAX_MS = 2000;
const MIN_STEP_MS = 8;
const MAX_STEP_MS = 100;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function useDomainExport() {
  const { enqueue, showSummary } = useTaskQueue();
  const { project, organization } = useApp();

  const handleExport = (domains: Domain[]) => {
    if (domains.length === 0) {
      toast.info('No domains to export');
      return;
    }

    const metadata =
      project && organization
        ? createProjectMetadata(
            { id: project.name, name: project.displayName || project.name },
            { id: organization.name, name: organization.displayName || organization.name }
          )
        : undefined;

    const projectSlug = project?.name ?? 'project';
    // Local timestamp YYYY-MM-DD-HHmm: filename-safe (no colons) and sorts chronologically.
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
    const filename = `domains-${projectSlug}-${stamp}.csv`;

    const stepMs = Math.min(
      MAX_STEP_MS,
      Math.max(MIN_STEP_MS, Math.floor(PROGRESS_TARGET_MS / domains.length))
    );

    const taskTitle = `Export ${domains.length} ${domains.length === 1 ? 'domain' : 'domains'}`;

    enqueue<Domain, string>({
      title: taskTitle,
      icon: <Icon icon={DownloadIcon} className="size-4" />,
      metadata,
      confirmBeforeUnload: false,
      items: domains,
      processor: async (ctx) => {
        const rows: string[][] = [];
        const start = Date.now();
        for (const domain of ctx.items) {
          try {
            rows.push(domainToCsvRow(domain));
            ctx.succeed(domain.name);
          } catch (error) {
            ctx.fail(domain.name, error instanceof Error ? error.message : 'Failed to map domain');
          }
          // Dummy progress, capped so huge lists still finish promptly.
          if (Date.now() - start < PROGRESS_MAX_MS) await sleep(stepMs);
        }
        ctx.setResult(toCsv(DOMAIN_CSV_HEADERS, rows));
      },
      completionActions: (csv, info) => [
        ...(info.failed > 0
          ? [
              {
                children: 'Summary',
                type: 'quaternary' as const,
                theme: 'outline' as const,
                size: 'xs' as const,
                onClick: () =>
                  showSummary(
                    taskTitle,
                    info.items.map((item) => ({
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
          children: 'Download CSV',
          type: 'primary' as const,
          theme: 'outline' as const,
          size: 'xs' as const,
          icon: <Icon icon={DownloadIcon} className="size-4" />,
          onClick: () => downloadFile(csv, filename, 'text/csv'),
        },
      ],
    });
  };

  return { handleExport };
}
