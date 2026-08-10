// Schema exports
export {
  projectSchema,
  projectListSchema,
  projectStatusSchema,
  projectSuspensionReasonSchema,
  projectSuspensionInfoSchema,
  createProjectSchema,
  updateProjectSchema,
  projectFormSchema,
  updateProjectFormSchema,
  type Project,
  type ProjectList,
  type ProjectStatus,
  type ProjectSuspensionReason,
  type ProjectSuspensionInfo,
  type CreateProjectInput,
  type UpdateProjectInput,
  type ProjectFormSchema,
  type UpdateProjectFormSchema,
} from './project.schema';

// Adapter exports
export { toProject, toProjectList, toCreatePayload, toUpdatePayload } from './project.adapter';

// Service exports
export { createProjectService, projectKeys, type ProjectService } from './project.service';

// Query hook exports
export {
  useProjects,
  useProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from './project.queries';

// Watch hook exports
export { useProjectsWatch, useProjectWatch, inspectProjectReady } from './project.watch';

export { createProjectWithBillingBind } from './create-project-with-billing';

export { isProjectDeleting, filterActiveProjects, isSelfDeleteNavigation } from './project.helpers';

export {
  waitForProjectAccessReady,
  findReadyProjectPolicyBinding,
  isProjectAccessGrantReady,
  policyBindingTargetsProject,
} from './project-access';
