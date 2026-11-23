import type { OrgBillingContext } from './layout';
import {
  BillingSection,
  ContractCard,
  DiscountsCard,
  PricingCard,
  accountDiscounts,
  contractSummary,
  priceList,
  summarizeDiscounts,
} from '@/features/billing';
import { paths } from '@/utils/config/paths.config';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Text } from '@datum-cloud/datum-ui/typography';
import { useMemo } from 'react';
import { type MetaFunction, Link, useOutletContext } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Subscriptions & Pricing</span>,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Subscriptions & Pricing'));

/**
 * What the account is billed at: its contract, when it has one, and every
 * price it pays, with its discounts. Read-only; staff set these up.
 */
export default function OrgBillingSubscriptionsPage() {
  const { orgId, account, renderedAt } = useOutletContext<OrgBillingContext>();

  const contract = useMemo(() => contractSummary(account, renderedAt), [account, renderedAt]);
  // One list of what the account pays: the contract's fees, any other plan
  // fees and the usage rates.
  const prices = useMemo(() => priceList(account, contract), [account, contract]);
  // Billing releases before `status.prices` only publish discounts.
  const pricesPublished = (account.status?.prices?.length ?? 0) > 0;
  const discounts = useMemo(() => accountDiscounts(account), [account]);
  const showDiscounts = !pricesPublished && !!summarizeDiscounts(discounts);

  const usageLink = (
    <Link
      to={getPathWithParams(paths.org.detail.usage, { orgId })}
      className="text-primary hover:text-primary/80 font-medium">
      See this period&apos;s usage
    </Link>
  );

  if (!contract && !prices && !showDiscounts) {
    return (
      <Text as="p" textColor="muted" data-e2e="billing-no-pricing">
        This account&apos;s prices aren&apos;t published yet. To ask about your plan, contact
        support.
      </Text>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {/* The contract card carries its own title, so it needs no section
          heading. */}
      {contract ? <ContractCard contract={contract} /> : null}

      {prices ? (
        <BillingSection
          title="Pricing"
          description="Everything this account is charged for, with your discounts: each fee and the rate for each kind of usage.">
          <PricingCard items={prices} usageLink={usageLink} />
        </BillingSection>
      ) : null}

      {showDiscounts ? (
        <BillingSection
          title="Discounts"
          description="Discounts that apply to this billing account's usage.">
          <DiscountsCard discounts={discounts} />
        </BillingSection>
      ) : null}
    </div>
  );
}
