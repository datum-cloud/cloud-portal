import { HttpProxyGlobalUpstreamLatency } from '@/features/edge/httpproxy/metrics/global-upstream-latency';
import { HttpProxyUpstreamResponse } from '@/features/edge/httpproxy/metrics/upstream-response';
import { HttpProxyUpstreamRps } from '@/features/edge/httpproxy/metrics/upstream-rps';
import { MetricsProvider, MetricsToolbar } from '@/modules/metrics';
import { useParams } from 'react-router';

export default function HttpProxyMetrics() {
  const { projectId, proxyId } = useParams();
  return (
    <MetricsProvider>
      <div className="flex flex-col gap-6">
        <MetricsToolbar className="justify-end">
          <MetricsToolbar.CoreControls />
        </MetricsToolbar>
        <div className="grid grid-cols-1 gap-6">
          <HttpProxyGlobalUpstreamLatency projectId={projectId ?? ''} proxyId={proxyId ?? ''} />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <HttpProxyUpstreamRps projectId={projectId ?? ''} proxyId={proxyId ?? ''} />
          <HttpProxyUpstreamResponse projectId={projectId ?? ''} proxyId={proxyId ?? ''} />
        </div>
      </div>
    </MetricsProvider>
  );
}
