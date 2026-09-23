import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Text } from '@datum-cloud/datum-ui/typography';
import { GitBranchIcon } from 'lucide-react';

interface CiCdCardProps {
  onCreate: () => void;
}

export const CiCdCard = ({ onCreate }: CiCdCardProps) => {
  return (
    <Card className="flex h-full flex-col py-8">
      <CardContent className="flex flex-1 flex-col px-8">
        <div className="flex flex-1 flex-col gap-6">
          <div className="flex size-[60px] items-center justify-center rounded-sm border px-2.5 py-3">
            <GitBranchIcon className="text-primary size-8" aria-hidden="true" />
          </div>

          <div className="space-y-3.5">
            <Text as="h3" size="lg" weight="medium">
              CI/CD Pipeline
            </Text>
            <Text as="p" className="max-w-[400px]">
              Authenticate automated jobs in GitHub Actions, GitLab CI, Jenkins, or any other
              pipeline.
            </Text>
            <ul className="marker:text-muted-foreground max-w-[400px] list-disc space-y-1.5 pl-5 text-sm">
              <li>Generates a credentials file you store as a CI secret</li>
              <li>Step-by-step setup instructions for GitHub Actions and GitLab CI</li>
              <li>Rotate keys without changing workflow files</li>
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
