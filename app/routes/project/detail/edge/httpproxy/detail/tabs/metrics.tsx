import { HttpProxyUpstreamLatency } from '@/features/edge/httpproxy/metrics/upstream-latency';
import { HttpProxyUpstreamResponse } from '@/features/edge/httpproxy/metrics/upstream-response';
import { HttpProxyUpstreamRps } from '@/features/edge/httpproxy/metrics/upstream-rps';
import { MetricsControls, MetricsProvider } from '@/modules/metrics';
import { useParams } from 'react-router';

export default function HttpProxyMetrics() {
  const { projectId, proxyId } = useParams();
  // const projectId = 'jreese-test-5d2p7z';
  // const proxyId = 'httpproxy-sample-example-com';
  return (
    <MetricsProvider>
      <div className="flex flex-col gap-6">
        <MetricsControls />
        <div className="grid grid-cols-1 gap-6">
          <HttpProxyUpstreamLatency projectId={projectId ?? ''} proxyId={proxyId ?? ''} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <HttpProxyUpstreamRps projectId={projectId ?? ''} proxyId={proxyId ?? ''} />
            <HttpProxyUpstreamResponse projectId={projectId ?? ''} proxyId={proxyId ?? ''} />
          </div>
        </div>
      </div>
    </MetricsProvider>
  );
}
