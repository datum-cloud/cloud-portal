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
    <Alert variant="info">
      <SignalHighIcon className="text-info-500 size-4" />
      <AlertTitle className="dark:text-info-300">Want to see some metrics in Grafana?</AlertTitle>
      <AlertDescription className="dark:text-info-500">
        <p>
          Learn how to export metrics from your Datum project to Grafana Cloud using Prometheus
          remote write. This tutorial walks you through generating credentials, configuring secrets,
          and setting up an ExportPolicy.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            navigate(
              getPathWithParams(paths.project.detail.httpProxy.detail.grafana, {
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
