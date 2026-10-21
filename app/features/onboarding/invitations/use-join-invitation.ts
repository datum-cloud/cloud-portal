import { logger } from '@/modules/logger';
import { useAcceptInvitation } from '@/resources/invitations/invitation.queries';
import type { Invitation } from '@/resources/invitations/invitation.schema';
import { waitForMembershipRolesApplied } from '@/resources/members';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

/**
 * Upper bound on how long joining waits for the new membership's roles to
 * propagate before sending the user into the org anyway.
 */
const ACCESS_WAIT_TIMEOUT_MS = 45_000;

type JoinInvitationInput = Pick<Invitation, 'organizationName' | 'name'>;

type UseJoinInvitationOptions = {
  /** Fires once the invitation is accepted, before waiting on access. */
  onAccepted?: (orgId: string) => void;
  onError?: (error: Error) => void;
};

/**
 * Accepts an invitation and lands the user in the org once their access is
 * live. Shared by the invitation accept page and the onboarding invitations
 * step so both wait out role propagation the same way.
 */
export function useJoinInvitation({ onAccepted, onError }: UseJoinInvitationOptions = {}) {
  const navigate = useNavigate();
  const [isSettlingAccess, setIsSettlingAccess] = useState(false);

  // The accept mutation does not await this onSuccess, so the wait below can
  // outlive the page. Never navigate on behalf of a page the user has
  // already left.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const acceptMutation = useAcceptInvitation({
    onSuccess: async (_invitation, { orgId }) => {
      onAccepted?.(orgId);
      // Accepting creates the OrganizationMembership, but its roles are applied
      // asynchronously. Landing on the org page before that finishes trips the
      // access check and shows "Access restricted" (#1505), so wait on the
      // membership status first. On timeout we still navigate; the org page's
      // restricted state remains the fallback.
      setIsSettlingAccess(true);
      try {
        await waitForMembershipRolesApplied(orgId, { timeoutMs: ACCESS_WAIT_TIMEOUT_MS });
      } catch (error) {
        logger.warn('Invitation accepted but roles did not settle before timeout', {
          orgId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      if (!isMountedRef.current) return;
      navigate(getPathWithParams(paths.org.detail.root, { orgId }));
    },
    onError,
  });

  const join = (invitation: JoinInvitationInput) =>
    acceptMutation.mutate({ orgId: invitation.organizationName, name: invitation.name });

  const isJoining = acceptMutation.isPending || isSettlingAccess;

  return {
    join,
    isJoining,
    isSettlingAccess,
    /** The invitation being joined, so a list can show progress on the right row. */
    joiningInvitationName: isJoining ? acceptMutation.variables?.name : undefined,
  };
}
