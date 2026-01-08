// Schema exports
export {
  projectSchema,
  projectListSchema,
  projectStatusSchema,
  createProjectSchema,
  updateProjectSchema,
  projectFormSchema,
  updateProjectFormSchema,
  type Project,
  type ProjectList,
  type ProjectStatus,
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
  useHydrateProjects,
  useHydrateProject,
} from './project.queries';

// Watch hook exports (only list watch - single project watch not supported for cluster-scoped resources)
export { useProjectsWatch } from './project.watch';
