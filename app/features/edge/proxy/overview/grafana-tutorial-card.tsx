import { IHttpProxyControlResponse } from '@/resources/interfaces/http-proxy.interface';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Alert, AlertDescription, AlertTitle } from '@datum-ui/components';
import { Button } from '@datum-ui/components';
import { ExternalLinkIcon, SignalHighIcon } from 'lucide-react';
import { useNavigate } from 'react-router';

export const GrafanaTutorialCard = ({
  projectId,
  proxy,
}: {
  projectId: string;
  proxy: IHttpProxyControlResponse;
}) => {
  const navigate = useNavigate();
  return (
    <Alert variant="default" className="bg-card text-card-foreground">
      <SignalHighIcon className="size-4" />
      <AlertTitle>Want to see some metrics in Grafana?</AlertTitle>
      <AlertDescription>
        <p>
          Learn how to export metrics from your Datum project to Grafana Cloud using Prometheus
          remote write. This tutorial walks you through generating credentials, configuring secrets,
          and setting up an ExportPolicy.
        </p>
        <Button
          type="quaternary"
          theme="outline"
          size="small"
          onClick={() => {
            navigate(
              getPathWithParams(paths.project.detail.proxy.detail.grafana, {
                projectId,
                proxyId: proxy?.name,
              })
            );
          }}
          className="mt-2 flex items-center gap-1">
          <ExternalLinkIcon className="size-4" />
          Follow the tutorial
        </Button>
      </AlertDescription>
    </Alert>
  );
};
