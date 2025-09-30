import { InvitationForm } from '@/features/organization/team/invitation-form';
import { validateCSRF } from '@/modules/cookie/csrf.server';
import { getSession } from '@/modules/cookie/session.server';
import { dataWithToast } from '@/modules/cookie/toast.server';
import { redirectWithToast } from '@/modules/cookie/toast.server';
import { createInvitationsControl, createUserControl } from '@/resources/control-plane';
import { invitationFormSchema } from '@/resources/schemas/invitation.schema';
import { paths } from '@/utils/config/paths.config';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { parseWithZod } from '@conform-to/zod/v4';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, MetaFunction } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Invite Member</span>,
};

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Invite Member');
});

export const action = async ({ request, params, context }: ActionFunctionArgs) => {
  const { orgId } = params;

  if (!orgId) {
    throw new Error('Organization ID is required');
  }

  const clonedRequest = request.clone();
  const formData = await clonedRequest.formData();

  try {
    await validateCSRF(formData, clonedRequest.headers);

    const parsed = parseWithZod(formData, { schema: invitationFormSchema });

    if (parsed.status !== 'success') {
      throw new Error('Invalid form data');
    }

    const { session } = await getSession(request);

    const { controlPlaneClient } = context as AppLoadContext;
    const invitationsControl = createInvitationsControl(controlPlaneClient as Client);

    const userControl = createUserControl(controlPlaneClient as Client);
    const user = await userControl.detail(session?.sub ?? '');

    const BATCH_SIZE = 3; // Process 3 at a time to avoid overwhelming API
    const results = [];

    // Split emails into batches
    const emails = parsed.value.emails;
    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const batch = emails.slice(i, i + BATCH_SIZE);

      // Process batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map(async (email) => {
          const payload = {
            email,
            inviterFamilyName: user.familyName, // inviter
            inviterGivenName: user.givenName, // inviter
            role: parsed.value.role,
          };

          // Dry run
          const dryRunRes = await invitationsControl.create(orgId, payload, true);

          // Actual creation
          if (dryRunRes) {
            return await invitationsControl.create(orgId, payload, false);
          }
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

    return redirectWithToast(
      getPathWithParams(paths.org.detail.team.root, {
        orgId,
      }),
      {
        title: 'Invitations sent successfully',
        description: 'The invitations have been sent successfully',
        type: 'success',
      }
    );
  } catch (error) {
    return dataWithToast(null, {
      title: 'Error',
      description: error instanceof Error ? error.message : (error as Response).statusText,
      type: 'error',
    });
  }
};

export default function OrgTeamInvitePage() {
  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <InvitationForm />
    </div>
  );
}
