import {
  checkProxyHealth,
  type ProxyHealthCheckResult,
} from '@/resources/http-proxies/http-proxy.health';
import { useState, useCallback } from 'react';

/**
 * Hook for performing proxy health checks
 */
export function useProxyHealthCheck() {
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<ProxyHealthCheckResult | null>(null);

  const performCheck = useCallback(async (hostname: string | undefined, timeout?: number) => {
    if (!hostname) {
      setResult({
        success: false,
        error: 'No hostname available for health check',
        timestamp: new Date(),
      });
      return;
    }

    setIsChecking(true);
    try {
      const healthResult = await checkProxyHealth(hostname, timeout);
      setResult(healthResult);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Health check failed',
        timestamp: new Date(),
      });
    } finally {
      setIsChecking(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
  }, []);

  return {
    isChecking,
    result,
    performCheck,
    reset,
  };
}
