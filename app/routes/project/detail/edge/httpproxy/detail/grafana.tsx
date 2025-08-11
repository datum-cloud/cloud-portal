import { PageTitle } from '@/components/page-title/page-title';
import { GrafanaCompletedCard } from '@/features/edge/httpproxy/grafana/completed-card';
import GrafanaStepperForm from '@/features/edge/httpproxy/grafana/stepper-form';
import { useState } from 'react';
import { useParams } from 'react-router';

export default function HttpProxyGrafanaPage() {
  const { projectId, proxyId } = useParams();
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 py-8">
      {isCompleted ? (
        <GrafanaCompletedCard projectId={projectId ?? ''} proxyId={proxyId ?? ''} />
      ) : (
        <>
          <PageTitle
            title="Integrate Your Service with Grafana"
            description="Follow this step-by-step guide to connect your service with Grafana Cloud and start monitoring your data."
          />
          <GrafanaStepperForm projectId={projectId ?? ''} onComplete={() => setIsCompleted(true)} />
        </>
      )}
    </div>
  );
}
