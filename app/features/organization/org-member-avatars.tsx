import { AvatarStack } from '@/components/avatar-stack';
import { useMembers } from '@/resources/members';
import { useMemo } from 'react';

/**
 * One per org row, so the unwatched-list defaults would refetch N member lists
 * on every tab return. Avatars can lag; the members page fetches its own copy.
 */
export const MEMBER_AVATARS_QUERY_OPTIONS = {
  staleTime: 5 * 60_000,
  refetchOnWindowFocus: false,
} as const;

/**
 * Overlapping member avatars for an organization row. Renders nothing until
 * members resolve (or when there are none), so it never reserves empty space.
 */
export function OrganizationMemberAvatars({ orgId }: { orgId: string }) {
  const { data: members = [] } = useMembers(orgId, MEMBER_AVATARS_QUERY_OPTIONS);

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
