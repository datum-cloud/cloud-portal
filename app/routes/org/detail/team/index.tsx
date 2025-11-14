import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { ProfileIdentity } from '@/components/profile-identity';
import { DataTable } from '@/modules/datum-ui/components/data-table';
import { useHasPermission } from '@/modules/rbac';
import { useApp } from '@/providers/app.provider';
import { createInvitationsControl } from '@/resources/control-plane';
import { createRolesControl } from '@/resources/control-plane/iam/roles.control';
import { createMembersControl } from '@/resources/control-plane/resource-manager/members.control';
import { IInvitationControlResponse } from '@/resources/interfaces/invitation.interface';
import { IMemberControlResponse } from '@/resources/interfaces/member.interface';
import { ROUTE_PATH as MEMBERS_LEAVE_ROUTE_PATH } from '@/routes/api/members/leave';
import { ROUTE_PATH as MEMBERS_REMOVE_ROUTE_PATH } from '@/routes/api/members/remove';
import { ROUTE_PATH as TEAM_INVITATIONS_CANCEL_ROUTE_PATH } from '@/routes/api/team/invitations/cancel';
import { ROUTE_PATH as TEAM_INVITATIONS_RESEND_ROUTE_PATH } from '@/routes/api/team/invitations/resend';
import { buildNamespace } from '@/utils/common';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError } from '@/utils/errors';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Tooltip } from '@datum-ui/components';
import { Badge } from '@datum-ui/components';
import { Button, toast } from '@datum-ui/components';
import { Client } from '@hey-api/client-axios';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowRightIcon, Redo2Icon, TrashIcon, UserIcon, UserPlusIcon } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import {
  AppLoadContext,
  Link,
  LoaderFunctionArgs,
  data,
  useFetcher,
  useLoaderData,
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
}

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  const { orgId } = params;
  const { controlPlaneClient } = context as AppLoadContext;
  const invitationsControl = createInvitationsControl(controlPlaneClient as Client);
  const membersControl = createMembersControl(controlPlaneClient as Client);
  const rolesControl = createRolesControl(controlPlaneClient as Client);

  if (!orgId) {
    throw new BadRequestError('Organization ID is required');
  }

  // Helper function to resolve role details by querying the API
  const resolveRoleDetails = async (roleName: string, namespace: string = 'datum-cloud') => {
    try {
      const role = await rolesControl.get(roleName, namespace);
      return {
        name: roleName,
        namespace,
        displayName: role.displayName ?? roleName,
        description: role.description,
      };
    } catch (error) {
      // Fallback if role not found
      console.error(`Failed to resolve role details for ${roleName}:`, error);
      return {
        name: roleName,
        namespace,
        displayName: roleName,
        description: undefined,
      };
    }
  };

  const invitations = await invitationsControl.list(orgId);
  const filteredInvitations: IInvitationControlResponse[] = invitations.filter(
    (invitation) => invitation.state === 'Pending'
  );

  const members: IMemberControlResponse[] = await membersControl.list(orgId);

  // Transform invitations to generic format
  const invitationTeamMembers: ITeamMember[] = await Promise.all(
    filteredInvitations.map(async (invitation) => ({
      id: invitation.name,
      fullName: invitation.email ?? '',
      email: invitation.email ?? '',
      roles: invitation.role ? [await resolveRoleDetails(invitation.role, 'datum-cloud')] : [],
      invitationState: invitation.state,
      type: 'invitation' as const,
      name: invitation.name,
    }))
  );

  // Transform members to generic format
  const memberTeamMembers: ITeamMember[] = await Promise.all(
    members.map(async (member) => ({
      id: member.user.id,
      fullName: `${member.user.givenName ?? ''} ${member.user.familyName ?? ''}`.trim(),
      email: member.user.email ?? '',
      roles: member.roles
        ? await Promise.all(
            member.roles.map((role) =>
              resolveRoleDetails(role.name, role.namespace ?? 'datum-cloud')
            )
          )
        : [],
      type: 'member' as const,
      name: member.name,
    }))
  );

  // Combine both arrays
  const teamMembers: ITeamMember[] = [...memberTeamMembers, ...invitationTeamMembers];

  return data(teamMembers);
};

export default function OrgTeamPage() {
  const teamMembers = useLoaderData<typeof loader>() as ITeamMember[];

  const { orgId } = useParams();
  const { user } = useApp();
  const fetcher = useFetcher();
  const { confirm } = useConfirmationDialog();

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
      namespace: buildNamespace('organization', orgId ?? ''),
      group: 'resourcemanager.miloapis.com',
    }
  );

  const { hasPermission: hasInviteMemberPermission } = useHasPermission(
    'userinvitations',
    'create',
    {
      namespace: buildNamespace('organization', orgId ?? ''),
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
        await fetcher.submit(
          {
            id: row?.id ?? '',
            orgId: orgId ?? '',
          },
          {
            action: TEAM_INVITATIONS_CANCEL_ROUTE_PATH,
            method: 'DELETE',
          }
        );
      },
    });
  };

  const resendInvitation = async (id: string) => {
    await fetcher.submit(
      {
        id,
        orgId: orgId ?? '',
      },
      {
        action: TEAM_INVITATIONS_RESEND_ROUTE_PATH,
        method: 'POST',
      }
    );
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
              <div className="flex items-center gap-2">
                <ProfileIdentity
                  fallbackIcon={row.original.type === 'invitation' ? UserIcon : undefined}
                  name={name}
                  subtitle={row.original.type === 'member' ? subtitle : undefined}
                  size="sm"
                />
                {row.original.email === user?.email && <Badge>You</Badge>}
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
                const badge = <Badge key={`${role.name}-${idx}`}>{displayName}</Badge>;

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
        await fetcher.submit(
          {
            id: row?.name ?? '',
            orgId: orgId ?? '',
          },
          {
            action: MEMBERS_REMOVE_ROUTE_PATH,
            method: 'DELETE',
          }
        );
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
        await fetcher.submit(
          {
            id: row?.name ?? '',
            orgId: orgId ?? '',
            redirectUri: paths.account.organizations.root,
          },
          {
            action: MEMBERS_LEAVE_ROUTE_PATH,
            method: 'DELETE',
          }
        );
      },
    });
  };

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      if (fetcher.data.success) {
        toast.success(fetcher.data.message);
      } else {
        toast.error(fetcher.data.error);
      }
    }
  }, [fetcher.data, fetcher.state]);

  const rowActions = useMemo(
    () => [
      // Resend invitation (for pending invites only)
      {
        key: 'resend',
        label: 'Resend invitation',
        icon: <Redo2Icon className="size-4" />,
        hidden: (row: ITeamMember) =>
          row.type !== 'invitation' || row.invitationState !== 'Pending',
        action: (row: ITeamMember) => resendInvitation(row.id),
      },
      // Cancel invitation (for invites only)
      {
        key: 'cancel',
        label: 'Cancel invitation',
        variant: 'destructive' as const,
        icon: <TrashIcon className="size-4" />,
        hidden: (row: ITeamMember) => row.type !== 'invitation',
        action: (row: ITeamMember) => cancelInvitation(row),
      },
      // Remove member (for OTHER members, not self)
      {
        key: 'remove',
        label: 'Remove member',
        variant: 'destructive' as const,
        icon: <TrashIcon className="size-4" />,
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
    [user?.email, hasRemoveMemberPermission, isLastOwner]
  );

  return (
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
              <UserPlusIcon className="size-4" />
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
            icon: <ArrowRightIcon className="size-4" />,
            iconPosition: 'end',
          },
        ],
      }}
    />
  );
}
