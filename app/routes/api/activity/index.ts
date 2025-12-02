import { type QueryParams } from '@/modules/loki';
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

export const loader = async ({ context, request }: LoaderFunctionArgs) => {
  try {
    // Get Loki service from context (already initialized with refreshed token)
    const { lokiService } = context as any;

    if (!lokiService) {
      return data({ success: false, error: 'Service unavailable' }, { status: 503 });
    }

    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = parseActivityLogParams(url.searchParams);

    const activityLogsResponse = await lokiService.getActivityLogs(queryParams);

    return data({
      success: true,
      data: activityLogsResponse,
    });
  } catch (error) {
    const message = (error as any).message ?? 'Internal Server Error';

    return data({ success: false, error: message });
  }
};
