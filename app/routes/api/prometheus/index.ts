/**
 * Prometheus API middleware route
 * Handles Prometheus queries server-side with proper authentication and environment variables
 */
import { getSession } from '@/modules/cookie/session.server';
import { PrometheusService } from '@/modules/prometheus';
import { PrometheusError } from '@/modules/prometheus/errors';
import { getSharedEnvs } from '@/utils/config/env.config';
import { data, type ActionFunctionArgs } from 'react-router';

export const ROUTE_PATH = '/api/prometheus' as const;

/**
 * POST /api/prometheus
 * Handles Prometheus queries with server-side configuration
 */
export async function action({ request }: ActionFunctionArgs) {
  try {
    // Get environment variables server-side
    const env = getSharedEnvs();
    const prometheusUrl = env.PROMETHEUS_URL;

    if (!prometheusUrl) {
      return data({ error: 'Prometheus URL not configured' }, { status: 500 });
    }

    // Get session for authentication
    const sessionResponse = await getSession(request);
    const session = sessionResponse.session;

    if (!session?.accessToken) {
      return data({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize Prometheus service with server-side config
    const prometheusService = new PrometheusService({
      baseURL: prometheusUrl,
      timeout: 30000,
      retries: 1,
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    // Parse request body and handle the request
    const body = await request.json();
    const result = await prometheusService.handleAPIRequest(body);

    return data({ success: true, data: result });
  } catch (error) {
    console.error('Prometheus API error:', error);

    if (error instanceof PrometheusError) {
      return data(
        {
          error: error.message,
          type: error.type,
          details: error.details,
        },
        { status: error.statusCode }
      );
    }

    return data({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/prometheus
 * Health check and configuration info
 */
export async function loader() {
  try {
    const env = getSharedEnvs();
    const prometheusUrl = env.PROMETHEUS_URL;

    return data({
      configured: Boolean(prometheusUrl),
      url: prometheusUrl ? new URL(prometheusUrl).origin : null, // Only return origin for security
    });
  } catch (error) {
    console.error('Prometheus config check error:', error);
    return data({ error: 'Failed to check Prometheus configuration' }, { status: 500 });
  }
}
