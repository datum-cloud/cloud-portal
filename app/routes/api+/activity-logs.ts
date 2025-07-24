import { getSession } from '@/modules/cookie/session.server';
import { LokiActivityLogsService, type QueryParams } from '@/modules/loki';
import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { data, type LoaderFunctionArgs } from 'react-router';

// Route configuration
export const ROUTE_PATH = '/api/activity-logs' as const;

export const loader = withMiddleware(async ({ request }: LoaderFunctionArgs) => {
  try {
    // Get session for authentication
    const sessionResponse = await getSession(request);
    const session = sessionResponse.session;

    if (!session?.accessToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const queryParams: QueryParams = {
      limit: url.searchParams.get('limit') || undefined,
      start: url.searchParams.get('start') || undefined,
      end: url.searchParams.get('end') || undefined,
      project: url.searchParams.get('project') || undefined,
      // Hybrid filtering approach
      q: url.searchParams.get('q') || undefined,
      user: url.searchParams.get('user') || undefined,
      resource: url.searchParams.get('resource') || undefined,
      status: url.searchParams.get('status') || undefined,
      actions: url.searchParams.get('actions') || undefined,
    };

    const service = new LokiActivityLogsService(session.accessToken);
    const activityLogsResponse = await service.getActivityLogs(queryParams);

    return data({
      success: true,
      data: activityLogsResponse,
    });
  } catch (error) {
    return data({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}, authMiddleware);
