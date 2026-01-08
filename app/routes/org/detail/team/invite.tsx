import { InvitationForm } from '@/features/organization/team/invitation-form';
import { createRbacMiddleware } from '@/modules/rbac';
import {
  useCreateInvitation,
  type CreateInvitationInput,
  type InvitationFormSchema,
} from '@/resources/invitations';
import { buildNamespace } from '@/utils/common';
import { paths } from '@/utils/config/paths.config';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { withMiddleware } from '@/utils/middlewares';
import { toast } from '@datum-ui/components';
import { useState, useCallback } from 'react';
import { data, MetaFunction, useNavigate, useParams } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Invite Member</span>,
};

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Invite Member');
});

export const loader = withMiddleware(
  async () => {
    return data({});
  },
  createRbacMiddleware({
    resource: 'userinvitations',
    verb: 'create',
    group: 'iam.miloapis.com',
    namespace: (params) => buildNamespace('organization', params.orgId),
  })
);

interface InvitationResult {
  email: string;
  success: boolean;
  data?: any;
  error?: string;
}

export default function OrgTeamInvitePage() {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createInvitation = useCreateInvitation(orgId ?? '');

  const handleSubmit = useCallback(
    async (formData: InvitationFormSchema) => {
      if (!orgId) return;

      setIsSubmitting(true);

      const BATCH_SIZE = 3; // Process 3 at a time to avoid overwhelming API
      const results: InvitationResult[] = [];

      // Split emails into batches
      const emails = formData.emails;
      for (let i = 0; i < emails.length; i += BATCH_SIZE) {
        const batch = emails.slice(i, i + BATCH_SIZE);

        // Process batch in parallel
        const batchResults = await Promise.allSettled(
          batch.map(async (email) => {
            const payload: CreateInvitationInput = {
              email,
              role: formData.role,
              roleNamespace: formData.roleNamespace,
            };

            return createInvitation.mutateAsync(payload);
          })
        );

        // Process results
        batch.forEach((email, index) => {
          const result = batchResults[index];
          if (result.status === 'fulfilled') {
            results.push({ email, success: true, data: result.value });
          } else {
            results.push({ email, success: false, error: result.reason.message });
          }
        });
      }

      setIsSubmitting(false);

      const successCount = results.filter((r) => r.success).length;
      const failedResults = results.filter((r) => !r.success);
      const failedCount = failedResults.length;

      // Helper to pluralize "invitation"
      const pluralize = (count: number) => (count === 1 ? 'invitation' : 'invitations');

      // Helper to format count with proper pluralization
      const formatCount = (count: number) => `${count} ${pluralize(count)}`;

      // Error list component for toast descriptions
      const ErrorList = (errors: InvitationResult[]) => {
        if (errors.length === 1) {
          const result = errors[0];
          return (
            <span className="text-muted-foreground text-xs">
              {result.email}: {result.error}
            </span>
          );
        }
        return (
          <ul className="list-inside list-disc text-xs">
            {errors.map((result, index) => (
              <li key={index}>
                <span className="text-muted-foreground">
                  {result.email}: {result.error}
                </span>
              </li>
            ))}
          </ul>
        );
      };

      // Build success/failure message based on counts
      const hasSuccess = successCount > 0;
      const hasFailed = failedCount > 0;

      if (hasSuccess && !hasFailed) {
        // All invitations succeeded
        const message =
          successCount === 1
            ? 'Invitation sent successfully!'
            : `${formatCount(successCount)} sent successfully!`;
        toast.success(message);
        navigate(getPathWithParams(paths.org.detail.team.root, { orgId }));
      } else if (hasSuccess && hasFailed) {
        // Partial success - some succeeded, some failed
        const message =
          successCount === 1 && failedCount === 1
            ? 'Invitation sent, 1 invitation failed'
            : successCount === 1
              ? `Invitation sent, ${formatCount(failedCount)} failed`
              : failedCount === 1
                ? `${formatCount(successCount)} sent, 1 invitation failed`
                : `${formatCount(successCount)} sent, ${formatCount(failedCount)} failed`;
        toast.warning(message, {
          description: ErrorList(failedResults),
        });
        navigate(getPathWithParams(paths.org.detail.team.root, { orgId }));
      } else if (hasFailed) {
        // All invitations failed
        const message =
          failedCount === 1 ? 'Invitation failed' : `${formatCount(failedCount)} failed`;
        toast.error(message, {
          description: ErrorList(failedResults),
        });
      }
    },
    [orgId, createInvitation, navigate]
  );

  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <InvitationForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}
