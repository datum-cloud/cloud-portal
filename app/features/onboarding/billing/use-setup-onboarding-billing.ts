import {
  orgDisplayNameFromContact,
  toBillingAccountContactInfo,
  toOrganizationContactInfo,
  toOrganizationContactInfoPatch,
  type OrgContactInfoValues,
} from '@/features/onboarding/schemas/org-contact-info-schema';
import { logger } from '@/modules/logger';
import { retryOnTransientAuthError } from '@/resources/base/utils';
import { createBillingAccountService } from '@/resources/billing-accounts';
import { slugifyBillingAccountName } from '@/resources/billing/_naming';
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
  /**
   * Explicit organization display name. When provided (e.g. the "Organization
   * name" field in the standalone create-org flow) it wins over the name we'd
   * otherwise derive from contact/business details. Falls back to the derived
   * name when blank so the onboarding flow is unaffected.
   */
  displayNameOverride?: string;
  /** When org was created but billing account creation failed, retry billing only. */
  existingOrgId?: string;
  /** When both org and billing account already exist, update contact info in place. */
  existingSetup?: OnboardingBillingSetup;
}

export function useSetupOnboardingBilling(
  options?: UseMutationOptions<OnboardingBillingSetup, Error, SetupOnboardingBillingInput>
) {
  return useMutation({
    mutationFn: async ({ contactInfo, displayNameOverride, existingOrgId, existingSetup }) => {
      const displayName = displayNameOverride?.trim() || orgDisplayNameFromContact(contactInfo);
      const billingContact = toBillingAccountContactInfo(contactInfo);
      const intendedAccountName = slugifyBillingAccountName(displayName);

      if (existingSetup) {
        const org = await createOrganizationService().get(existingSetup.orgId);
        await createOrganizationService().updateContactInfo(existingSetup.orgId, {
          displayName,
          contactInfo: toOrganizationContactInfoPatch(contactInfo, org.contactInfo),
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
          contactInfo: toOrganizationContactInfo(contactInfo),
        });
        orgId = org.name;
      } else {
        const org = await createOrganizationService().get(orgId);
        await createOrganizationService().updateContactInfo(orgId, {
          displayName,
          contactInfo: toOrganizationContactInfoPatch(contactInfo, org.contactInfo),
        });
      }

      const namespace = buildOrganizationNamespace(orgId);

      try {
        // Wait for owner PolicyBindings via the membership status (user-scoped
        // read — no OpenFGA checks). Do not poll SAR here: each denied check
        // refreshes OpenFGA's 30s query cache and can block the first create for
        // tens of seconds even after PolicyBinding is Ready.
        await createOrganizationService().waitForOwnerGrantReady(orgId);

        const account = await retryOnTransientAuthError(
          () =>
            createBillingAccountService().create({
              orgId,
              displayName,
              name: billingContact.name,
              invoiceEmails: billingContact.invoiceEmails,
              businessName: billingContact.businessName,
              address: billingContact.address,
              accountName: intendedAccountName,
            }),
          {
            operation: 'onboarding.createBillingAccount',
            attempts: 4,
            baseDelayMs: 500,
            maxDelayMs: 2000,
          }
        );

        const accountName = account.metadata?.name;
        if (!accountName) {
          throw new Error('Billing account was created without a resource name');
        }

        return {
          orgId,
          accountName,
          namespace,
        };
      } catch (error) {
        const recovered = await createBillingAccountService().recoverFromAmbiguousCreateFailure(
          orgId,
          intendedAccountName
        );
        if (recovered?.metadata?.name) {
          return {
            orgId,
            accountName: recovered.metadata.name,
            namespace,
          };
        }

        if (createdOrgInThisRequest) {
          // Never tear down an org that already has a billing account. The
          // create can report a transient failure to the client *after* the
          // account (and possibly a payment method / attached card) exist
          // server-side; deleting the org here would destroy that healthy
          // state. Only roll back a bare org that never got its account.
          let hasBillingAccount = false;
          try {
            const accounts = await createBillingAccountService().list(orgId);
            hasBillingAccount = accounts.length > 0;
          } catch (listError) {
            logger.warn(
              `Could not confirm billing account state for ${orgId} before rollback; skipping delete to avoid destroying a partial setup`,
              { error: listError instanceof Error ? listError.message : String(listError) }
            );
            hasBillingAccount = true;
          }

          if (hasBillingAccount) {
            logger.warn(
              `Skipping rollback of ${orgId}: a billing account already exists, leaving it as a resumable partial setup`
            );
          } else {
            try {
              await createOrganizationService().delete(orgId);
            } catch (rollbackError) {
              logger.error(
                `Failed to roll back organization ${orgId} after billing setup failed`,
                rollbackError as Error
              );
            }
          }
        }
        throw error;
      }
    },
    ...options,
  });
}
