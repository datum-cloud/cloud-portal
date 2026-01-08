// Schema exports
export {
  domainResourceSchema,
  domainListSchema,
  createDomainInputSchema,
  updateDomainInputSchema,
  type Domain,
  type DomainList,
  type DomainNameserver,
  type DomainRegistration,
  type IDnsNameserver,
  type IDnsRegistration,
  type IDomainControlResponse,
  type CreateDomainInput,
  type UpdateDomainInput,
  // Re-exported validation schemas
  domainSchema,
  bulkDomainsSchema,
  type DomainSchema,
  type BulkDomainsSchema,
} from './domain.schema';

// Adapter exports
export {
  toDomain,
  toDomainList,
  toCreateDomainPayload,
  toUpdateDomainPayload,
  toRefreshRegistrationPayload,
} from './domain.adapter';

// Service exports
export { createDomainService, domainKeys, type DomainService } from './domain.service';

// Query hook exports
export {
  useDomains,
  useDomain,
  useCreateDomain,
  useUpdateDomain,
  useDeleteDomain,
  useBulkCreateDomains,
  useRefreshDomainRegistration,
  useHydrateDomains,
  useHydrateDomain,
} from './domain.queries';

// Watch hook exports
export * from './domain.watch';
