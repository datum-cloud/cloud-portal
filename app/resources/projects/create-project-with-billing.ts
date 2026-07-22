import type { CreateProjectInput, Project } from './project.schema';
import { createProjectService } from './project.service';
import { awaitProjectReady } from './project.watch';
import { createBillingAccountBindingService } from '@/resources/billing-account-bindings';

/**
 * Creates a project, waits for it to become Ready, then links it to the org's
 * default billing account. Binding is best-effort so project creation still
 * succeeds when billing is not yet provisioned.
 */
export async function createProjectWithBillingBind(input: CreateProjectInput): Promise<Project> {
  const created = await createProjectService().create(input);
  const ready = await awaitProjectReady(input.organizationId, created.name, created);

  await createBillingAccountBindingService().bindProjectToDefaultOrgAccount(
    input.organizationId,
    ready.name
  );

  return ready;
}
