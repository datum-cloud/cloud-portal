import { GrafanaDialog } from '@/features/metric/export-policies/providers/grafana';
import { Button, Card, CardContent } from '@datum-ui/components';
import { useState } from 'react';

interface ExportPolicyGrafanaCardProps {
  projectId: string;
}

export const ExportPolicyGrafanaCard = ({ projectId }: ExportPolicyGrafanaCardProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card className="py-8">
        <CardContent className="px-8">
          <div className="space-y-6">
            <div className="flex size-[60px] items-center justify-center rounded-sm border px-2.5 py-3">
              <img src="/images/providers/grafana.svg" alt="Grafana" className="size-10" />
            </div>

            <div className="space-y-3.5">
              <h3 className="text-lg font-medium">Export to Grafana Cloud</h3>
              <p className="max-w-[400px] text-sm">
                Export metrics from your Datum project to Grafana Cloud. Generate credentials,
                configure secrets, and set up Prometheus at the click of a button.
              </p>
            </div>

            <Button
              type="primary"
              theme="solid"
              size="small"
              className="font-semibold"
              onClick={() => setOpen(true)}>
              Create the export policy
            </Button>
          </div>
        </CardContent>
      </Card>

      <GrafanaDialog projectId={projectId} open={open} onOpenChange={setOpen} />
    </>
  );
};
