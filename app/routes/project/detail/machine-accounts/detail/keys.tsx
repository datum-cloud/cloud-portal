import { BadgeCopy } from '@/components/badge/badge-copy';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DateTime } from '@/components/date-time';
import { MachineAccountKeyFormDialog } from '@/features/machine-account/form/machine-account-key-form-dialog';
import type { MachineAccountKeyFormDialogRef } from '@/features/machine-account/form/machine-account-key-form-dialog';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { DataTable } from '@/modules/datum-ui/components/data-table';
import type { DataTableRowActionsProps } from '@/modules/datum-ui/components/data-table';
import {
  useMachineAccountKeys,
  useRevokeMachineAccountKey,
  type MachineAccountKey,
} from '@/resources/machine-accounts';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Badge, Button, CloseIcon, toast } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { ColumnDef } from '@tanstack/react-table';
import { CheckIcon, CopyIcon, PlusIcon, ThumbsUpIcon } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { MetaFunction } from 'react-router';
import { useParams } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Keys</span>,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Keys'));

export default function MachineAccountKeysPage() {
  const { projectId, machineAccountId } = useParams();
  const { confirm } = useConfirmationDialog();
  const keyFormDialogRef = useRef<MachineAccountKeyFormDialogRef>(null);
  const [newPrivateKey, setNewPrivateKey] = useState<string | null>(null);

  const [, copyToClipboard] = useCopyToClipboard();
  const [keyCopied, setKeyCopied] = useState(false);

  const { data: keys = [] } = useMachineAccountKeys(projectId ?? '', machineAccountId ?? '');

  const revokeMutation = useRevokeMachineAccountKey(projectId ?? '', machineAccountId ?? '', {
    onSuccess: () => {
      toast.success('Key revoked', { description: 'The key has been revoked successfully.' });
    },
    onError: (error) => {
      toast.error('Error', { description: error.message });
    },
  });

  const revokeKey = useCallback(
    async (key: MachineAccountKey) => {
      await confirm({
        title: 'Revoke Key',
        description: (
          <span>
            Are you sure you want to revoke <strong>{key.name}</strong>? Any systems using this key
            will lose access immediately.
          </span>
        ),
        submitText: 'Revoke',
        cancelText: 'Cancel',
        variant: 'destructive',
        showConfirmInput: false,
        onSubmit: async () => {
          revokeMutation.mutate(key.name);
        },
      });
    },
    [confirm, revokeMutation]
  );

  const columns: ColumnDef<MachineAccountKey>[] = useMemo(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        header: 'Key ID',
        accessorKey: 'keyId',
        cell: ({ row }) => (
          <BadgeCopy
            value={row.original.keyId}
            text={`${row.original.keyId.slice(0, 16)}...`}
            className="text-foreground bg-muted border-none px-2"
          />
        ),
      },
      {
        header: 'Type',
        accessorKey: 'type',
        cell: ({ row }) => (
          <Badge type="secondary">
            {row.original.type === 'datum-managed' ? 'Datum-managed' : 'User-managed'}
          </Badge>
        ),
      },
      {
        header: 'Created',
        accessorKey: 'createdAt',
        cell: ({ row }) =>
          row.original.createdAt ? <DateTime date={row.original.createdAt} /> : null,
      },
      {
        header: 'Expires',
        accessorKey: 'expiresAt',
        cell: ({ row }) =>
          row.original.expiresAt ? <DateTime date={row.original.expiresAt} /> : <span>Never</span>,
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => (
          <Badge type={row.original.status === 'Active' ? 'success' : 'danger'}>
            {row.original.status}
          </Badge>
        ),
      },
    ],
    []
  );

  const rowActions: DataTableRowActionsProps<MachineAccountKey>[] = useMemo(
    () => [
      {
        key: 'revoke',
        label: 'Revoke',
        variant: 'destructive',
        action: (row) => revokeKey(row),
      },
    ],
    [revokeKey]
  );

  return (
    <div className="flex flex-col gap-4">
      {newPrivateKey && (
        <div className="bg-card-success border-card-success-border relative flex flex-col gap-3.5 rounded-lg border p-6">
          <Button
            htmlType="button"
            type="quaternary"
            theme="borderless"
            size="icon"
            className="absolute top-4 right-4 size-6"
            onClick={() => setNewPrivateKey(null)}>
            <CloseIcon />
          </Button>
          <div className="flex items-center gap-2.5">
            <Icon icon={ThumbsUpIcon} className="text-success relative" size={16} />
            <h4 className="text-sm font-semibold">Key created — save your private key now!</h4>
          </div>
          <p className="text-xs">
            Store this private key in a secure place. You will not be able to see it again.
          </p>
          <div className="relative rounded-md bg-[#4D63561C]">
            <pre className="max-h-48 overflow-auto p-3 font-mono text-xs break-all whitespace-pre-wrap">
              {newPrivateKey}
            </pre>
            <button
              type="button"
              className="absolute top-2 right-2 rounded-md p-1.5 transition-colors hover:bg-black/10"
              onClick={() => {
                copyToClipboard(newPrivateKey).then(() => {
                  toast.success('Copied to clipboard');
                  setKeyCopied(true);
                  setTimeout(() => setKeyCopied(false), 2000);
                });
              }}>
              {keyCopied ? (
                <CheckIcon className="size-4 text-success" />
              ) : (
                <CopyIcon className="size-4" />
              )}
            </button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={keys}
        emptyContent={{
          title: 'No keys yet.',
          subtitle: 'Add a key to allow this machine account to authenticate.',
        }}
        tableTitle={{
          title: 'Keys',
          actions: (
            <Button
              type="primary"
              theme="solid"
              size="small"
              onClick={() => keyFormDialogRef.current?.show()}>
              <Icon icon={PlusIcon} className="size-4" />
              Add Key
            </Button>
          ),
        }}
        rowActions={rowActions}
      />

      <MachineAccountKeyFormDialog
        ref={keyFormDialogRef}
        projectId={projectId ?? ''}
        machineAccountId={machineAccountId ?? ''}
        onKeyCreated={(privateKey) => {
          if (privateKey) setNewPrivateKey(privateKey);
        }}
      />
    </div>
  );
}
