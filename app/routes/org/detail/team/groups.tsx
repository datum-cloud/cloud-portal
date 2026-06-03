import { AvatarStack } from '@/components/avatar-stack';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { createActionsColumn, Table } from '@/components/table';
import { GroupFormDialog, type GroupFormDialogRef } from '@/features/organization/team/groups';
import { PermissionButton, useResourcePermissions } from '@/modules/rbac';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runListLoader } from '@/modules/rbac/run-resource-loader';
import { useGroupMemberships } from '@/resources/group-memberships';
import { createGroupService, useGroups, useDeleteGroup, type Group } from '@/resources/groups';
import { useMembers, type Member } from '@/resources/members';
import { buildOrganizationNamespace } from '@/utils/common';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { getMemberDisplayName } from '@/utils/helpers/member.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { ColumnDef } from '@tanstack/react-table';
import { PlusIcon, TrashIcon } from 'lucide-react';
import { useMemo, useCallback, useRef } from 'react';
import { type LoaderFunctionArgs, useNavigate, useParams } from 'react-router';

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

const route = defineResourceRoute<Group[]>({
  type: 'list',
  resource: 'groups',
  restrictedTitle: 'Access restricted',
  restrictedMessage: "You don't have permission to view groups.",
  metaTitle: 'Groups',
});

export const loader = (args: LoaderFunctionArgs) =>
  runListLoader<Group[]>(args, {
    resource: 'groups',
    group: 'iam.miloapis.com',
    scope: 'org',
    namespace: buildOrganizationNamespace(args.params.orgId!),
    fetch: ({ orgId }) => createGroupService().list(orgId!),
  });
export const meta = route.meta;

export default route.Page(({ data: initialGroups }) => (
  <GroupsInner initialGroups={initialGroups} />
));

function GroupsInner({ initialGroups }: { initialGroups: Group[] }) {
  const { orgId = '' } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { confirm } = useConfirmationDialog();
  const groupFormDialogRef = useRef<GroupFormDialogRef>(null);

  const { canCreate, canDelete } = useResourcePermissions({
    resource: 'groups',
    group: 'iam.miloapis.com',
    scope: 'org',
    verbs: ['create', 'delete'],
  });

  const { data: groups = initialGroups } = useGroups(orgId, {
    staleTime: QUERY_STALE_TIME,
    initialData: initialGroups,
    initialDataUpdatedAt: Date.now(),
    refetchOnMount: false,
  });
  const { data: memberships = [] } = useGroupMemberships(orgId, {
    staleTime: QUERY_STALE_TIME,
  });
  const { data: members = [] } = useMembers(orgId, {
    staleTime: QUERY_STALE_TIME,
  });

  const { mutateAsync: deleteGroupAsync } = useDeleteGroup(orgId, {
    onError: (error) => toast.error(error.message || 'Failed to delete group'),
  });

  const groupRows = useMemo<GroupRow[]>(() => {
    return groups.map((group) => {
      const groupMbrs = memberships.filter((m) => m.groupRef.name === group.name);
      const resolved = groupMbrs
        .map((gm) => members.find((m) => m.user.id === gm.userRef.name))
        .filter((m): m is Member => m !== undefined)
        .map((m) => ({
          name: getMemberDisplayName(m),
          avatarUrl: m.user.avatarUrl,
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
          await deleteGroupAsync(row.name);
        },
      });
    },
    [confirm, deleteGroupAsync]
  );

  const columns: ColumnDef<GroupRow>[] = useMemo(
    () => [
      {
        header: 'Group Name',
        accessorKey: 'name',
        enableSorting: false,
        cell: ({ row }) => (
          <button
            type="button"
            className="w-full text-left"
            onClick={() =>
              navigate(
                getPathWithParams(paths.org.detail.team.groupDetail, {
                  orgId,
                  groupId: row.original.name,
                })
              )
            }>
            <span className="text-sm font-semibold">{row.original.name}</span>
          </button>
        ),
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
      createActionsColumn<GroupRow>([
        {
          key: 'delete',
          label: 'Delete group',
          variant: 'destructive',
          icon: <Icon icon={TrashIcon} className="size-4" />,
          hidden: (row) => !canDelete || row.memberCount > 0,
          onClick: (row) => deleteGroup(row),
        },
      ]),
    ],
    [canDelete, deleteGroup, navigate, orgId]
  );

  return (
    <>
      <Table.Client
        columns={columns}
        data={groupRows}
        search="Search"
        onRowClick={(row) =>
          navigate(
            getPathWithParams(paths.org.detail.team.groupDetail, { orgId, groupId: row.name })
          )
        }
        empty={{
          title: 'create your first group',
          actions: [
            {
              type: 'button',
              label: 'Create Group',
              onClick: () => groupFormDialogRef.current?.show(),
              icon: <Icon icon={PlusIcon} className="size-3" />,
              disabled: !canCreate,
              tooltip: !canCreate ? "You don't have permission to create groups" : undefined,
            },
          ],
        }}
        actions={[
          <PermissionButton
            key="create"
            resource="groups"
            verb="create"
            group="iam.miloapis.com"
            scope="org"
            deniedReason="You don't have permission to create groups"
            onClick={() => groupFormDialogRef.current?.show()}
            className="w-full sm:w-auto">
            <Icon icon={PlusIcon} className="size-4" />
            Create Group
          </PermissionButton>,
        ]}
      />
      <GroupFormDialog
        ref={groupFormDialogRef}
        orgId={orgId}
        onCreated={(groupName) =>
          navigate(
            getPathWithParams(paths.org.detail.team.groupDetail, { orgId, groupId: groupName })
          )
        }
      />
    </>
  );
}
