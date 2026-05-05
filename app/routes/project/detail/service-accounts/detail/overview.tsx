import type { ServiceAccountDetailContext } from './layout';
import { BadgeCopy } from '@/components/badge/badge-copy';
import { DateTime } from '@/components/date-time';
import { List, type ListItem } from '@/components/list/list';
import { useUpdateServiceAccount } from '@/resources/service-accounts';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { PageTitle } from '@datum-cloud/datum-ui/page-title';
import { toast } from '@datum-cloud/datum-ui/toast';
import { InfoIcon, PowerIcon, PowerOffIcon } from 'lucide-react';
import { useMemo } from 'react';
import type { MetaFunction } from 'react-router';
import { useOutletContext, useParams } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Overview</span>,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Overview'));

export default function ServiceAccountOverviewPage() {
  const { projectId, serviceAccountId } = useParams();
  const { account } = useOutletContext<ServiceAccountDetailContext>();

  const toggleMutation = useUpdateServiceAccount(projectId ?? '', serviceAccountId ?? '', {
    onSuccess: () => {
      toast.success('Service account updated');
    },
    onError: (error) => {
      toast.error('Error', { description: error.message });
    },
  });

  const handleToggle = () => {
    toggleMutation.mutate({
      status: account.status === 'Active' ? 'Disabled' : 'Active',
    });
  };

  const isActive = account.status === 'Active';

  const listItems: ListItem[] = useMemo(() => {
    return [
      { label: 'Name', content: account.name },
      { label: 'Display Name', content: account.displayName ?? '—' },
      {
        label: 'Identity Email',
        content: (
          <BadgeCopy
            value={account.identityEmail}
            text={account.identityEmail}
            className="text-foreground bg-muted border-none px-2"
          />
        ),
      },
      {
        label: 'Status',
        content: <Badge type={isActive ? 'success' : 'secondary'}>{account.status}</Badge>,
      },
      {
        label: 'Created',
        content: account.createdAt ? <DateTime date={account.createdAt} /> : '—',
      },
      {
        label: 'Last Modified',
        content: account.updatedAt ? <DateTime date={account.updatedAt} /> : '—',
      },
    ];
  }, [account, isActive]);

  return (
    <Row type="flex" gutter={[24, 32]}>
      <Col span={24}>
        <div className="flex items-center justify-between gap-4">
          <PageTitle title={account.displayName ?? account.name} />
          <Button
            type="quaternary"
            theme="outline"
            size="small"
            loading={toggleMutation.isPending}
            onClick={handleToggle}>
            <Icon icon={isActive ? PowerOffIcon : PowerIcon} size={14} />
            {isActive ? 'Disable' : 'Enable'}
          </Button>
        </div>
      </Col>

      <Col span={24}>
        <Card className="w-full overflow-hidden rounded-xl px-3 py-4 shadow-none sm:pt-6 sm:pb-4">
          <CardContent className="p-0 sm:px-6 sm:pb-4">
            <List items={listItems} />
          </CardContent>
        </Card>
      </Col>

      <Col span={24}>
        <div className="bg-muted/40 flex items-start gap-3 rounded-lg border p-4 text-sm">
          <Icon icon={InfoIcon} className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          <p className="text-muted-foreground">
            Service accounts allow workloads, CI/CD pipelines, and automated systems to authenticate
            with Datum Cloud using short-lived tokens via{' '}
            <a
              href="https://datatracker.ietf.org/doc/html/rfc7523"
              target="_blank"
              rel="noopener noreferrer"
              className="underline">
              RFC 7523
            </a>{' '}
            JWT exchange.
          </p>
        </div>
      </Col>
    </Row>
  );
}
