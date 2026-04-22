import { BadgeCopy } from '@/components/badge/badge-copy';
import { DateTime } from '@/components/date-time';
import { List, type ListItem } from '@/components/list/list';
import { useMachineAccount } from '@/resources/machine-accounts';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { InfoIcon } from 'lucide-react';
import { useMemo } from 'react';
import type { MetaFunction } from 'react-router';
import { useParams } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Overview</span>,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Overview'));

export default function MachineAccountOverviewPage() {
  const { projectId, machineAccountId } = useParams();

  const { data: account } = useMachineAccount(projectId ?? '', machineAccountId ?? '');

  const listItems: ListItem[] = useMemo(() => {
    if (!account) return [];
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
        content: (
          <Badge type={account.status === 'Active' ? 'success' : 'secondary'}>
            {account.status}
          </Badge>
        ),
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

  if (!account) return null;

  return (
    <div className="flex flex-col gap-6">
      <Card className="w-full overflow-hidden rounded-xl px-3 py-4 shadow sm:pt-6 sm:pb-4">
        <CardContent className="p-0 sm:px-6 sm:pb-4">
          <List items={listItems} />
        </CardContent>
      </Card>

      <div className="bg-muted/40 flex items-start gap-3 rounded-lg border p-4 text-sm">
        <Icon icon={InfoIcon} className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        <p className="text-muted-foreground">
          Machine accounts allow workloads, CI/CD pipelines, and automated systems to authenticate
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
    </div>
  );
}
