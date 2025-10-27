import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DataTable } from '@/components/data-table';
import { ProfileIdentity } from '@/components/profile-identity';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useApp } from '@/providers/app.provider';
import { createInvitationsControl } from '@/resources/control-plane';
import { createMembersControl } from '@/resources/control-plane/resource-manager/members.control';
import { IInvitationControlResponse } from '@/resources/interfaces/invitation.interface';
import { IMemberControlResponse } from '@/resources/interfaces/member.interface';
import { ROUTE_PATH as MEMBERS_REMOVE_ROUTE_PATH } from '@/routes/api/members/remove';
import { ROUTE_PATH as TEAM_INVITATIONS_CANCEL_ROUTE_PATH } from '@/routes/api/team/invitations/cancel';
import { ROUTE_PATH as TEAM_INVITATIONS_RESEND_ROUTE_PATH } from '@/routes/api/team/invitations/resend';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError } from '@/utils/errors';
import { getPathWithParams } from '@/utils/helpers/path.helper';
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
  role?: string;
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
    role: invitation.role,
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
    role: undefined, // TODO: Extract role from member data when available
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
      confirmValue: 'CANCEL',
      confirmInputLabel: 'Type "CANCEL" to confirm.',
      variant: 'destructive',
      showConfirmInput: true,
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
          const fullName =
            row.original.givenName && row.original.familyName
              ? `${row.original.givenName} ${row.original.familyName}`.trim()
              : '';
          const name = fullName || row.original.email;
          const subtitle = fullName ? row.original.email : undefined;

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
          return <span className="capitalize">{row.original.role ?? '-'}</span>;
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
      confirmValue: 'REMOVE',
      confirmInputLabel: 'Type "REMOVE" to confirm.',
      variant: 'destructive',
      showConfirmInput: true,
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

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      if (fetcher.data.success) {
        toast.success(fetcher.data.message);
      } else {
        toast.error(fetcher.data.error);
      }
    }
  }, [fetcher.data, fetcher.state]);

  return (
    <DataTable
      columns={columns}
      data={teamMembers ?? []}
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
      rowActions={[
        {
          key: 'resend',
          label: 'Resend invitation',
          icon: <Redo2Icon className="size-4" />,
          hidden: (row) => row.type !== 'invitation' || row.invitationState !== 'Pending',
          action: (row) => resendInvitation(row.id),
        },
        {
          key: 'cancel',
          label: 'Cancel invitation',
          variant: 'destructive',
          icon: <TrashIcon className="size-4" />,
          hidden: (row) => row.type !== 'invitation',
          action: (row) => cancelInvitation(row),
        },
        {
          key: 'remove',
          label: 'Remove member',
          variant: 'destructive',
          icon: <TrashIcon className="size-4" />,
          hidden: (row) => row.type !== 'member' || row.email === user?.email,
          action: (row) => removeMember(row),
        },
      ]}
    />
  );
}
