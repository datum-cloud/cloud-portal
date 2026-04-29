import { DateTime } from '@/components/date-time';
import { createActionsColumn, Table } from '@/components/table';
import { useApp } from '@/providers/app.provider';
import {
  UserActiveSession,
  useRevokeUserActiveSessionGql,
  useUserActiveSessionsGql,
} from '@/resources/users';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { getIdTokenSession } from '@/utils/cookies';
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
    const { idToken } = await getIdTokenSession(request);

    let currentSession: string | null = null;
    if (idToken) {
      const decoded = jwtDecode<{ sid: string }>(idToken);
      currentSession = decoded.sid;
    }

    return data({ currentSession });
  } catch {
    return data({ currentSession: null });
  }
};

export default function AccountActiveSessionsPage() {
  const { user } = useApp();
  const { currentSession } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const [selectedSession, setSelectedSession] = useState<UserActiveSession | null>(null);

  // Fetch sessions client-side via React Query.
  const { data: queryData, isLoading } = useUserActiveSessionsGql(user?.sub ?? 'me', {
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
    const data = queryData ?? [];
    return [...data].sort((a, b) => {
      if (a.name === currentSession) return -1;
      if (b.name === currentSession) return 1;
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [queryData, currentSession]);

  const revokeSession = useCallback(
    (session: UserActiveSession) => {
      setSelectedSession(session);
      revokeMutation.mutate(session.name);
    },
    [revokeMutation]
  );

  const columns: ColumnDef<UserActiveSession>[] = useMemo(
    () => [
      {
        header: 'Device',
        accessorKey: 'userAgent.formatted',
        id: 'userAgent',
        meta: { className: 'min-w-[160px]' },
        cell: ({ row }) => (
          <span className="text-foreground flex items-center justify-between text-xs">
            {row.original.userAgent?.formatted ?? '-'}

            {row.original.name === currentSession && (
              <Badge
                type="quaternary"
                theme="outline"
                className="rounded-[8px] px-[7px] font-normal"
                data-e2e="current-session-badge">
                Current session
              </Badge>
            )}
          </span>
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
          display: 'inline',
          showLabel: false,
          tooltip: 'Revoke',
          variant: 'default',
          icon: <Icon icon={Trash2Icon} className="size-3.5" />,
          // Only disable the row whose mutation is in flight — leaves the
          // current session locked out as before, and lets other rows stay
          // clickable while one revoke is pending.
          disabled: (row) =>
            row.name === currentSession ||
            (revokeMutation.isPending && selectedSession?.name === row.name),
          onClick: (row) => revokeSession(row),
          'data-e2e': 'revoke-session-button',
        },
      ]),
    ],
    [currentSession, revokeMutation.isPending, selectedSession, revokeSession]
  );

  return (
    <Table.Client
      columns={columns}
      data={sessionsData}
      loading={isLoading}
      empty="No active sessions found."
    />
  );
}
