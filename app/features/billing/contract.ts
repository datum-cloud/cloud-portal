/**
 * Projection helpers for the contract a billing account is billed under.
 *
 * Customers can't read the account's BillingEntitlement or its Offer, so
 * billing copies the contract and its fixed fees onto
 * `BillingAccount.status.contract`, as it copies discounts onto
 * `status.discounts`.
 */
import { formatCurrencyAmount } from './payment-terms';
import type { BillingAccount } from './types';

type StatusContract = NonNullable<NonNullable<BillingAccount['status']>['contract']>;
type StatusContractFee = NonNullable<StatusContract['fees']>[number];

export interface ContractFee {
  name: string;
  label: string;
  chargeType: StatusContractFee['chargeType'];
  /** What the fee charges, unit amount times quantity: "$5,000" or "$1,200 / month". */
  amount: string;
  /**
   * How the amount is made up, when it's more than one of something or has
   * a unit: "4 × $300 / port" or "3 × $8,000". Undefined for a single fee.
   */
  quantity?: string;
}

/** The account's contract, ready to render. */
export interface ContractSummary {
  startsAt: string;
  /** Whether the contract has started, as of `now`. */
  started: boolean;
  billingDayOfMonth: number;
  fees: ContractFee[];
  usageBilled: boolean;
}

const INTERVAL_SUFFIX: Record<NonNullable<StatusContractFee['interval']>, string> = {
  monthly: ' / month',
};

/**
 * A fee as the customer is charged it. Billing publishes the unit amount and
 * how many the contract charges (1 when unset), so the total is worked out
 * here, to the cent, as billing charges it.
 */
function contractFee(fee: StatusContractFee): ContractFee {
  const suffix =
    fee.chargeType === 'Recurring' && fee.interval ? INTERVAL_SUFFIX[fee.interval] : '';
  const quantity = fee.quantity && fee.quantity > 0 ? fee.quantity : 1;
  const unitAmount = Number(fee.amount);
  const total = Number.isFinite(unitAmount)
    ? Math.round(unitAmount * quantity * 100) / 100
    : fee.amount;
  const unitPrice = formatCurrencyAmount(fee.amount, fee.currency);
  const breakdown = fee.pricingUnit
    ? `${quantity} × ${unitPrice} / ${fee.pricingUnit}`
    : quantity > 1
      ? `${quantity} × ${unitPrice}`
      : undefined;
  return {
    name: fee.name,
    label: fee.displayName || fee.name,
    chargeType: fee.chargeType,
    amount: `${formatCurrencyAmount(total, fee.currency)}${suffix}`,
    ...(breakdown ? { quantity: breakdown } : {}),
  };
}

/**
 * The contract billing publishes on the account, or undefined when there is
 * none. Fees keep billing's order (one-time fees first) and are before
 * discounts, which `status.discounts` lists.
 */
export function contractSummary(
  account: BillingAccount | undefined,
  now: number
): ContractSummary | undefined {
  const contract = account?.status?.contract;
  if (!contract) return undefined;

  return {
    startsAt: contract.startsAt,
    started: Date.parse(contract.startsAt) <= now,
    billingDayOfMonth: contract.billingDayOfMonth,
    fees: (contract.fees ?? []).map(contractFee),
    usageBilled: contract.usageBilled ?? false,
  };
}
