import { createMembersControl } from '@/resources/control-plane/resource-manager/members.control';
import { memberUpdateRoleSchema } from '@/resources/schemas/member.schema';
import { redirectWithToast, validateCSRF } from '@/utils/cookies';
import { BadRequestError, HttpError } from '@/utils/errors';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, LoaderFunctionArgs, data } from 'react-router';

export const ROUTE_PATH = '/api/members' as const;

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  try {
    const { controlPlaneClient } = context as AppLoadContext;
    const membersControl = createMembersControl(controlPlaneClient as Client);

    const url = new URL(request.url);
    const orgId = url.searchParams.get('orgId');
    // const noCache = false;

    if (!orgId) {
      throw new BadRequestError('Organization ID is required');
    }

    // const key = `members:${orgId}`;

    // // Try to get cached secrets if caching is enabled
    // const [isCached, cachedMembers] = await Promise.all([
    //   !noCache && cache.hasItem(key),
    //   !noCache && cache.getItem(key),
    // ]);

    // // Return cached secrets if available and caching is enabled
    // if (isCached && cachedMembers) {
    //   return data({ success: true, data: cachedMembers }, { status: 200 });
    // }

    // Fetch fresh members from control plane
    const members = await membersControl.list(orgId);

    // Cache the fresh members if caching is enabled
    // await cache.setItem(key, members).catch((error) => {
    //   console.error('Failed to cache members:', error);
    // });

    return data({ success: true, data: members }, { status: 200 });
  } catch (error: any) {
    return data(
      { success: false, error: error?.message ?? 'An unexpected error occurred' },
      { status: 500 }
    );
  }
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;
  const membersControl = createMembersControl(controlPlaneClient as Client);

  try {
    switch (request.method) {
      case 'DELETE': {
        const formData = Object.fromEntries(await request.formData());

        const { orgId, id, redirectUri } = formData;

        if (!orgId) {
          throw new BadRequestError('Organization ID is required');
        }

        if (!id) {
          throw new BadRequestError('Member ID is required');
        }

        await membersControl.delete(orgId as string, id as string);

        if (redirectUri) {
          return redirectWithToast(redirectUri as string, {
            title: 'Member removed successfully',
            description: 'The member has been removed successfully',
            type: 'success',
          });
        }

        return data({ success: true, message: 'Member removed successfully' }, { status: 200 });
      }
      case 'PATCH': {
        const clonedRequest = request.clone();

        const payload: any = await clonedRequest.json();

        const { csrf, orgId, id } = payload;

        if (!orgId || !id) {
          throw new BadRequestError('Organization ID and member ID are required');
        }

        // Create FormData to validate CSRF token
        const formData = new FormData();
        formData.append('csrf', csrf);

        // Validate the CSRF token against the request headers
        await validateCSRF(formData, request.headers);

        // Validate form data with Zod
        const parsed = memberUpdateRoleSchema.safeParse(payload);

        if (!parsed.success) {
          throw new BadRequestError('Invalid form data');
        }

        const dryRunRes = await membersControl.updateRole(
          orgId as string,
          id as string,
          parsed.data,
          true
        );

        if (dryRunRes) {
          await membersControl.updateRole(orgId as string, id as string, parsed.data, false);
        }

        return data(
          { success: true, message: 'Member role updated successfully' },
          { status: 200 }
        );
      }
      default:
        throw new HttpError('Method not allowed', 405);
    }
  } catch (error: any) {
    return data({ success: false, error: error.message }, { status: error.status });
  }
};
