import type { ServiceAccountDetailContext } from './layout';
import { BadgeCopy } from '@/components/badge/badge-copy';
import { BadgeStatus } from '@/components/badge/badge-status';
import { DateTime } from '@/components/date-time';
import { List, type ListItem } from '@/components/list/list';
import { NoteCard } from '@/components/note-card/note-card';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { InfoIcon } from 'lucide-react';
import { useMemo } from 'react';
import type { MetaFunction } from 'react-router';
import { useOutletContext } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Overview</span>,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Overview'));

export default function ServiceAccountOverviewPage() {
  const { account } = useOutletContext<ServiceAccountDetailContext>();

  const listItems: ListItem[] = useMemo(() => {
    return [
      { label: 'Resource Name', content: account.name },
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
        content: <BadgeStatus status={account.status} />,
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
  }, [account]);

  return (
    <Row type="flex" gutter={[24, 32]}>
      <Col span={24}>
        <Card className="w-full overflow-hidden rounded-xl px-3 py-4 shadow-none sm:pt-6 sm:pb-4">
          <CardContent className="p-0 sm:px-6 sm:pb-4">
            <List items={listItems} />
          </CardContent>
        </Card>
      </Col>

      <Col span={24}>
        <NoteCard
          icon={<Icon icon={InfoIcon} className="size-5" />}
          title="About Service Accounts"
          description={
            <span className="text-sm">
              Service accounts allow workloads, CI/CD pipelines, and automated systems to
              authenticate with Datum Cloud using short-lived tokens via{' '}
              <a
                href="https://datatracker.ietf.org/doc/html/rfc7523"
                target="_blank"
                rel="noopener noreferrer"
                className="underline">
                RFC 7523
              </a>{' '}
              JWT exchange.
            </span>
          }
        />
      </Col>
    </Row>
  );
}
