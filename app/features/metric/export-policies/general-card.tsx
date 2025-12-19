import { ExportPolicyStatus } from './status';
import { BadgeCopy } from '@/components/badge/badge-copy';
import { DateTime } from '@/components/date-time';
import { List, ListItem } from '@/components/list/list';
import { IExportPolicyControlResponse } from '@/resources/interfaces/export-policy.interface';
import { paths } from '@/utils/config/paths.config';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { getShortId } from '@/utils/helpers/text.helper';
import { Card, CardContent, CardHeader, CardTitle, LinkButton } from '@datum-ui/components';
import { PencilIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useParams } from 'react-router';

export const ExportPolicyGeneralCard = ({
  exportPolicy,
}: {
  exportPolicy: IExportPolicyControlResponse;
}) => {
  const { projectId } = useParams();

  const listItems: ListItem[] = useMemo(() => {
    if (!exportPolicy) return [];

    return [
      {
        label: 'Name',
        content: (
          <BadgeCopy
            value={exportPolicy.name ?? ''}
            text={exportPolicy.name}
            badgeType="muted"
            badgeTheme="solid"
          />
        ),
      },
      {
        label: 'UID',
        content: (
          <BadgeCopy
            value={exportPolicy.uid ?? ''}
            text={getShortId(exportPolicy.uid ?? '')}
            badgeType="muted"
            badgeTheme="solid"
          />
        ),
      },
      {
        label: 'Namespace',
        content: <span className="capitalize">{exportPolicy.namespace}</span>,
      },
      {
        label: 'Status',
        content: (
          <ExportPolicyStatus
            currentStatus={transformControlPlaneStatus(exportPolicy?.status)}
            showTooltip={false}
          />
        ),
      },
      {
        label: 'Created At',
        content: (
          <DateTime className="text-sm" date={exportPolicy?.createdAt ?? ''} variant="both" />
        ),
      },
    ];
  }, [exportPolicy]);

  return (
    <Card className="px-3 py-8 shadow">
      <CardHeader className="mb-2">
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="text-lg font-medium">General</span>
          <LinkButton
            size="xs"
            icon={<PencilIcon size={12} />}
            to={getPathWithParams(paths.project.detail.metrics.exportPolicies.detail.edit, {
              projectId: projectId ?? '',
              exportPolicyId: exportPolicy?.name ?? '',
            })}>
            Edit
          </LinkButton>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <List items={listItems} className="border-table-accent dark:border-quaternary border-t" />
      </CardContent>
    </Card>
  );
};
