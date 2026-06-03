import { ExportPolicyComingSoonCard } from '@/features/metric/export-policies/card/coming-soon-card';
import { ExportPolicyGrafanaCard } from '@/features/metric/export-policies/card/grafana-card';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runRouteGate } from '@/modules/rbac/run-resource-loader';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { useEffect, useRef } from 'react';
import { type LoaderFunctionArgs, useParams, useSearchParams } from 'react-router';

const route = defineResourceRoute({
  type: 'gate',
  restrictedTitle: 'Access restricted',
  restrictedMessage: "You don't have permission to create export policies.",
  metaTitle: 'Create an Export Policy',
});

export const loader = (args: LoaderFunctionArgs) =>
  runRouteGate(args, {
    resource: 'exportpolicies',
    verb: 'create',
    group: 'telemetry.miloapis.com',
    scope: 'project',
  });
export const meta = route.meta;

export default route.Page(() => <NewForm />);

function NewForm() {
  const { projectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // Capture initial open state from search params (read once via ref)
  const initialOpenRef = useRef(
    searchParams.get('action') === 'create' && searchParams.get('provider') === 'grafana'
  );

  // Clean up search params after mount
  useEffect(() => {
    if (searchParams.get('action') === 'create' && searchParams.get('provider') === 'grafana') {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('action');
      nextParams.delete('provider');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <div className="flex w-full flex-col gap-8">
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} className="w-full md:h-full">
          <ExportPolicyGrafanaCard
            projectId={projectId as string}
            defaultOpen={initialOpenRef.current}
          />
        </Col>
        <Col xs={24} md={12} className="w-full md:h-full">
          <ExportPolicyComingSoonCard />
        </Col>
      </Row>
    </div>
  );
}
