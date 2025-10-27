import { InvitationForm } from '@/features/organization/team/invitation-form';
import { validateCSRF } from '@/modules/cookie/csrf.server';
import { getSession } from '@/modules/cookie/session.server';
import { createInvitationsControl, createUserControl } from '@/resources/control-plane';
import { invitationFormSchema, NewInvitationSchema } from '@/resources/schemas/invitation.schema';
import { paths } from '@/utils/config/paths.config';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { parseWithZod } from '@conform-to/zod/v4';
import { Client } from '@hey-api/client-axios';
import { useEffect } from 'react';
import {
  ActionFunctionArgs,
  AppLoadContext,
  data,
  MetaFunction,
  useActionData,
  useNavigate,
  useParams,
} from 'react-router';
import { toast } from 'sonner';

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
    const results: any = [];

    // Split emails into batches
    const emails = parsed.value.emails;
    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const batch = emails.slice(i, i + BATCH_SIZE);

      // Process batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map(async (email) => {
          const payload: NewInvitationSchema = {
            email,
            inviterFamilyName: user.familyName, // inviter
            inviterGivenName: user.givenName, // inviter
            role: parsed.value.role,
            roleNamespace: parsed.value.roleNamespace,
          };

          try {
            // Dry run
            const dryRunRes = await invitationsControl.create(orgId, payload, true);

            // Actual creation
            if (dryRunRes) {
              return await invitationsControl.create(orgId, payload, false);
            } else {
              throw new Error('Failed to create invitation');
            }
          } catch (error) {
            throw error instanceof Error ? error : new Error('Failed to create invitation');
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

    return data({ success: true, data: results }, { status: 200 });
  } catch (error) {
    return data(
      {
        success: false,
        error: error instanceof Error ? error.message : (error as Response).statusText,
      },
      { status: 500 }
    );
  }
};

interface InvitationResult {
  email: string;
  success: boolean;
  data?: any;
  error?: string;
}

interface ActionData {
  success: boolean;
  data?: InvitationResult[];
  error?: string;
}

export default function OrgTeamInvitePage() {
  const { orgId } = useParams();
  const data = useActionData<ActionData>();
  const navigate = useNavigate();

  useEffect(() => {
    if (data) {
      if (data.success && data.data) {
        const successCount = data.data.filter((r: InvitationResult) => r.success).length;
        const failedResults = data.data.filter((r: InvitationResult) => !r.success);

        const ErrorList = (errors: InvitationResult[]) => {
          return (
            <ul className="list-inside list-disc text-xs">
              {errors.map((result, index) => (
                <li key={index}>
                  <span className="text-muted-foreground">
                    {result.email}:{result.error}
                  </span>
                </li>
              ))}
            </ul>
          );
        };

        if (successCount > 0 && failedResults.length === 0) {
          toast.success(`Invitations sent successfully!`);
          navigate(getPathWithParams(paths.org.detail.team.root, { orgId }));
          return;
        } else if (successCount > 0 && failedResults.length > 0) {
          toast.warning(`${successCount} invitations sent, ${failedResults.length} failed`, {
            description: ErrorList(failedResults),
          });
          navigate(getPathWithParams(paths.org.detail.team.root, { orgId }));
        } else if (failedResults.length > 0) {
          toast.error('Invitations failed', {
            description: ErrorList(failedResults),
          });
        }
      } else {
        toast.error(data?.error ?? 'An unexpected error occurred');
      }
    }
  }, [data, navigate, orgId]);

  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <InvitationForm />
    </div>
  );
}
