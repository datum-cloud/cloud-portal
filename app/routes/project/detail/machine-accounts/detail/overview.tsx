import { BadgeCopy } from '@/components/badge/badge-copy';
import { DateTime } from '@/components/date-time';
import { useMachineAccount } from '@/resources/machine-accounts';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Badge } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { InfoIcon } from 'lucide-react';
import type { MetaFunction } from 'react-router';
import { useParams } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Overview</span>,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Overview'));

export default function MachineAccountOverviewPage() {
  const { projectId, machineAccountId } = useParams();

  const { data: account } = useMachineAccount(projectId ?? '', machineAccountId ?? '');

  if (!account) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border">
        <div className="grid grid-cols-1 gap-0 divide-y md:grid-cols-2 md:divide-x md:divide-y-0">
          <div className="grid grid-cols-1 divide-y">
            <DetailRow label="Name" value={account.name} />
            <DetailRow label="Display Name" value={account.displayName ?? '—'} />
            <DetailRow
              label="Identity Email"
              value={
                <BadgeCopy
                  value={account.identityEmail}
                  text={account.identityEmail}
                  className="text-foreground bg-muted border-none px-2"
                />
              }
            />
          </div>
          <div className="grid grid-cols-1 divide-y">
            <DetailRow
              label="Status"
              value={
                <Badge type={account.status === 'Active' ? 'success' : 'secondary'}>
                  {account.status}
                </Badge>
              }
            />
            <DetailRow
              label="Created"
              value={account.createdAt ? <DateTime date={account.createdAt} /> : '—'}
            />
            <DetailRow
              label="Last Modified"
              value={account.updatedAt ? <DateTime date={account.updatedAt} /> : '—'}
            />
          </div>
        </div>
      </div>

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

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <span className="text-muted-foreground w-36 shrink-0 text-xs font-medium">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
