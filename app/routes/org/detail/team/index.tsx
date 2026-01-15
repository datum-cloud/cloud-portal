import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { ProfileIdentity } from '@/components/profile-identity';
import {
  ManageRoleModalForm,
  ManageRoleModalFormRef,
} from '@/features/organization/team/manage-role';
import { DataTable } from '@/modules/datum-ui/components/data-table';
import { useHasPermission } from '@/modules/rbac';
import { useApp } from '@/providers/app.provider';
import {
  createInvitationService,
  useCancelInvitation,
  useResendInvitation,
  useHydrateInvitations,
  useInvitations,
} from '@/resources/invitations';
import {
  createMemberService,
  useRemoveMember,
  useLeaveOrganization,
  useHydrateMembers,
  useMembers,
} from '@/resources/members';
import { buildOrganizationNamespace } from '@/utils/common';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError } from '@/utils/errors';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Tooltip } from '@datum-ui/components';
import { Badge } from '@datum-ui/components';
import { Button, toast } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { ColumnDef } from '@tanstack/react-table';
import {
  ArrowRightIcon,
  Redo2Icon,
  TrashIcon,
  UserIcon,
  UserPenIcon,
  UserPlusIcon,
} from 'lucide-react';
import { useMemo, useRef } from 'react';
import {
  Link,
  LoaderFunctionArgs,
  data,
  useLoaderData,
  useNavigate,
  useParams,
} from 'react-router';

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

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { orgId } = params;

  if (!orgId) {
    throw new BadRequestError('Organization ID is required');
  }

  // Services now use global axios client with AsyncLocalStorage
  const invitationService = createInvitationService();
  const memberService = createMemberService();

  // Fetch raw data - transformation happens in component
  const [invitations, members] = await Promise.all([
    invitationService.list(orgId),
    memberService.list(orgId),
  ]);

  return data({ members, invitations });
};

export default function OrgTeamPage() {
  const { members: initialMembers, invitations: initialInvitations } =
    useLoaderData<typeof loader>();
  const { orgId } = useParams();
  const { user } = useApp();
  const navigate = useNavigate();

  // Hydrate React Query cache with SSR data (runs once on mount)
  useHydrateMembers(orgId ?? '', initialMembers);
  useHydrateInvitations(orgId ?? '', initialInvitations);

  // Read from React Query cache (gets updates from mutations)
  const { data: liveMembers } = useMembers(orgId ?? '', {
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000,
  });
  const { data: liveInvitations } = useInvitations(orgId ?? '', {
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000,
  });

  // Use live data, fallback to SSR data
  const members = liveMembers ?? initialMembers;
  const invitations = liveInvitations ?? initialInvitations;

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

  const manageRoleModalForm = useRef<ManageRoleModalFormRef>(null);

  // Mutation hooks
  const cancelInvitationMutation = useCancelInvitation(orgId ?? '', {
    onSuccess: () => {
      toast.success('Invitation cancelled successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to cancel invitation');
    },
  });

  const resendInvitationMutation = useResendInvitation(orgId ?? '', {
    onSuccess: () => {
      toast.success('Invitation resent successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to resend invitation');
    },
  });

  const removeMemberMutation = useRemoveMember(orgId ?? '', {
    onSuccess: () => {
      toast.success('Member removed successfully');
    },
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
      namespace: buildOrganizationNamespace(orgId ?? ''),
      group: 'resourcemanager.miloapis.com',
    }
  );

  const { hasPermission: hasInviteMemberPermission } = useHasPermission(
    'userinvitations',
    'create',
    {
      namespace: buildOrganizationNamespace(orgId ?? ''),
      group: 'iam.miloapis.com',
    }
  );

  const { hasPermission: hasEditMemberPermission } = useHasPermission(
    'organizationmemberships',
    'patch',
    {
      namespace: buildOrganizationNamespace(orgId ?? ''),
      group: 'resourcemanager.miloapis.com',
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
      onSubmit: async () => {
        cancelInvitationMutation.mutate(row?.id ?? '');
      },
    });
  };

  const resendInvitation = async (id: string) => {
    resendInvitationMutation.mutate(id);
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
      onSubmit: async () => {
        removeMemberMutation.mutate(row?.name ?? '');
      },
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
      onSubmit: async () => {
        leaveOrganizationMutation.mutate({
          orgId: orgId ?? '',
          memberName: row?.name ?? '',
        });
      },
    });
  };

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
      {
        header: 'Role',
        accessorKey: 'role',
        enableSorting: false,
        cell: ({ row }) => {
          const roles = row.original.roles ?? [];
          if (!roles.length) {
            return <span className="text-muted-foreground text-xs">—</span>;
          }

          return (
            <div className="flex flex-wrap gap-1">
              {roles.map((role, idx) => {
                const displayName = role.displayName || role.name;
                const roleColor = {
                  owner: 'success',
                  editor: 'info',
                  viewer: 'danger',
                };
                const badge = (
                  <Badge
                    key={`${role.name}-${idx}`}
                    type={(roleColor[role.name as keyof typeof roleColor] as any) ?? 'primary'}>
                    {displayName}
                  </Badge>
                );

                // If there's a description, wrap with tooltip
                if (role.description) {
                  return (
                    <Tooltip key={`${role.name}-${idx}`} message={role.description}>
                      {badge}
                    </Tooltip>
                  );
                }

                return badge;
              })}
            </div>
          );
        },
      },
    ];
  }, []);

  const rowActions = useMemo(
    () => [
      // Resend invitation (for pending invites only)
      {
        key: 'resend',
        label: 'Resend invitation',
        icon: <Icon icon={Redo2Icon} className="size-4" />,
        hidden: (row: ITeamMember) =>
          row.type !== 'invitation' || row.invitationState !== 'Pending',
        action: (row: ITeamMember) => resendInvitation(row.id),
      },
      // Cancel invitation (for invites only)
      {
        key: 'cancel',
        label: 'Cancel invitation',
        variant: 'destructive' as const,
        icon: <Icon icon={TrashIcon} className="size-4" />,
        hidden: (row: ITeamMember) => row.type !== 'invitation',
        action: (row: ITeamMember) => cancelInvitation(row),
      },
      // Edit member (for members only)
      {
        key: 'edit-role',
        label: 'Edit role',
        variant: 'default' as const,
        icon: <Icon icon={UserPenIcon} className="size-4" />,
        hidden: (row: ITeamMember) => {
          // Hide if not a member
          if (row.type !== 'member') return true;

          // Hide if it's current user (use "Leave" instead)
          if (row.email === user?.email) return true;

          // Hide if no permission
          if (!hasEditMemberPermission) return true;

          return false;
        },
        action: (row: ITeamMember) => {
          const role = row.roles?.[0];

          manageRoleModalForm.current?.show({
            id: row.name ?? '',
            roleName: role?.name ?? '',
            roleNamespace: role?.namespace ?? 'datum-cloud',
          });
        },
      },
      // Remove member (for OTHER members, not self)
      {
        key: 'remove',
        label: 'Remove member',
        variant: 'destructive' as const,
        icon: <Icon icon={TrashIcon} className="size-4" />,
        hidden: (row: ITeamMember) => {
          // Hide if not a member
          if (row.type !== 'member') return true;

          // Hide if it's current user (use "Leave" instead)
          if (row.email === user?.email) return true;

          // Hide if no permission
          if (!hasRemoveMemberPermission) return true;

          return false;
        },
        action: (row: ITeamMember) => removeMember(row),
      },
      // Leave team (for current user only)
      {
        key: 'leave',
        label: 'Leave team',
        display: 'inline' as const,
        hidden: (row: ITeamMember) => {
          // Only show for members
          if (row.type !== 'member') return true;

          // Only show for current user
          if (row.email !== user?.email) return true;

          return false;
        },
        disabled: (_row: ITeamMember) => {
          // Disable if user is the last owner
          if (isLastOwner) return true;

          return false;
        },
        tooltip: (_row: ITeamMember) => {
          // Show helpful message when disabled
          if (isLastOwner) {
            return (
              <span>
                You are the last owner. To leave the organization, <br /> first assign ownership to
                another member.
              </span>
            );
          }
          return undefined;
        },
        action: (row: ITeamMember) => leaveTeam(row),
      },
    ],
    [user?.email, hasRemoveMemberPermission, hasEditMemberPermission, isLastOwner]
  );

  return (
    <>
      <ManageRoleModalForm
        ref={manageRoleModalForm}
        orgId={orgId ?? ''}
        onSuccess={() => {
          toast.success('Member role updated successfully', {
            description: 'The member role has been updated successfully',
          });
        }}
      />
      <DataTable
        columns={columns}
        data={orderedTeamMembers ?? []}
        tableTitle={{
          title: 'Team',
          actions: hasInviteMemberPermission && (
            <Link
              to={getPathWithParams(paths.org.detail.team.invite, {
                orgId,
              })}>
              <Button>
                <Icon icon={UserPlusIcon} className="size-4" />
                Invite Member
              </Button>
            </Link>
          ),
        }}
        toolbar={{
          layout: 'compact',
          includeSearch: {
            placeholder: 'Search team members',
          },
        }}
        rowActions={rowActions}
        emptyContent={{
          title: "Looks like you don't have any team members added yet",
          actions: [
            {
              type: 'link',
              label: 'Invite a team member',
              to: getPathWithParams(paths.org.detail.team.invite, {
                orgId,
              }),
              variant: 'default',
              icon: <Icon icon={ArrowRightIcon} className="size-4" />,
              iconPosition: 'end',
            },
          ],
        }}
      />
    </>
  );
}
