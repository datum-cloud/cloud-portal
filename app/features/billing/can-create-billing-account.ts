/**
 * Whether an organization can accept a newly-created billing account.
 *
 * RBAC is necessary but not sufficient — orgs entitled to a single
 * account can only create another when the multi-billing-accounts
 * feature quota is available.
 */
export function canOrgCreateBillingAccount(input: {
  canCreatePermission: boolean;
  existingAccountCount: number;
  multiBillingAccountsEnabled: boolean;
}): { allowed: boolean; reason?: string } {
  if (!input.canCreatePermission) {
    return {
      allowed: false,
      reason: "You don't have permission to create billing accounts in this organization",
    };
  }

  if (input.existingAccountCount === 0) {
    return { allowed: true };
  }

  if (input.multiBillingAccountsEnabled) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'This organization has reached its billing account quota',
  };
}
