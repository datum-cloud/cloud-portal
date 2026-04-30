import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { ProfileIdentity } from '@/components/profile-identity';
import { createActionsColumn, Table } from '@/components/table';
import { useHasPermission } from '@/modules/rbac';
import { useApp } from '@/providers/app.provider';
import { useCancelInvitation, useResendInvitation, useInvitations } from '@/resources/invitations';
import { useRemoveMember, useLeaveOrganization, useMembers } from '@/resources/members';
import { buildOrganizationNamespace } from '@/utils/common';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { ColumnDef } from '@tanstack/react-table';
import { Redo2Icon, TrashIcon, UserIcon, UserPlusIcon } from 'lucide-react';
import { useMemo, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

// Generic interface for combined team data
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

  const { data: members = [] } = useMembers(orgId, {
    staleTime: QUERY_STALE_TIME,
  });
  const { data: invitations = [] } = useInvitations(orgId, {
    staleTime: QUERY_STALE_TIME,
  });

  // Transform members to team members format
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

  // Transform invitations to team members format
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

  // Combine members and invitations
  const teamMembers: ITeamMember[] = useMemo(() => {
    return [...memberTeamMembers, ...invitationTeamMembers];
  }, [memberTeamMembers, invitationTeamMembers]);
  const { confirm } = useConfirmationDialog();

  // Mutation hooks
  const cancelInvitationMutation = useCancelInvitation(orgId, {
    onError: (error) => {
      toast.error(error.message || 'Failed to cancel invitation');
    },
  });

  const resendInvitationMutation = useResendInvitation(orgId, {
    onSuccess: () => {
      toast.success('Invitation resent successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to resend invitation');
    },
  });

  const removeMemberMutation = useRemoveMember(orgId, {
    onError: (error) => {
      toast.error(error.message || 'Failed to remove member');
    },
  });

  const leaveOrganizationMutation = useLeaveOrganization({
    onSuccess: () => {
      navigate(paths.account.organizations.root);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to leave organization');
    },
  });

  const orderedTeamMembers = useMemo(() => {
    if (!user?.email) return teamMembers;
    const cloned = [...(teamMembers ?? [])];
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

  // Check if current user is the last owner
  const isLastOwner = useMemo(() => {
    if (!user?.email) return false;

    // Find current user's member record
    const currentUserMember = teamMembers.find(
      (member) => member.type === 'member' && member.email === user.email
    );

    if (!currentUserMember) return false;

    const ownerRoles = ['owner', 'datum-cloud-owner'];

    // Check if user has owner role
    const isOwner = currentUserMember.roles?.some((role) =>
      ownerRoles.includes(role.name.toLowerCase())
    );

    if (!isOwner) return false;

    // Count total owners in the organization (members only, not invitations)
    const ownerCount = teamMembers.filter((member) => {
      if (member.type !== 'member') return false;
      return member.roles?.some((role) => ownerRoles.includes(role.name.toLowerCase()));
    }).length;

    return ownerCount === 1; // True if user is the only owner
  }, [teamMembers, user?.email]);

  const cancelInvitation = useCallback(
    async (row: ITeamMember) => {
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
        onSubmit: async () => {
          cancelInvitationMutation.mutate(row?.id ?? '');
        },
      });
    },
    [confirm, cancelInvitationMutation]
  );

  const resendInvitation = useCallback(
    async (id: string) => {
      resendInvitationMutation.mutate(id);
    },
    [resendInvitationMutation]
  );

  const removeMember = useCallback(
    async (row: ITeamMember) => {
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
        onSubmit: async () => {
          removeMemberMutation.mutate(row?.name ?? '');
        },
      });
    },
    [confirm, removeMemberMutation]
  );

  const leaveTeam = useCallback(
    async (row: ITeamMember) => {
      await confirm({
        title: 'Leave Organization',
        description: (
          <span>
            Are you sure you want to leave this organization? You will lose access to all
            organization resources and will need to be re-invited to rejoin.
          </span>
        ),
        submitText: 'Leave',
        cancelText: 'Cancel',
        variant: 'destructive',
        showConfirmInput: false,
        onSubmit: async () => {
          leaveOrganizationMutation.mutate({
            orgId,
            memberName: row?.name ?? '',
          });
        },
      });
    },
    [confirm, leaveOrganizationMutation, orgId]
  );

  const columns: ColumnDef<ITeamMember>[] = useMemo(() => {
    return [
      {
        header: 'User',
        id: 'user',
        accessorKey: 'fullName',
        enableSorting: false,
        cell: ({ row }) => {
          const name = row.original.fullName ?? row.original.email;
          const subtitle = row.original.email;

          return (
            <div className="flex w-full items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <ProfileIdentity
                  avatarSrc={row.original.avatarUrl}
                  className="min-w-48"
                  fallbackIcon={row.original.type === 'invitation' ? UserIcon : undefined}
                  name={name}
                  subtitle={row.original.type === 'member' ? subtitle : undefined}
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
      createActionsColumn<ITeamMember>((row) => [
        // Resend invitation (for pending invites only)
        {
          key: 'resend',
          label: 'Resend',
          display: 'inline',
          icon: <Icon icon={Redo2Icon} className="size-4" />,
          hidden: row.type !== 'invitation' || row.invitationState !== 'Pending',
          onClick: (r) => resendInvitation(r.id),
          'data-e2e': 'resend-invitation-button',
        },
        // Cancel invitation (for invites only)
        {
          key: 'cancel',
          label: 'Cancel',
          display: 'inline',
          variant: 'destructive' as const,
          icon: <Icon icon={TrashIcon} className="size-4" />,
          hidden: row.type !== 'invitation',
          onClick: (r) => cancelInvitation(r),
          'data-e2e': 'cancel-invitation-button',
        },
        // Remove member (for OTHER members, not self)
        {
          key: 'remove',
          label: 'Remove member',
          display: 'inline',
          variant: 'destructive' as const,
          icon: <Icon icon={TrashIcon} className="size-4" />,
          hidden: row.type !== 'member' || row.email === user?.email || !hasRemoveMemberPermission,
          onClick: (r) => removeMember(r),
        },
        // Leave team (for current user only)
        {
          key: 'leave',
          label: 'Leave team',
          display: 'inline',
          hidden: row.type !== 'member' || row.email !== user?.email,
          disabled: isLastOwner,
          tooltip: isLastOwner
            ? 'You are the last owner. To leave the organization, first assign ownership to another member.'
            : undefined,
          onClick: (r) => leaveTeam(r),
        },
      ]),
    ];
  }, [
    user?.email,
    hasRemoveMemberPermission,
    isLastOwner,
    orgId,
    navigate,
    resendInvitation,
    cancelInvitation,
    removeMember,
    leaveTeam,
  ]);

  return (
    <Table.Client
      columns={columns}
      data={orderedTeamMembers ?? []}
      search="Search"
      onRowClick={(row) => {
        if (row.type !== 'member') return;
        navigate(
          getPathWithParams(paths.org.detail.team.roles, {
            orgId,
            memberId: row.name ?? '',
          })
        );
      }}
      empty={{
        title: 'invite your first team member',
        actions: hasInviteMemberPermission
          ? [
              {
                type: 'button',
                label: 'Invite Member',
                onClick: () => navigate(getPathWithParams(paths.org.detail.team.invite, { orgId })),
                icon: <Icon icon={UserPlusIcon} className="size-3" />,
              },
            ]
          : undefined,
      }}
      actions={
        hasInviteMemberPermission
          ? [
              <Link
                key="invite"
                to={getPathWithParams(paths.org.detail.team.invite, {
                  orgId,
                })}
                className="w-full sm:w-auto">
                <Button className="w-full" data-e2e="invite-member-button">
                  <Icon icon={UserPlusIcon} className="size-4" />
                  Invite Member
                </Button>
              </Link>,
            ]
          : []
      }
    />
  );
}
