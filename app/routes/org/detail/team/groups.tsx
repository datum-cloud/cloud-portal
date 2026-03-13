import { AvatarStack } from '@/components/avatar-stack';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DataTable } from '@/modules/datum-ui/components/data-table';
import { useHasPermission } from '@/modules/rbac';
import { useGroupMemberships } from '@/resources/group-memberships';
import { useGroups, useDeleteGroup } from '@/resources/groups';
import { useMembers } from '@/resources/members';
import { buildOrganizationNamespace } from '@/utils/common';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Badge, Button, toast } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowRightIcon, PlusIcon, TrashIcon } from 'lucide-react';
import { useMemo, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Groups</span>,
};

interface GroupRow {
  name: string;
  memberCount: number;
  members: { name: string; avatarUrl?: string }[];
}

function buildMemberSummary(members: { name: string }[], totalCount: number): string {
  if (members.length === 0) return '';
  const firstNames = members.slice(0, 2).map((m) => m.name.split(' ')[0]);
  const remaining = totalCount - firstNames.length;
  if (remaining <= 0) return firstNames.join(' and ');
  return `${firstNames.join(', ')}, and ${remaining} more`;
}

export default function GroupsPage() {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const { confirm } = useConfirmationDialog();

  if (!orgId) {
    throw new Error('Organization ID is required');
  }

  const { data: groups = [], isLoading: groupsLoading } = useGroups(orgId, {
    staleTime: 5 * 60 * 1000,
  });
  const { data: memberships = [], isLoading: membershipsLoading } = useGroupMemberships(orgId, {
    staleTime: 5 * 60 * 1000,
  });
  const { data: members = [], isLoading: membersLoading } = useMembers(orgId, {
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = groupsLoading || membershipsLoading || membersLoading;

  const { hasPermission: hasCreateGroupPermission } = useHasPermission('groups', 'create', {
    namespace: buildOrganizationNamespace(orgId),
    group: 'iam.miloapis.com',
  });

  const { hasPermission: hasDeleteGroupPermission } = useHasPermission('groups', 'delete', {
    namespace: buildOrganizationNamespace(orgId),
    group: 'iam.miloapis.com',
  });

  const deleteGroupMutation = useDeleteGroup(orgId, {
    onSuccess: () => toast.success('Group deleted successfully'),
    onError: (error) => toast.error(error.message || 'Failed to delete group'),
  });

  const groupRows = useMemo<GroupRow[]>(() => {
    return groups.map((group) => {
      const groupMbrs = memberships.filter((m) => m.groupRef.name === group.name);
      const resolved = groupMbrs
        .map((gm) => members.find((m) => m.user.id === gm.userRef.name))
        .filter(Boolean)
        .map((m) => ({
          name:
            `${m!.user.givenName ?? ''} ${m!.user.familyName ?? ''}`.trim() ||
            m!.user.email ||
            m!.user.id,
          avatarUrl: m!.user.avatarUrl,
        }));
      return {
        name: group.name,
        memberCount: groupMbrs.length,
        members: resolved,
      };
    });
  }, [groups, memberships, members]);

  const deleteGroup = useCallback(
    async (row: GroupRow) => {
      await confirm({
        title: 'Delete Group',
        description: (
          <span>
            Are you sure you want to delete group <strong>{row.name}</strong>?
          </span>
        ),
        submitText: 'Delete',
        cancelText: 'Cancel',
        variant: 'destructive',
        showConfirmInput: false,
        onSubmit: async () => {
          await deleteGroupMutation.mutateAsync(row.name);
        },
      });
    },
    [confirm, deleteGroupMutation]
  );

  const columns: ColumnDef<GroupRow>[] = useMemo(
    () => [
      {
        header: 'Group Name',
        accessorKey: 'name',
        enableSorting: false,
        cell: ({ row }) => <span className="text-sm font-semibold">{row.original.name}</span>,
      },
      {
        header: 'Members',
        id: 'members',
        enableSorting: false,
        cell: ({ row }) => {
          if (row.original.memberCount === 0) {
            return <span className="text-muted-foreground text-xs">&mdash;</span>;
          }
          const summaryText = buildMemberSummary(row.original.members, row.original.memberCount);
          return (
            <div className="flex items-center gap-3">
              <AvatarStack items={row.original.members} max={4} size="xs" />
              <Badge type="quaternary" theme="outline" className="rounded-xl px-2 text-xs">
                {row.original.memberCount}
              </Badge>
              <span className="text-muted-foreground text-sm">{summaryText}</span>
            </div>
          );
        },
      },
    ],
    []
  );

  const rowActions = useMemo(
    () => [
      {
        key: 'delete',
        label: 'Delete group',
        variant: 'destructive' as const,
        icon: <Icon icon={TrashIcon} className="size-4" />,
        hidden: (row: GroupRow) => !hasDeleteGroupPermission || row.memberCount > 0,
        action: (row: GroupRow) => deleteGroup(row),
      },
    ],
    [hasDeleteGroupPermission, deleteGroup]
  );

  return (
    <DataTable
      isLoading={isLoading}
      columns={columns}
      data={groupRows}
      tableTitle={{
        title: 'Groups',
        actions: hasCreateGroupPermission && (
          <Link to={getPathWithParams(paths.org.detail.team.groupCreate, { orgId })}>
            <Button>
              <Icon icon={PlusIcon} className="size-4" />
              Create Group
            </Button>
          </Link>
        ),
      }}
      toolbar={{
        layout: 'compact',
        includeSearch: { placeholder: 'Search groups' },
      }}
      rowActions={rowActions}
      onRowClick={(row) =>
        navigate(getPathWithParams(paths.org.detail.team.groupDetail, { orgId, groupId: row.name }))
      }
      emptyContent={{
        title: 'No groups yet',
        actions: hasCreateGroupPermission
          ? [
              {
                type: 'link',
                label: 'Create a group',
                to: getPathWithParams(paths.org.detail.team.groupCreate, { orgId }),
                variant: 'default',
                icon: <Icon icon={ArrowRightIcon} className="size-4" />,
                iconPosition: 'end',
              },
            ]
          : [],
      }}
    />
  );
}
