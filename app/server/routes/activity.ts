// app/server/routes/activity.ts
import type { Variables } from '../types';
import { Hono } from 'hono';

/**
 * Legacy query parameters for activity log API.
 * @deprecated This route is a stub and will be replaced by the new activity log implementation.
 */
interface LegacyActivityQueryParams {
  limit?: string;
  start?: string;
  end?: string;
  project?: string;
  organization?: string;
  q?: string;
  user?: string;
  status?: string;
  actions?: string;
  resource?: string;
  objectName?: string;
  apiGroup?: string;
  apiVersion?: string;
  stage?: string;
  excludeDryRun?: boolean;
}

const activity = new Hono<{ Variables: Variables }>();

/**
 * Helper function to parse and validate activity log query parameters
 * @deprecated This route is a stub and will be replaced by the new activity log implementation.
 */
const parseActivityLogParams = (searchParams: URLSearchParams): LegacyActivityQueryParams => {
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
    limit: getStringParam('limit'),
    start: getStringParam('start'),
    end: getStringParam('end'),
    project: getStringParam('project'),
    organization: getStringParam('organization'),
    q: getStringParam('q'),
    user: getStringParam('user'),
    status: getStringParam('status'),
    actions: getStringParam('actions'),
    resource: getStringParam('resource'),
    objectName: getStringParam('objectName'),
    apiGroup: getStringParam('apiGroup'),
    apiVersion: getStringParam('apiVersion'),
    stage: getStringParam('stage'),
    excludeDryRun: getBooleanParam('excludeDryRun'),
  };
};

// GET /api/activity - Get activity logs
activity.get('/', async (c) => {
  try {
    const session = c.get('session');
    if (!session?.accessToken) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Parse query parameters
    const url = new URL(c.req.url);
    const _queryParams = parseActivityLogParams(url.searchParams);

    // TODO: Implement actual activity log fetching when Loki service is ready
    // const service = new LokiActivityLogsService(session.accessToken);
    // const activityLogsResponse = await service.getActivityLogs(queryParams);

    return c.json({
      success: true,
      data: {
        logs: [],
        query: '',
        timeRange: {
          start: '',
          end: '',
        },
      },
    });
  } catch (error) {
    console.error('Activity API error:', error);
    return c.json({
      success: true,
      data: {
        logs: [],
        query: '',
        timeRange: {
          start: '',
          end: '',
        },
      },
      message: 'Activity logs are not available at the moment. Please try again later.',
    });
  }
});

export { activity as activityRoutes };
