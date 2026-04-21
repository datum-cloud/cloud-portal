import { ManageMembersDialog } from './manage-members-dialog';
import { AvatarStack } from '@/components/avatar-stack';
import { useHasPermission } from '@/modules/rbac';
import { useGroupMemberships } from '@/resources/group-memberships';
import type { Group } from '@/resources/groups';
import { useMembers, type Member } from '@/resources/members';
import { buildOrganizationNamespace } from '@/utils/common';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { getMemberDisplayName } from '@/utils/helpers/member.helper';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { UsersRoundIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

interface GroupHeaderProps {
  group: Group;
  orgId: string;
}

export function GroupHeader({ group, orgId }: GroupHeaderProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { hasPermission: canManageMembers } = useHasPermission('groupmemberships', 'create', {
    namespace: buildOrganizationNamespace(orgId),
    group: 'iam.miloapis.com',
  });

  const { data: memberships = [] } = useGroupMemberships(orgId, {
    staleTime: QUERY_STALE_TIME,
  });
  const { data: members = [] } = useMembers(orgId, {
    staleTime: QUERY_STALE_TIME,
  });

  const { memberCount, avatarItems } = useMemo(() => {
    const groupMbrs = memberships.filter((m) => m.groupRef.name === group.name);
    const resolved = groupMbrs
      .map((gm) => members.find((m) => m.user.id === gm.userRef.name))
      .filter((m): m is Member => m !== undefined)
      .map((m) => ({
        name: getMemberDisplayName(m),
        avatarUrl: m.user.avatarUrl,
      }));
    return { memberCount: groupMbrs.length, avatarItems: resolved };
  }, [memberships, members, group.name]);

  return (
    <>
      <div data-testid="group-header" className="flex items-center gap-5 pb-2">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-100">
          <Icon icon={UsersRoundIcon} className="size-7 text-emerald-600" />
        </div>

        <div className="flex flex-col gap-1">
          <h1 className="text-foreground text-lg font-semibold">{group.name}</h1>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="font-medium">Group</span>
            <span className="bg-border inline-block size-1 rounded-full" />
            <span>
              {memberCount} member{memberCount !== 1 ? 's' : ''}
            </span>
            {avatarItems.length > 0 && (
              <>
                <span className="bg-border inline-block size-1 rounded-full" />
                <AvatarStack items={avatarItems} max={4} size="xs" />
              </>
            )}
            {canManageMembers && (
              <>
                <span className="bg-border inline-block size-1 rounded-full" />
                <button
                  type="button"
                  onClick={() => setDialogOpen(true)}
                  className="text-primary font-medium hover:underline">
                  Manage Members
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <ManageMembersDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        groupName={group.name}
        groupNamespace={buildOrganizationNamespace(orgId)}
        orgId={orgId}
      />
    </>
  );
}
