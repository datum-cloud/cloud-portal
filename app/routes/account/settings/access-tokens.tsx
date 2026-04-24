import { BadgeCopy } from '@/components/badge/badge-copy';
import { DateTime } from '@/components/date-time';
import { createActionsColumn, Table } from '@/components/table';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Button } from '@datum-cloud/datum-ui/button';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { CloseIcon, Icon } from '@datum-cloud/datum-ui/icons';
import { ColumnDef } from '@tanstack/react-table';
import { ThumbsUpIcon, Trash2Icon } from 'lucide-react';
import { useMemo } from 'react';
import { MetaFunction } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Access Tokens');
});

const DUMMIES = [
  {
    id: 1,
    name: 'DB Access',
    token: 'sbp_3747...........................05a3',
    lastUsed: new Date('2025-12-30T14:30:00Z'),
    expiresAt: new Date('2025-12-30T14:30:00Z'),
  },
];

type TokenRow = (typeof DUMMIES)[0];

export default function AccountActiveSessionsPage() {
  const columns: ColumnDef<TokenRow>[] = useMemo(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        id: 'name',
        cell: ({ row }) => {
          return <span className="text-xs font-medium">{row.original.name}</span>;
        },
      },
      {
        header: 'Token',
        accessorKey: 'token',
        cell: ({ row }) => row.original.token,
      },
      {
        header: 'Last Used',
        accessorKey: 'lastUsed',
        id: 'lastUsed',
        cell: ({ row }) => {
          return <DateTime date={row.original.lastUsed} />;
        },
      },
      {
        header: 'Expires At',
        accessorKey: 'expiresAt',
        id: 'expiresAt',
        cell: ({ row }) => <DateTime date={row.original.expiresAt} />,
      },
      createActionsColumn<TokenRow>([
        {
          label: 'Revoke',
          icon: <Icon icon={Trash2Icon} className="size-3.5" />,
          onClick: () => {
            console.log('Revoke');
          },
        },
      ]),
    ],
    []
  );

  return (
    <Row gutter={[0, 16]}>
      <Col span={24}>
        <div className="bg-card-success border-card-success-border relative flex flex-col gap-3.5 rounded-lg border p-6">
          <div className="flex items-center gap-2.5">
            <Icon icon={ThumbsUpIcon} className="text-success relative" size={16} />
            <h4 className="text-sm font-semibold">Successfully generated a new token!</h4>
          </div>
          <p className="text-xs">
            Copy this access token and store it in a secure place - you will not be able to see it
            again.
          </p>
          <BadgeCopy
            value="sbp_37474d10ded17b81bc932dabd6188cc0dfac05a3"
            text="sbp_37474d10ded17b81bc932dabd6188cc0dfac05a3"
            className="text-foreground border-none bg-[#4D63561C] px-2.5"
          />
        </div>
        <Button
          type="quaternary"
          theme="link"
          size="icon"
          className="absolute top-5 right-4 size-[23px]">
          <CloseIcon />
        </Button>
      </Col>
      <Col span={24}>
        <Table.Client columns={columns} data={DUMMIES} empty="No access tokens found." />
      </Col>
    </Row>
  );
}
