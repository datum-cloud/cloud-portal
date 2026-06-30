import { BillingForm } from '@/features/onboarding/billing/billing-form';
import { paths } from '@/utils/config/paths.config';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { useNavigate } from 'react-router';

export type BillingPageData =
  | { status: 'empty' }
  | {
      status: 'ready';
      orgId: string;
      accountName: string;
      namespace: string;
      stripePublishableKey?: string;
    };

export const BillingPage = ({ data }: { data: BillingPageData }) => {
  const navigate = useNavigate();

  if (data.status === 'empty') {
    return (
      <Card className="bg-card text-foreground z-10 w-full max-w-full rounded-xl border p-3 sm:max-w-[410px] sm:p-4 md:p-6 lg:p-8 xl:p-[44px]">
        <CardContent className="flex flex-col gap-4 p-0 text-center">
          <h2 className="text-xl font-medium">No billing account yet</h2>
          <p className="text-muted-foreground text-sm">
            We couldn&apos;t find a billing account to set up. Once one exists for your
            organization, you&apos;ll be able to finish billing setup here.
          </p>
          <Button
            htmlType="button"
            type="primary"
            className="w-full"
            onClick={() => navigate(paths.account.organizations.root)}>
            Go to organizations
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <BillingForm
      orgId={data.orgId}
      accountName={data.accountName}
      namespace={data.namespace}
      stripePublishableKey={data.stripePublishableKey}
    />
  );
};
