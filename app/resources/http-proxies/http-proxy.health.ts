/**
 * Health check result for HTTP proxy endpoint
 */
export interface ProxyHealthCheckResult {
  /** Whether the health check succeeded */
  success: boolean;
  /** Response status code (if available) */
  statusCode?: number;
  /** Latency in milliseconds */
  latency?: number;
  /** Error message if health check failed */
  error?: string;
  /** Timestamp when the check was performed */
  timestamp: Date;
}

/**
 * Perform a health check on a proxy endpoint by making a request to the hostname
 * Uses server-side proxy to avoid CORS issues and get accurate status codes
 * @param hostname - The verified hostname to test (e.g., "example.com")
 * @param _timeout - Timeout in milliseconds (default: 5000) - currently not used, server uses default
 * @returns Health check result
 */
export async function checkProxyHealth(
  hostname: string,
  _timeout: number = 5000
): Promise<ProxyHealthCheckResult> {
  const timestamp = new Date();

  try {
    const response = await fetch(
      `/api/proxy-health/check?hostname=${encodeURIComponent(hostname)}`,
      {
        method: 'GET',
        credentials: 'include',
      }
    );

    const data = await response.json();

    return {
      success: data.success ?? false,
      statusCode: data.statusCode,
      latency: data.latency,
      error: data.error,
      timestamp: data.timestamp ? new Date(data.timestamp) : timestamp,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Health check failed',
      timestamp,
    };
  }
}
