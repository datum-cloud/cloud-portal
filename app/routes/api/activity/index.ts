import { LokiActivityLogsService, type QueryParams } from '@/modules/loki';
import { getSession } from '@/utils/cookies';
import { AuthenticationError } from '@/utils/errors';
import { data, type LoaderFunctionArgs } from 'react-router';

/**
 * Helper function to parse and validate activity log query parameters
 */
const parseActivityLogParams = (searchParams: URLSearchParams): QueryParams => {
  const getStringParam = (key: string): string | undefined => {
    const value = searchParams.get(key);
    return value || undefined;
  };

  const getBooleanParam = (key: string): boolean | undefined => {
    const value = searchParams.get(key);
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  };

  return {
    // Basic parameters
    limit: getStringParam('limit'),
    start: getStringParam('start'),
    end: getStringParam('end'),
    project: getStringParam('project'),
    organization: getStringParam('organization'),

    // Search and filtering
    q: getStringParam('q'),
    user: getStringParam('user'),
    status: getStringParam('status'),
    actions: getStringParam('actions'),

    // ObjectRef filtering
    resource: getStringParam('resource'),
    objectName: getStringParam('objectName'),
    apiGroup: getStringParam('apiGroup'),
    apiVersion: getStringParam('apiVersion'),

    // Loki-specific filtering
    stage: getStringParam('stage'),
    excludeDryRun: getBooleanParam('excludeDryRun'),
  };
};

// Route configuration
export const ROUTE_PATH = '/api/activity' as const;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    // Get session for authentication
    const sessionResponse = await getSession(request);
    const session = sessionResponse.session;

    if (!session?.accessToken) {
      throw new AuthenticationError('Unauthorized');
    }

    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = parseActivityLogParams(url.searchParams);

    const service = new LokiActivityLogsService(session.accessToken);
    const activityLogsResponse = await service.getActivityLogs(queryParams);

    return data({
      success: true,
      data: activityLogsResponse,
    });
  } catch (error) {
    const message = (error as any).message ?? 'Internal Server Error';

    return data({ success: false, error: message });
  }
};
