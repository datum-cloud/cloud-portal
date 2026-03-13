import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { ProfileIdentity } from '@/components/profile-identity';
import { DataTable } from '@/modules/datum-ui/components/data-table';
import { useHasPermission } from '@/modules/rbac';
import { useApp } from '@/providers/app.provider';
import { useCancelInvitation, useResendInvitation, useInvitations } from '@/resources/invitations';
import { useRemoveMember, useLeaveOrganization, useMembers } from '@/resources/members';
import { buildOrganizationNamespace } from '@/utils/common';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Badge, Button, Tooltip, toast } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowRightIcon, Redo2Icon, TrashIcon, UserIcon, UserPlusIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

interface ITeamMember {
  id: string;
  fullName?: string;
  email: string;
  roles?: {
    name: string;
    namespace?: string;
    displayName?: string;
    description?: string;
  }[];
  invitationState?: 'Pending' | 'Accepted' | 'Declined';
  type: 'member' | 'invitation';
  name?: string;
  avatarUrl?: string;
}

export default function OrgTeamPage() {
  const { orgId } = useParams();
  const { user } = useApp();
  const navigate = useNavigate();

  if (!orgId) {
    throw new Error('Organization ID is required');
  }

  const { data: members = [], isLoading: membersLoading } = useMembers(orgId, {
    staleTime: QUERY_STALE_TIME,
  });
  const { data: invitations = [], isLoading: invitationsLoading } = useInvitations(orgId, {
    staleTime: QUERY_STALE_TIME,
  });

  const isLoading = membersLoading || invitationsLoading;

  const memberTeamMembers: ITeamMember[] = useMemo(() => {
    return members.map((member) => ({
      id: member.user.id,
      fullName: `${member.user.givenName ?? ''} ${member.user.familyName ?? ''}`.trim(),
      email: member.user.email ?? '',
      roles: member.roles?.map((role) => ({
        name: role.name,
        namespace: role.namespace ?? 'datum-cloud',
      })),
      type: 'member' as const,
      name: member.name,
      avatarUrl: member.user.avatarUrl,
    }));
  }, [members]);

  const invitationTeamMembers: ITeamMember[] = useMemo(() => {
    return invitations
      .filter((invitation) => invitation.state === 'Pending')
      .map((invitation) => ({
        id: invitation.name,
        fullName: invitation.email ?? '',
        email: invitation.email ?? '',
        roles: invitation.role ? [{ name: invitation.role, namespace: 'datum-cloud' }] : [],
        invitationState: invitation.state,
        type: 'invitation' as const,
        name: invitation.name,
      }));
  }, [invitations]);

  const teamMembers: ITeamMember[] = useMemo(() => {
    return [...memberTeamMembers, ...invitationTeamMembers];
  }, [memberTeamMembers, invitationTeamMembers]);

  const { confirm } = useConfirmationDialog();

  const cancelInvitationMutation = useCancelInvitation(orgId, {
    onSuccess: () => toast.success('Invitation cancelled successfully'),
    onError: (error) => toast.error(error.message || 'Failed to cancel invitation'),
  });

  const resendInvitationMutation = useResendInvitation(orgId, {
    onSuccess: () => toast.success('Invitation resent successfully'),
    onError: (error) => toast.error(error.message || 'Failed to resend invitation'),
  });

  const removeMemberMutation = useRemoveMember(orgId, {
    onSuccess: () => toast.success('Member removed successfully'),
    onError: (error) => toast.error(error.message || 'Failed to remove member'),
  });

  const leaveOrganizationMutation = useLeaveOrganization({
    onSuccess: () => navigate(paths.account.organizations.root),
    onError: (error) => toast.error(error.message || 'Failed to leave organization'),
  });

  const orderedTeamMembers = useMemo(() => {
    if (!user?.email) return teamMembers;
    const cloned = [...teamMembers];
    cloned.sort((a, b) => {
      const aIsCurrent = a.type === 'member' && a.email === user.email ? 0 : 1;
      const bIsCurrent = b.type === 'member' && b.email === user.email ? 0 : 1;
      return aIsCurrent - bIsCurrent;
    });
    return cloned;
  }, [teamMembers, user?.email]);

  const { hasPermission: hasRemoveMemberPermission } = useHasPermission(
    'organizationmemberships',
    'delete',
    {
      namespace: buildOrganizationNamespace(orgId),
      group: 'resourcemanager.miloapis.com',
    }
  );

  const { hasPermission: hasInviteMemberPermission } = useHasPermission(
    'userinvitations',
    'create',
    {
      namespace: buildOrganizationNamespace(orgId),
      group: 'iam.miloapis.com',
    }
  );

  const isLastOwner = useMemo(() => {
    if (!user?.email) return false;
    const currentUserMember = teamMembers.find(
      (member) => member.type === 'member' && member.email === user.email
    );
    if (!currentUserMember) return false;
    const ownerRoles = ['owner', 'datum-cloud-owner'];
    const isOwner = currentUserMember.roles?.some((role) =>
      ownerRoles.includes(role.name.toLowerCase())
    );
    if (!isOwner) return false;
    const ownerCount = teamMembers.filter(
      (member) =>
        member.type === 'member' &&
        member.roles?.some((role) => ownerRoles.includes(role.name.toLowerCase()))
    ).length;
    return ownerCount === 1;
  }, [teamMembers, user?.email]);

  const cancelInvitation = async (row: ITeamMember) => {
    await confirm({
      title: 'Cancel Invitation',
      description: (
        <span>
          Are you sure you want to cancel the invitation for&nbsp;
          <strong>{row.email}</strong>?
        </span>
      ),
      submitText: 'Cancel',
      cancelText: 'Close',
      variant: 'destructive',
      showConfirmInput: false,
      onSubmit: async () => cancelInvitationMutation.mutate(row.id),
    });
  };

  const removeMember = async (row: ITeamMember) => {
    await confirm({
      title: 'Remove Member',
      description: (
        <span>
          Are you sure you want to remove&nbsp;
          <strong>
            {row.fullName} ({row.email})
          </strong>{' '}
          from the organization?
        </span>
      ),
      submitText: 'Remove',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: false,
      onSubmit: async () => removeMemberMutation.mutate(row.name ?? ''),
    });
  };

  const leaveTeam = async (row: ITeamMember) => {
    await confirm({
      title: 'Leave Organization',
      description: (
        <span>
          Are you sure you want to leave this organization? You will lose access to all organization
          resources and will need to be re-invited to rejoin.
        </span>
      ),
      submitText: 'Leave',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: false,
      onSubmit: async () => leaveOrganizationMutation.mutate({ orgId, memberName: row.name ?? '' }),
    });
  };

  const columns: ColumnDef<ITeamMember>[] = useMemo(
    () => [
      {
        header: 'User',
        id: 'user',
        accessorKey: 'fullName',
        enableSorting: false,
        cell: ({ row }) => {
          const name = row.original.fullName ?? row.original.email;
          return (
            <div className="flex w-full items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <ProfileIdentity
                  avatarSrc={row.original.avatarUrl}
                  className="min-w-48"
                  fallbackIcon={row.original.type === 'invitation' ? UserIcon : undefined}
                  name={name}
                  subtitle={row.original.type === 'member' ? row.original.email : undefined}
                  size="xs"
                />
                {row.original.email === user?.email && (
                  <Badge
                    type="quaternary"
                    theme="outline"
                    className="rounded-xl px-2.5 text-[13px] font-normal">
                    You
                  </Badge>
                )}
              </div>
              {row.original.type === 'invitation' && (
                <Badge
                  type={row.original.invitationState === 'Pending' ? 'warning' : 'primary'}
                  theme={row.original.invitationState === 'Pending' ? 'light' : 'solid'}>
                  {row.original.invitationState === 'Pending'
                    ? 'Invited'
                    : row.original.invitationState}
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => {
          const isSelf = row.original.email === user?.email;

          // Invitation row — resend + cancel
          if (row.original.type === 'invitation') {
            return (
              <div className="flex justify-end gap-2">
                <Button
                  type="quaternary"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    resendInvitationMutation.mutate(row.original.id);
                  }}>
                  <Icon icon={Redo2Icon} className="size-3.5" />
                  Resend
                </Button>
                <Button
                  type="quaternary"
                  className="text-destructive hover:text-destructive"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    cancelInvitation(row.original);
                  }}>
                  <Icon icon={TrashIcon} className="size-3.5" />
                  Cancel
                </Button>
              </div>
            );
          }

          // Current user — leave button
          if (isSelf) {
            const leaveBtn = (
              <Button
                type="quaternary"
                size="small"
                disabled={isLastOwner}
                onClick={(e) => {
                  e.stopPropagation();
                  leaveTeam(row.original);
                }}>
                Leave
              </Button>
            );
            if (isLastOwner) {
              return (
                <div className="flex justify-end">
                  <Tooltip
                    message={
                      <span>
                        You are the last owner. To leave, first assign
                        <br /> ownership to another member.
                      </span>
                    }>
                    {leaveBtn}
                  </Tooltip>
                </div>
              );
            }
            return <div className="flex justify-end">{leaveBtn}</div>;
          }

          // Other members — remove button
          if (!hasRemoveMemberPermission) return null;
          return (
            <div className="flex justify-end">
              <Button
                type="quaternary"
                className="text-destructive hover:text-destructive"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  removeMember(row.original);
                }}>
                <Icon icon={TrashIcon} className="size-3.5" />
                Remove
              </Button>
            </div>
          );
        },
      },
    ],
    [user?.email, hasRemoveMemberPermission, isLastOwner]
  );

  return (
    <DataTable
      isLoading={isLoading}
      columns={columns}
      data={orderedTeamMembers}
      tableTitle={{
        title: 'Team',
        actions: hasInviteMemberPermission && (
          <Link to={getPathWithParams(paths.org.detail.team.invite, { orgId })}>
            <Button>
              <Icon icon={UserPlusIcon} className="size-4" />
              Invite Member
            </Button>
          </Link>
        ),
      }}
      toolbar={{
        layout: 'compact',
        includeSearch: { placeholder: 'Search team members' },
      }}
      onRowClick={(row) => {
        if (row.type !== 'member') return;
        navigate(
          getPathWithParams(paths.org.detail.team.roles, {
            orgId,
            memberId: row.name ?? '',
          })
        );
      }}
      emptyContent={{
        title: "Looks like you don't have any team members added yet",
        actions: [
          {
            type: 'link',
            label: 'Invite a team member',
            to: getPathWithParams(paths.org.detail.team.invite, { orgId }),
            variant: 'default',
            icon: <Icon icon={ArrowRightIcon} className="size-4" />,
            iconPosition: 'end',
          },
        ],
      }}
    />
  );
}
