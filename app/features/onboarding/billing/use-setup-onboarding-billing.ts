import {
  orgDisplayNameFromContact,
  toBillingAccountContactInfo,
  toOrganizationContactInfo,
  type OrgContactInfoValues,
} from '@/features/onboarding/schemas/org-contact-info-schema';
import { logger } from '@/modules/logger';
import { createBillingAccountService } from '@/resources/billing-accounts';
import { createOrganizationService } from '@/resources/organizations';
import { buildOrganizationNamespace } from '@/utils/common';
import { useMutation, type UseMutationOptions } from '@tanstack/react-query';

export interface OnboardingBillingSetup {
  orgId: string;
  accountName: string;
  namespace: string;
}

export interface SetupOnboardingBillingInput {
  contactInfo: OrgContactInfoValues;
  /** When org was created but billing account creation failed, retry billing only. */
  existingOrgId?: string;
  /** When both org and billing account already exist, update contact info in place. */
  existingSetup?: OnboardingBillingSetup;
}

export function useSetupOnboardingBilling(
  options?: UseMutationOptions<OnboardingBillingSetup, Error, SetupOnboardingBillingInput>
) {
  return useMutation({
    mutationFn: async ({ contactInfo, existingOrgId, existingSetup }) => {
      const displayName = orgDisplayNameFromContact(contactInfo);
      const orgContact = toOrganizationContactInfo(contactInfo);
      const billingContact = toBillingAccountContactInfo(contactInfo);

      if (existingSetup) {
        await createOrganizationService().updateContactInfo(existingSetup.orgId, {
          displayName,
          contactInfo: orgContact,
        });
        await createBillingAccountService().update(existingSetup.orgId, existingSetup.accountName, {
          displayName,
          contactInfo: billingContact,
        });
        return existingSetup;
      }

      let orgId = existingOrgId;
      const createdOrgInThisRequest = !orgId;

      if (!orgId) {
        const org = await createOrganizationService().createOnboarding({
          displayName,
          contactInfo: orgContact,
        });
        orgId = org.name;
      }

      try {
        const account = await createBillingAccountService().create({
          orgId,
          displayName,
          name: billingContact.name,
          invoiceEmails: billingContact.invoiceEmails,
          businessName: billingContact.businessName,
          address: billingContact.address,
        });

        const accountName = account.metadata?.name;
        if (!accountName) {
          throw new Error('Billing account was created without a resource name');
        }

        return {
          orgId,
          accountName,
          namespace: buildOrganizationNamespace(orgId),
        };
      } catch (error) {
        if (createdOrgInThisRequest) {
          try {
            await createOrganizationService().delete(orgId);
          } catch (rollbackError) {
            logger.error(
              `Failed to roll back organization ${orgId} after billing setup failed`,
              rollbackError as Error
            );
          }
        }
        throw error;
      }
    },
    ...options,
  });
}
