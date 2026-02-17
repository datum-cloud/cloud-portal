import { MiddlewareContext, NextFunction } from './middleware';
import { createOrganizationService, type Organization } from '@/resources/organizations';
import { BadRequestError, NotFoundError } from '@/utils/errors';

type OrganizationType = Organization['type'];

/**
 * Organization type checking middleware that fetches org details and validates organization type
 *
 * @param allowedTypes - Array of organization types allowed to access the route
 * @param ctx - The middleware context containing request and app context
 * @param next - The next middleware function to call
 * @returns Response from either the next middleware or an error response
 */
export function createOrgTypeMiddleware(allowedTypes: OrganizationType[]) {
  return async (ctx: MiddlewareContext, next: NextFunction): Promise<Response> => {
    const { request } = ctx;

    // Extract orgId from URL path
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const orgIndex = pathSegments.indexOf('org');
    const orgId =
      orgIndex !== -1 && orgIndex + 1 < pathSegments.length ? pathSegments[orgIndex + 1] : null;

    if (!orgId) {
      throw new BadRequestError('Organization ID not found in request');
    }

    // Use the organization service to fetch org details
    // Services now use global axios client with AsyncLocalStorage
    const orgService = createOrganizationService();

    const org = await orgService.get(orgId).catch(() => {
      throw new NotFoundError('Organization not found');
    });

    // Check if organization type is allowed
    if (org.type && !allowedTypes.includes(org.type)) {
      throw new BadRequestError(`This feature is not available for ${org.type} organizations`);
    }

    // Attach organization data to request for downstream use
    (request as any).organization = org;

    return next();
  };
}

/**
 * Predefined middleware for Standard organizations only
 */
export const standardOrgMiddleware = createOrgTypeMiddleware(['Standard']);

/**
 * Predefined middleware for Personal organizations only
 */
export const personalOrgMiddleware = createOrgTypeMiddleware(['Personal']);
