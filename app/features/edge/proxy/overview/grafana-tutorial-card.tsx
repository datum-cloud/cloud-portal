import { GrafanaDialog } from '@/features/metric/export-policies/providers/grafana';
import { Alert, AlertDescription, AlertTitle } from '@datum-ui/components';
import { Button } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { ExternalLinkIcon, SignalHighIcon } from 'lucide-react';
import { useState } from 'react';

export const GrafanaTutorialCard = ({ projectId }: { projectId: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Alert variant="default" className="bg-card text-card-foreground rounded-xl shadow">
        <Icon icon={SignalHighIcon} className="size-4" />
        <AlertTitle>Want to see some metrics in Grafana?</AlertTitle>
        <AlertDescription>
          <p>
            Learn how to export metrics from your Datum project to Grafana Cloud using Prometheus
            remote write. This tutorial walks you through generating credentials, configuring
            secrets, and setting up an ExportPolicy.
          </p>
          <Button
            type="quaternary"
            theme="outline"
            size="small"
            onClick={() => setOpen(true)}
            className="mt-2 flex items-center gap-1">
            <Icon icon={ExternalLinkIcon} className="size-4" />
            Follow the tutorial
          </Button>
        </AlertDescription>
      </Alert>
      <GrafanaDialog projectId={projectId} open={open} onOpenChange={setOpen} />
    </>
  );
};
