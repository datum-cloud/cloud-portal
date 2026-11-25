import { Button } from '@datum-cloud/datum-ui/button';
import { useRequestQuotaIncrease, useResourceQuota } from '@datum-cloud/portal-plugin-sdk';
import { useState } from 'react';

const DNS_ZONES = 'dns.networking.miloapis.com/dnszones';

/**
 * A quota-gated create action (SDK 1.1.0+): disabled with the portal's reason
 * when the project's DNS zone quota is used up, with a "Request increase"
 * action that opens the portal's prefilled quota increase request.
 *
 * DNS zones fail open, so this gates on `denied` only: if the host can't read
 * the quota (`isUnknown`), the action stays enabled and the API's 403 is the
 * real gate. For a resource that defaults to zero, such as public IPv4, gate
 * on `denied || isUnknown` instead.
 *
 * The create itself is a stand-in: this sample doesn't create anything.
 */
export function QuotaGatedCreate() {
  const quota = useResourceQuota({ resourceType: DNS_ZONES, scope: 'project' });
  const requestIncrease = useRequestQuotaIncrease();
  const [created, setCreated] = useState(false);

  return (
    <div data-testid="sample-plugin-quota" className="flex flex-col gap-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          htmlType="button"
          type="primary"
          size="small"
          data-testid="sample-plugin-quota-create"
          disabled={quota.isLoading || quota.denied}
          onClick={() => setCreated(true)}>
          Create DNS zone
        </Button>
        {quota.denied && (
          <Button
            htmlType="button"
            type="secondary"
            theme="outline"
            size="small"
            data-testid="sample-plugin-quota-request"
            onClick={() =>
              requestIncrease({
                resourceType: DNS_ZONES,
                scope: 'project',
                context: 'Requested from the sample plugin.',
              })
            }>
            Request increase
          </Button>
        )}
      </div>
      <p data-testid="sample-plugin-quota-status" className="text-muted-foreground">
        {quota.isLoading
          ? 'Checking quota…'
          : quota.denied
            ? quota.deniedReason
            : quota.isUnknown
              ? 'Quota unknown; the API will enforce it.'
              : `${quota.available} of ${quota.limit} DNS zones left.`}
        {created && ' (Create clicked: this sample does not create anything.)'}
      </p>
    </div>
  );
}
