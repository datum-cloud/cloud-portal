import { NextFunction } from './middleware';
import { OrganizationType, IOrganization } from '@/resources/interfaces/organization.interface';
import { ROUTE_PATH as ORG_DETAIL_PATH } from '@/routes/api/organizations/$id';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { getPathWithParams } from '@/utils/helpers/path.helper';

/**
 * Organization type checking middleware that fetches org details and validates organization type
 *
 * @param allowedTypes - Array of organization types allowed to access the route
 * @param request - The incoming request object
 * @param next - The next middleware function to call
 * @returns Response from either the next middleware or an error response
 */
export function createOrgTypeMiddleware(allowedTypes: OrganizationType[]) {
  return async (request: Request, next: NextFunction): Promise<Response> => {
    // Extract orgId from URL path
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const orgIndex = pathSegments.indexOf('org');
    const orgId =
      orgIndex !== -1 && orgIndex + 1 < pathSegments.length ? pathSegments[orgIndex + 1] : null;

    if (!orgId) {
      throw new BadRequestError('Organization ID not found in request');
    }

    // Fetch organization details using the same pattern as org detail layout
    const orgResponse = await fetch(
      `${process.env.APP_URL}${getPathWithParams(ORG_DETAIL_PATH, { id: orgId })}`,
      {
        method: 'GET',
        headers: {
          Cookie: request.headers.get('Cookie') || '',
        },
      }
    );

    const orgResult = await orgResponse.json();

    if (!orgResult.success) {
      throw new NotFoundError('Organization not found');
    }

    const org: IOrganization = orgResult.data;

    // Check if organization type is allowed
    if (org.type && !allowedTypes.includes(org.type)) {
      throw new BadRequestError(`This feature is not available for ${org.type} organizations`);
    }

    // Attach organization data to request for downstream use
    // Note: In a real implementation, you might want to use a more sophisticated
    // way to pass data between middleware (like request context)
    (request as any).organization = org;

    return next();
  };
}

/**
 * Predefined middleware for Standard organizations only
 */
export const standardOrgMiddleware = createOrgTypeMiddleware([OrganizationType.Standard]);

/**
 * Predefined middleware for Personal organizations only
 */
export const personalOrgMiddleware = createOrgTypeMiddleware([OrganizationType.Personal]);
