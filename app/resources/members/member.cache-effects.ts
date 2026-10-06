import { memberKeys } from './member.service';
import { organizationKeys } from '@/resources/organizations/organization.service';
import type { QueryClient } from '@tanstack/react-query';

/** Members and organizations have no watch, so their mutations invalidate. */
export const memberCacheEffects = {
  async changed(qc: QueryClient, orgId: string): Promise<void> {
    await Promise.all([
      qc.invalidateQueries({ queryKey: memberKeys.list(orgId) }),
      qc.invalidateQueries({ queryKey: [...memberKeys.details(), orgId] }),
    ]);
  },
};

export const organizationCacheEffects = {
  async membershipChanged(qc: QueryClient): Promise<void> {
    await qc.invalidateQueries({ queryKey: organizationKeys.lists() });
  },
};
