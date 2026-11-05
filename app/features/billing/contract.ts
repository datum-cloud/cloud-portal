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
  /** "$5,000" or "$2,400 / month". */
  amount: string;
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

function contractFee(fee: StatusContractFee): ContractFee {
  const suffix =
    fee.chargeType === 'Recurring' && fee.interval ? INTERVAL_SUFFIX[fee.interval] : '';
  return {
    name: fee.name,
    label: fee.displayName || fee.name,
    chargeType: fee.chargeType,
    amount: `${formatCurrencyAmount(fee.amount, fee.currency)}${suffix}`,
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
