import { ExportPolicyStatus } from '../status';
import { BadgeCopy } from '@/components/badge/badge-copy';
import { DateTime } from '@/components/date-time';
import { List, ListItem } from '@/components/list/list';
import { IExportPolicyControlResponse } from '@/resources/export-policies';
import { paths } from '@/utils/config/paths.config';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { getShortId } from '@/utils/helpers/text.helper';
import { LinkButton } from '@datum-cloud/datum-ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { PencilIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router';

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
    <Card size="sm" sectioned className="h-full overflow-hidden">
      <CardHeader size="sm" bordered>
        <CardTitle className="text-sm">General</CardTitle>
        <CardAction>
          <LinkButton
            as={Link}
            size="xs"
            icon={<PencilIcon size={12} />}
            href={getPathWithParams(paths.project.detail.metrics.detail.settings, {
              projectId: projectId ?? '',
              exportPolicyId: exportPolicy?.name ?? '',
            })}>
            Settings
          </LinkButton>
        </CardAction>
      </CardHeader>
      <CardContent padding="none">
        <List items={listItems} />
      </CardContent>
    </Card>
  );
};
