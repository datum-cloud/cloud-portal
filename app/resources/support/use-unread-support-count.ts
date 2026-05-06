import { useApp } from '@/providers/app.provider';
import { useQuery } from '@tanstack/react-query';
import { createSupportService, supportKeys } from './support.service';
import { useMemo } from 'react';

const POLL_INTERVAL = 30_000;

export function useUnreadSupportCount(orgId: string): number {
  const { user } = useApp();
  const principalId = user?.sub ?? user?.email;

  const { data } = useQuery({
    queryKey: supportKeys.tickets.list(orgId),
    queryFn: () => createSupportService().listTickets(orgId),
    enabled: !!orgId,
    refetchInterval: POLL_INTERVAL,
  });

  return useMemo(() => {
    if (!principalId || !data) return 0;
    return data.filter((ticket) => {
      const lastActivity = ticket.lastActivity ?? ticket.createdAt?.toISOString();
      if (!lastActivity) return false;
      const lastRead = ticket.readState?.[principalId];
      if (!lastRead) return true;
      return new Date(lastActivity) > new Date(lastRead);
    }).length;
  }, [data, principalId]);
}
