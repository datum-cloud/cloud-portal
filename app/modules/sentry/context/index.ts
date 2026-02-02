/**
 * Sentry Context Module
 *
 * Hierarchical context enrichment for multi-tenant applications:
 * User → Organization → Project → Resource
 */

export { setSentryUser, clearSentryUser, type SentryUser } from './user';

export {
  setSentryOrgContext,
  clearSentryOrgContext,
  type OrganizationContext,
} from './organization';

export { setSentryProjectContext, clearSentryProjectContext, type ProjectContext } from './project';

export {
  parseApiVersion,
  isKubernetesResource,
  setSentryResourceContext,
  clearSentryResourceContext,
  type KubernetesResource,
} from './resource';
