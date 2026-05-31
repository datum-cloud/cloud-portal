import { RestrictedState } from '@/components/restricted-state/restricted-state';
import { ExportPolicyComingSoonCard } from '@/features/metric/export-policies/card/coming-soon-card';
import { ExportPolicyGrafanaCard } from '@/features/metric/export-policies/card/grafana-card';
import { gateRouteAccess } from '@/modules/rbac/server/check-permission';
import { BadRequestError, withLoaderErrors } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { useEffect, useRef } from 'react';
import {
  data,
  type LoaderFunctionArgs,
  type MetaFunction,
  useLoaderData,
  useParams,
  useSearchParams,
} from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Create an Export Policy');
});

export const loader = withLoaderErrors(async (args: LoaderFunctionArgs) => {
  const projectId = args.params.projectId;
  if (!projectId) throw new BadRequestError('Project ID is required');

  const allowed = await gateRouteAccess(projectId, {
    resource: 'exportpolicies',
    verb: 'create',
    group: 'telemetry.miloapis.com',
    scope: 'project',
  });

  if (!allowed) return data({ restricted: true as const });
  return data({ restricted: false as const });
});

export default function ExportPoliciesNewPage() {
  const loaderData = useLoaderData<typeof loader>();

  if (loaderData.restricted) {
    return (
      <RestrictedState
        title="Access restricted"
        message="You don't have permission to create export policies."
      />
    );
  }

  return <NewForm />;
}

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
