import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DataTable } from '@/components/data-table';
import { ProfileIdentity } from '@/components/profile-identity';
import { useHasPermission } from '@/modules/rbac';
import { useApp } from '@/providers/app.provider';
import { createInvitationsControl } from '@/resources/control-plane';
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
import { Badge } from '@datum-ui/components';
import { Button } from '@datum-ui/components';
import { Client } from '@hey-api/client-axios';
import { ColumnDef } from '@tanstack/react-table';
import { Redo2Icon, TrashIcon, UserIcon, UserPlusIcon } from 'lucide-react';
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
import { toast } from 'sonner';

// Generic interface for combined team data
interface ITeamMember {
  id: string;
  givenName?: string;
  familyName?: string;
  email: string;
  roles?: {
    name: string;
    namespace?: string;
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

  if (!orgId) {
    throw new BadRequestError('Organization ID is required');
  }

  const invitations = await invitationsControl.list(orgId);
  const filteredInvitations: IInvitationControlResponse[] = invitations.filter(
    (invitation) => invitation.state === 'Pending'
  );

  const members: IMemberControlResponse[] = await membersControl.list(orgId);

  // Transform invitations to generic format
  const invitationTeamMembers: ITeamMember[] = filteredInvitations.map((invitation) => ({
    id: invitation.name, // Use email as ID for invitations since they don't have user ID yet
    givenName: invitation.givenName,
    familyName: invitation.familyName,
    email: invitation.email,
    roles: invitation.role
      ? [{ name: invitation.role, namespace: invitation.role ?? 'datum-cloud' }]
      : [],
    invitationState: invitation.state,
    type: 'invitation' as const,
    name: invitation.name,
  }));

  // Transform members to generic format
  const memberTeamMembers: ITeamMember[] = members.map((member) => ({
    id: member.user.id,
    givenName: member.user.givenName,
    familyName: member.user.familyName,
    email: member.user.email || '',
    roles: member.roles,
    type: 'member' as const,
    name: member.name,
  }));

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

  const {
    hasPermission: hasRemoveMemberPermission,
    isError,
    error,
  } = useHasPermission('organizationmemberships', 'delete', {
    namespace: buildNamespace('organization', orgId ?? ''),
    group: 'resourcemanager.miloapis.com',
  });

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
        accessorKey: 'email',
        enableSorting: false,
        cell: ({ row }) => {
          let name = row.original.email;
          let subtitle = undefined;

          if (row.original.type === 'member') {
            const fullName =
              row.original.givenName && row.original.familyName
                ? `${row.original.givenName} ${row.original.familyName}`.trim()
                : undefined;
            name = fullName || row.original.email;
            subtitle = fullName;
          }

          return (
            <div className="flex items-center gap-2">
              <ProfileIdentity
                fallbackIcon={row.original.type === 'invitation' ? UserIcon : undefined}
                name={name}
                subtitle={subtitle}
                size="sm"
              />
              {row.original.email === user?.email && (
                <Badge variant="outline" className="py-0.5 text-xs font-normal">
                  You
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        header: '',
        accessorKey: 'invitationState',
        enableSorting: false,
        cell: ({ row }) => {
          if (row.original.type === 'member') {
            return <></>;
          }

          return (
            <Badge variant={row.original.invitationState === 'Pending' ? 'sunglow' : 'default'}>
              {row.original.invitationState === 'Pending'
                ? 'Invited'
                : row.original.invitationState}
            </Badge>
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
              {roles.map((role, idx) => (
                <Badge
                  key={`${role.name}-${idx}`}
                  variant="outline"
                  className="py-0.5 text-xs font-normal">
                  {role.name}
                </Badge>
              ))}
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
            {row.givenName} {row.familyName} ({row.email})
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

  useEffect(() => {
    if (isError) {
      toast.error(error?.message ?? 'Failed to check permission');
    }
  }, [isError, error]);

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
        description: 'Manage your organization team',
        actions: (
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
      rowActions={rowActions}
    />
  );
}
