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
  organizationContactInfoSchema,
  type Organization,
  type OrganizationContactInfo,
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
  createOrganizationService,
  organizationKeys,
  type OrganizationService,
} from './organization.service';

// Query hook exports
export {
  useOrganizations,
  useOrganizationsInfinite,
  useOrganization,
  useCreateOrganization,
  useUpdateOrganization,
  useUpdateOrganizationContactInfo,
  useDeleteOrganization,
  type UpdateOrganizationContactInfoVariables,
} from './organization.queries';

// GraphQL Service exports
export {
  createOrganizationGqlService,
  type OrganizationGqlService,
} from './organization.gql-service';

// GraphQL Query hook exports
export {
  useOrganizationsGql,
  useCreateOrganizationGql,
  useUpdateOrganizationGql,
  useDeleteOrganizationGql,
} from './organization.gql-queries';
