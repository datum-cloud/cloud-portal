/**
 * Prometheus API middleware route
 * Handles Prometheus queries server-side with proper authentication and environment variables
 */
import { PrometheusError } from '@/modules/prometheus/errors';
import { getSharedEnvs } from '@/utils/config/env.config';
import { data, type ActionFunctionArgs } from 'react-router';

export const ROUTE_PATH = '/api/prometheus' as const;

/**
 * POST /api/prometheus
 * Handles Prometheus queries with server-side configuration
 */
export async function action({ context, request }: ActionFunctionArgs) {
  try {
    // Get Prometheus service from context (already initialized with refreshed token)
    const { prometheusService } = context as any;

    if (!prometheusService) {
      return data({ error: 'Service unavailable' }, { status: 503 });
    }

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
