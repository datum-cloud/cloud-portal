import {
  defaultOnboardingProjectDisplayName,
  type OrgContactInfoValues,
} from '@/features/onboarding/schemas/org-contact-info-schema';
import { logger } from '@/modules/logger';
import { retryOnTransientAuthError } from '@/resources/base/utils';
import { createBillingAccountBindingService } from '@/resources/billing-account-bindings';
import { createProjectService } from '@/resources/projects';
import { waitForProjectReady } from '@/resources/projects/project.watch';
import { useMutation, type UseMutationOptions } from '@tanstack/react-query';

export interface SetupOnboardingProjectInput {
  orgId: string;
  billingAccountName: string;
  contactInfo: OrgContactInfoValues;
}

export interface OnboardingProjectSetup {
  projectId: string;
  displayName: string;
}

function isActiveProjectBinding(
  binding: Awaited<
    ReturnType<ReturnType<typeof createBillingAccountBindingService>['list']>
  >[number],
  projectName: string,
  billingAccountName: string
): boolean {
  return (
    binding.spec?.projectRef?.name === projectName &&
    binding.spec?.billingAccountRef?.name === billingAccountName &&
    (!binding.status?.phase || binding.status.phase === 'Active')
  );
}

async function ensureProjectBillingBinding(
  orgId: string,
  projectName: string,
  billingAccountName: string
): Promise<void> {
  let bindings: Awaited<ReturnType<ReturnType<typeof createBillingAccountBindingService>['list']>> =
    [];
  try {
    bindings = await createBillingAccountBindingService().list(orgId);
  } catch (error) {
    logger.warn(`Could not list billing bindings for ${orgId} before onboarding bind`, {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  if (
    bindings.some((binding) => isActiveProjectBinding(binding, projectName, billingAccountName))
  ) {
    return;
  }

  await retryOnTransientAuthError(
    () =>
      createBillingAccountBindingService().create({
        orgId,
        projectName,
        billingAccountName,
      }),
    {
      operation: 'onboarding.bindProjectBilling',
      attempts: 10,
      baseDelayMs: 1000,
      maxDelayMs: 12000,
    }
  );
}

/** Creates (or reuses) the org's first project and binds it to the onboarding billing account. */
export async function setupOnboardingProject(
  input: SetupOnboardingProjectInput
): Promise<OnboardingProjectSetup> {
  const displayName = defaultOnboardingProjectDisplayName(input.contactInfo);
  const existingProjects = await createProjectService().list(input.orgId);
  let project = existingProjects.items[0];

  if (!project) {
    const created = await retryOnTransientAuthError(
      () =>
        createProjectService().create({
          description: displayName,
          organizationId: input.orgId,
        }),
      {
        operation: 'onboarding.createProject',
        attempts: 10,
        baseDelayMs: 1000,
        maxDelayMs: 12000,
      }
    );

    const { promise, cancel } = waitForProjectReady(input.orgId, created.name);
    try {
      project = await promise;
    } finally {
      cancel();
    }
  }

  await ensureProjectBillingBinding(input.orgId, project.name, input.billingAccountName);

  return {
    projectId: project.name,
    displayName: project.displayName?.trim() || displayName,
  };
}

/** Binds every project in the org to the given billing account (idempotent). */
export async function bindAllOrgProjectsToBillingAccount(
  orgId: string,
  billingAccountName: string
): Promise<void> {
  const projects = await createProjectService().list(orgId);

  await Promise.all(
    projects.items.map((project) =>
      ensureProjectBillingBinding(orgId, project.name, billingAccountName)
    )
  );
}

export interface CompleteLegacyOrgSetupInput {
  orgId: string;
  billingAccountName: string;
  contactInfo: OrgContactInfoValues;
}

export interface CompleteLegacyOrgSetupResult {
  /** Set when the org had no projects and one was created. */
  projectId?: string;
}

/**
 * Legacy billing completion — bind existing projects, creating one only when
 * the org has none. Does not navigate to provisioning.
 */
export async function completeLegacyOrgSetup(
  input: CompleteLegacyOrgSetupInput
): Promise<CompleteLegacyOrgSetupResult> {
  const projects = await createProjectService().list(input.orgId);

  if (projects.items.length === 0) {
    const setup = await setupOnboardingProject(input);
    return { projectId: setup.projectId };
  }

  await bindAllOrgProjectsToBillingAccount(input.orgId, input.billingAccountName);
  return {};
}

export function useCompleteLegacyOrgSetup(
  options?: UseMutationOptions<CompleteLegacyOrgSetupResult, Error, CompleteLegacyOrgSetupInput>
) {
  return useMutation({
    mutationFn: completeLegacyOrgSetup,
    ...options,
  });
}

export function useSetupOnboardingProject(
  options?: UseMutationOptions<OnboardingProjectSetup, Error, SetupOnboardingProjectInput>
) {
  return useMutation({
    mutationFn: setupOnboardingProject,
    ...options,
  });
}
