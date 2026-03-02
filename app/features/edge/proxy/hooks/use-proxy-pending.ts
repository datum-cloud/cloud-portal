import { ControlPlaneStatus } from '@/resources/base';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { useMemo } from 'react';

export function useProxyPending(status: unknown): boolean {
  return useMemo(() => {
    if (!status) return true;
    return transformControlPlaneStatus(status).status === ControlPlaneStatus.Pending;
  }, [status]);
}
