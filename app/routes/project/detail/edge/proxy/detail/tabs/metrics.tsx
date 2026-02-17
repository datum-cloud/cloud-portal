import { PageTitle } from '@/components/page-title/page-title';
import { HttpProxyGlobalUpstreamLatency } from '@/features/edge/proxy/metrics/global-upstream-latency';
import { HttpProxyUpstreamResponse } from '@/features/edge/proxy/metrics/upstream-response';
import { HttpProxyUpstreamRps } from '@/features/edge/proxy/metrics/upstream-rps';
import { MetricsProvider, MetricsToolbar } from '@/modules/metrics';
import { RegionsFilter } from '@/modules/metrics/components/filters/regions-filter';
import { Col, Row } from '@datum-ui/components';
import { useParams } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Metrics</span>,
};

export default function HttpProxyMetrics() {
  const { projectId, proxyId } = useParams();
  return (
    <MetricsProvider>
      <Row gutter={[24, 32]}>
        <Col span={24}>
          <PageTitle title="Metrics" />
        </Col>
        <Col span={24}>
          <MetricsToolbar className="justify-between">
            <MetricsToolbar.Filters>
              <RegionsFilter />
            </MetricsToolbar.Filters>
            <MetricsToolbar.CoreControls />
          </MetricsToolbar>
        </Col>
        <Col span={24}>
          <HttpProxyGlobalUpstreamLatency projectId={projectId ?? ''} proxyId={proxyId ?? ''} />
        </Col>
        <Col span={12}>
          <HttpProxyUpstreamRps projectId={projectId ?? ''} proxyId={proxyId ?? ''} />
        </Col>
        <Col span={12}>
          <HttpProxyUpstreamResponse projectId={projectId ?? ''} proxyId={proxyId ?? ''} />
        </Col>
      </Row>
    </MetricsProvider>
  );
}
