import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { ServerIcon } from 'lucide-react';

interface ServiceCardProps {
  onCreate: () => void;
}

export const ServiceCard = ({ onCreate }: ServiceCardProps) => {
  return (
    <Card className="flex h-full flex-col py-8">
      <CardContent className="flex flex-1 flex-col px-8">
        <div className="flex flex-1 flex-col gap-6">
          <div className="flex size-[60px] items-center justify-center rounded-sm border px-2.5 py-3">
            <ServerIcon className="text-primary size-8" aria-hidden="true" />
          </div>

          <div className="space-y-3.5">
            <h3 className="text-lg font-medium">Service</h3>
            <p className="max-w-[400px] text-sm">
              Give a backend service or workload a stable identity to call Datum APIs without human
              credentials.
            </p>
            <ul className="marker:text-muted-foreground max-w-[400px] list-disc space-y-1.5 pl-5 text-sm">
              <li>Mount credentials as a Kubernetes secret or env vars</li>
              <li>Works with any language via JWT assertion exchange</li>
              <li>Disable or rotate keys without redeploying</li>
            </ul>
          </div>

          <div className="mt-auto pt-2">
            <Button
              type="primary"
              theme="solid"
              size="small"
              className="font-semibold"
              onClick={onCreate}>
              Create a service account
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
