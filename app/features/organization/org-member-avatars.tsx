import { AvatarStack } from '@/components/avatar-stack';
import { useMembers } from '@/resources/members';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { useMemo } from 'react';

/**
 * Overlapping member avatars for an organization row. Renders nothing until
 * members resolve (or when there are none), so it never reserves empty space.
 */
export function OrganizationMemberAvatars({ orgId }: { orgId: string }) {
  const { data: members = [] } = useMembers(orgId, { staleTime: QUERY_STALE_TIME });

  const items = useMemo(
    () =>
      members.map((member) => ({
        name:
          `${member.user.givenName ?? ''} ${member.user.familyName ?? ''}`.trim() ||
          member.user.email ||
          member.name,
        avatarUrl: member.user.avatarUrl,
      })),
    [members]
  );

  return <AvatarStack items={items} max={5} />;
}
