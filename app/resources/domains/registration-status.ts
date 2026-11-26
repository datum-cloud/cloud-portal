import type { DomainRegistration } from './domain.schema';

export interface RegistrationStatusLabel {
  /** Raw value as received. */
  code: string;
  /** Plain English, or the raw code when unknown. */
  label: string;
  tone: 'neutral' | 'warning';
}

const TRANSFER_REGISTRAR = 'Transfer locked (registrar)';
const TRANSFER_REGISTRY = 'Transfer locked (registry)';
const CHANGES_LOCKED = 'Changes locked';
const DELETION_LOCKED = 'Deletion locked';
const ON_HOLD = 'On hold: not in DNS';
const RECENTLY_RENEWED = 'Recently renewed';
const RENEWAL_LOCKED = 'Renewal locked';

// Keys are lowercased with spaces removed, so RDAP ("client transfer prohibited")
// and EPP ("clientTransferProhibited") strings share one key.
const STATUS_LABELS: Readonly<Record<string, string>> = {
  ok: 'Active',
  active: 'Active',
  clienttransferprohibited: TRANSFER_REGISTRAR,
  servertransferprohibited: TRANSFER_REGISTRY,
  clientupdateprohibited: CHANGES_LOCKED,
  serverupdateprohibited: CHANGES_LOCKED,
  clientdeleteprohibited: DELETION_LOCKED,
  serverdeleteprohibited: DELETION_LOCKED,
  clientrenewprohibited: RENEWAL_LOCKED,
  serverrenewprohibited: RENEWAL_LOCKED,
  clienthold: ON_HOLD,
  serverhold: ON_HOLD,
  pendingdelete: 'Pending deletion',
  pendingtransfer: 'Transfer pending',
  redemptionperiod: 'In redemption period',
  addperiod: 'Recently registered',
  transferperiod: 'Recently transferred',
  autorenewperiod: RECENTLY_RENEWED,
  renewperiod: RECENTLY_RENEWED,
  inactive: 'Inactive',
};

const WARNING_KEYS: ReadonlySet<string> = new Set([
  'clienthold',
  'serverhold',
  'pendingdelete',
  'redemptionperiod',
]);

function normaliseStatusCode(code: string): string {
  return code.toLowerCase().replace(/\s+/g, '');
}

export function describeRegistrationStatus(code: string): RegistrationStatusLabel {
  const key = normaliseStatusCode(code);
  return {
    code,
    label: STATUS_LABELS[key] ?? code,
    tone: WARNING_KEYS.has(key) ? 'warning' : 'neutral',
  };
}

/**
 * When the registration was last looked up, or undefined when that's missing
 * or not a date, so callers never pass an unparseable value to DateTime.
 */
export function registrationCheckedAt(
  registration?: DomainRegistration | null
): string | undefined {
  const value = registration?.lastRefreshAttempt;
  return value && !Number.isNaN(Date.parse(value)) ? value : undefined;
}
