import { InvitationForm } from '@/features/organization/team/invitation-form';
import { createInvitationsControl } from '@/resources/control-plane';
import { invitationFormSchema, NewInvitationSchema } from '@/resources/schemas/invitation.schema';
import { paths } from '@/utils/config/paths.config';
import { validateCSRF } from '@/utils/cookies';
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

    const { controlPlaneClient } = context as AppLoadContext;
    const invitationsControl = createInvitationsControl(controlPlaneClient as Client);

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
    if (!data) return;

    if (data.success && data.data) {
      const successCount = data.data.filter((r: InvitationResult) => r.success).length;
      const failedResults = data.data.filter((r: InvitationResult) => !r.success);
      const failedCount = failedResults.length;

      const getInvitationText = (count: number) => (count === 1 ? 'invitation' : 'invitations');

      const ErrorList = (errors: InvitationResult[]) => {
        if (errors.length === 1) {
          const result = errors[0];
          return (
            <span className="text-muted-foreground text-xs">
              {result.email}:{result.error}
            </span>
          );
        }
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

      if (successCount > 0 && failedCount === 0) {
        toast.success(`${successCount} ${getInvitationText(successCount)} sent successfully!`);
        navigate(getPathWithParams(paths.org.detail.team.root, { orgId }));
      } else if (successCount > 0 && failedCount > 0) {
        toast.warning(
          `${successCount} ${getInvitationText(successCount)} sent, ${failedCount} failed`,
          {
            description: ErrorList(failedResults),
          }
        );
        navigate(getPathWithParams(paths.org.detail.team.root, { orgId }));
      } else if (failedCount > 0) {
        toast.error(`${failedCount} ${getInvitationText(failedCount)} failed`, {
          description: ErrorList(failedResults),
        });
      }
    } else {
      toast.error(data?.error ?? 'An unexpected error occurred');
    }
  }, [data, navigate, orgId]);

  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <InvitationForm />
    </div>
  );
}
