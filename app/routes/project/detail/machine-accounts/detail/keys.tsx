import { BadgeCopy } from '@/components/badge/badge-copy';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DateTime } from '@/components/date-time';
import { createActionsColumn, Table } from '@/components/table';
import type { ActionItem } from '@/components/table';
import { KeyRevealPanel } from '@/features/machine-account/components/key-reveal-panel';
import { MachineAccountKeyFormDialog } from '@/features/machine-account/form/machine-account-key-form-dialog';
import type { MachineAccountKeyFormDialogRef } from '@/features/machine-account/form/machine-account-key-form-dialog';
import {
  useMachineAccount,
  useMachineAccountKeys,
  useMachineAccountEmailPoller,
  useRevokeMachineAccountKey,
  type CreateMachineAccountKeyResponse,
  type DatumCredentialsFile,
  type MachineAccountKey,
} from '@/resources/machine-accounts';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { ColumnDef } from '@tanstack/react-table';
import { AlertCircleIcon, Loader2Icon, PlusIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MetaFunction } from 'react-router';
import { useLocation, useNavigate, useParams } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Keys</span>,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Keys'));

export default function MachineAccountKeysPage() {
  const { projectId, machineAccountId } = useParams();
  const { confirm } = useConfirmationDialog();
  const keyFormDialogRef = useRef<MachineAccountKeyFormDialogRef>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const initialKeyResponse = (
    location.state as { keyResponse?: CreateMachineAccountKeyResponse } | null
  )?.keyResponse;

  const [newCredentials, setNewCredentials] = useState<DatumCredentialsFile | null>(
    initialKeyResponse?.credentials ?? null
  );

  // Clear the key response from location state so credentials don't reappear on back-navigation.
  useEffect(() => {
    if (initialKeyResponse) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, []);

  const { data: machineAccount } = useMachineAccount(projectId ?? '', machineAccountId ?? '');

  const pollerResult = useMachineAccountEmailPoller(
    projectId ?? '',
    machineAccountId ?? '',
    machineAccount?.identityEmail
  );

  const resolvedEmail = pollerResult.email ?? '';

  const { data: keys = [] } = useMachineAccountKeys(
    projectId ?? '',
    machineAccountId ?? '',
    resolvedEmail
  );

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

  const rowActions: ActionItem<MachineAccountKey>[] = useMemo(
    () => [
      {
        label: 'Revoke',
        variant: 'destructive',
        onClick: (row) => revokeKey(row),
      },
    ],
    [revokeKey]
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
      createActionsColumn<MachineAccountKey>(rowActions),
    ],
    [rowActions]
  );

  const isPolling = pollerResult.status === 'polling';
  const isProvisioningFailed = pollerResult.status === 'timeout' || pollerResult.status === 'error';

  return (
    <div className="flex flex-col gap-4">
      {newCredentials && machineAccount && (
        <KeyRevealPanel
          credentials={newCredentials}
          machineAccountName={machineAccount.name}
          onDismiss={() => setNewCredentials(null)}
        />
      )}

      {isPolling && (
        <div className="border-border bg-muted/50 text-muted-foreground flex items-center gap-2.5 rounded-lg border px-4 py-3 text-sm">
          <Loader2Icon className="size-4 shrink-0 animate-spin" />
          <span>Setting up account identity&hellip; This usually takes a few seconds.</span>
        </div>
      )}

      {isProvisioningFailed && (
        <div className="border-destructive/30 bg-destructive/5 flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm">
          <AlertCircleIcon className="text-destructive mt-0.5 size-4 shrink-0" />
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-destructive font-medium">Account provisioning failed</span>
            <span className="text-muted-foreground">{pollerResult.error}</span>
          </div>
          <Button
            htmlType="button"
            type="quaternary"
            theme="outline"
            size="small"
            onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      )}

      <Table.Client
        columns={columns}
        data={keys}
        title="Keys"
        search="Search"
        actions={[
          <Button
            key="add-key"
            type="primary"
            theme="solid"
            size="small"
            disabled={isPolling || isProvisioningFailed}
            title={isPolling ? 'Waiting for account provisioning to complete' : undefined}
            onClick={() => keyFormDialogRef.current?.show()}>
            <Icon icon={PlusIcon} className="size-4" />
            Add Key
          </Button>,
        ]}
      />

      <MachineAccountKeyFormDialog
        ref={keyFormDialogRef}
        projectId={projectId ?? ''}
        machineAccountId={machineAccountId ?? ''}
        machineAccountEmail={resolvedEmail}
        onKeyCreated={(response) => {
          if (response.credentials) setNewCredentials(response.credentials);
        }}
      />
    </div>
  );
}
