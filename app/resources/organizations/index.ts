// Schema exports
export {
  organizationSchema,
  organizationListSchema,
  organizationTypeSchema,
  organizationStatusSchema,
  createOrganizationSchema,
  updateOrganizationSchema,
  organizationMetadataSchema,
  organizationFormSchema,
  updateOrganizationFormSchema,
  type Organization,
  type OrganizationList,
  type OrganizationType,
  type OrganizationStatus,
  type CreateOrganizationInput,
  type UpdateOrganizationInput,
  type OrganizationFormSchema,
  type UpdateOrganizationFormSchema,
} from './organization.schema';

// Adapter exports
export {
  toOrganization,
  toOrganizationList,
  toOrganizationFromMembership,
  toCreatePayload,
  toUpdatePayload,
} from './organization.adapter';

// Service exports
export {
  createOrganizationGqlService,
  organizationKeys,
  type OrganizationGqlService,
} from './organization.gql-service';

// Query hook exports (all GQL-backed)
export {
  useOrganizations,
  useOrganization,
  useOrganizationsGql,
  useCreateOrganizationGql,
  useUpdateOrganizationGql,
  useDeleteOrganizationGql,
} from './organization.gql-queries';
