import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DateTime } from '@/components/date-time';
import { createActionsColumn, Table } from '@/components/table';
import { useApp } from '@/providers/app.provider';
import {
  UserActiveSession,
  createUserGqlService,
  useHydrateUserActiveSessionsGql,
  useRevokeUserActiveSessionGql,
  useUserActiveSessionsGql,
} from '@/resources/users';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { getIdTokenSession, getSession } from '@/utils/cookies';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { ColumnDef } from '@tanstack/react-table';
import { jwtDecode } from 'jwt-decode';
import { Trash2Icon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { LoaderFunctionArgs, MetaFunction, data, useLoaderData, useNavigate } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Active Sessions');
});

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await getSession(request);
    const { idToken } = await getIdTokenSession(request);

    let currentSession = null;
    if (idToken) {
      const decoded = jwtDecode<{ sid: string }>(idToken);
      currentSession = decoded.sid;
    }

    // Fetch enriched sessions through the GraphQL gateway. The gateway calls
    // milo for raw sessions and decorates each with parsed user-agent and
    // resolved geolocation before returning.
    const sessions = await createUserGqlService().listSessions(session?.sub ?? 'me');

    return data({ sessions, currentSession });
  } catch {
    return data({ sessions: [], currentSession: null });
  }
};

export default function AccountActiveSessionsPage() {
  const { user } = useApp();
  const { sessions, currentSession } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { confirm } = useConfirmationDialog();

  const [selectedSession, setSelectedSession] = useState<UserActiveSession | null>(null);

  useHydrateUserActiveSessionsGql(user?.sub ?? 'me', sessions);

  // Read from React Query cache (hydrated above for SSR→CSR continuity).
  const { data: queryData } = useUserActiveSessionsGql(user?.sub ?? 'me', {
    refetchOnMount: false,
    staleTime: QUERY_STALE_TIME,
  });

  const revokeMutation = useRevokeUserActiveSessionGql(user?.sub ?? 'me', {
    onSuccess: () => {
      if (selectedSession?.name === currentSession) {
        return navigate(paths.auth.logOut, { replace: true });
      }
      setSelectedSession(null);
    },
    onError: (error) => {
      toast.error('Session', {
        description: error.message || 'Failed to revoke session',
      });
    },
  });

  // Sort with current session first, then by createdAt descending.
  const sessionsData = useMemo(() => {
    const data = queryData ?? sessions ?? [];
    return [...data].sort((a, b) => {
      if (a.name === currentSession) return -1;
      if (b.name === currentSession) return 1;
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [queryData, sessions, currentSession]);

  const revokeSession = useCallback(
    async (session: UserActiveSession) => {
      setSelectedSession(session);
      await confirm({
        title: 'Revoke Session',
        description: (
          <span>
            Are you sure you want to revoke the session for {session.ip ?? 'this device'}?
          </span>
        ),
        submitText: 'Revoke',
        cancelText: 'Cancel',
        variant: 'destructive',
        showConfirmInput: false,
        onSubmit: async () => {
          revokeMutation.mutate(session.name);
        },
      });
    },
    [confirm, revokeMutation]
  );

  const columns: ColumnDef<UserActiveSession>[] = useMemo(
    () => [
      {
        header: 'IP',
        accessorKey: 'ip',
        id: 'ip',
        meta: { className: 'min-w-[140px]' },
        cell: ({ row }) => (
          <div className="flex items-center justify-between gap-2">
            <span className="text-foreground text-xs font-medium">{row.original.ip ?? '-'}</span>
            {row.original.name === currentSession && (
              <Badge
                type="quaternary"
                theme="outline"
                className="rounded-[8px] px-[7px] font-normal">
                Current session
              </Badge>
            )}
          </div>
        ),
      },
      {
        header: 'Location',
        accessorKey: 'location.formatted',
        id: 'location',
        meta: { className: 'min-w-[160px]' },
        cell: ({ row }) => (
          <span className="text-foreground text-xs">{row.original.location?.formatted ?? '-'}</span>
        ),
      },
      {
        header: 'Device',
        accessorKey: 'userAgent.formatted',
        id: 'userAgent',
        meta: { className: 'min-w-[160px]' },
        cell: ({ row }) => (
          <span className="text-foreground text-xs">
            {row.original.userAgent?.formatted ?? '-'}
          </span>
        ),
      },
      {
        header: 'Created At',
        accessorKey: 'createdAt',
        id: 'createdAt',
        meta: { className: 'min-w-[120px]' },
        cell: ({ row }) => {
          return row.original.createdAt ? <DateTime date={row.original.createdAt} /> : '-';
        },
      },
      {
        header: 'Last Updated',
        accessorKey: 'lastUpdatedAt',
        id: 'lastUpdatedAt',
        meta: { className: 'min-w-[120px]' },
        cell: ({ row }) => {
          return row.original.lastUpdatedAt ? <DateTime date={row.original.lastUpdatedAt} /> : '-';
        },
      },
      createActionsColumn<UserActiveSession>([
        {
          label: 'Revoke',
          icon: <Icon icon={Trash2Icon} className="size-3.5" />,
          onClick: (session) => revokeSession(session),
        },
      ]),
    ],
    [currentSession, revokeSession]
  );

  return <Table.Client columns={columns} data={sessionsData} empty="No active sessions found." />;
}
