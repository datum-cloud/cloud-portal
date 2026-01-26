import * as types from './graphql';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
  'query ListOrganizationMemberships {\n  listResourcemanagerMiloapisComV1alpha1OrganizationMembershipForAllNamespaces {\n    items {\n      spec {\n        organizationRef {\n          name\n        }\n        roles {\n          name\n          namespace\n        }\n        userRef {\n          name\n        }\n      }\n      metadata {\n        annotations\n        uid\n        name\n        namespace\n        labels\n        creationTimestamp\n      }\n      status {\n        organization {\n          displayName\n          type\n        }\n        conditions {\n          reason\n          status\n          type\n        }\n      }\n    }\n    metadata {\n      continue\n      remainingItemCount\n    }\n  }\n}': typeof types.ListOrganizationMembershipsDocument;
};
const documents: Documents = {
  'query ListOrganizationMemberships {\n  listResourcemanagerMiloapisComV1alpha1OrganizationMembershipForAllNamespaces {\n    items {\n      spec {\n        organizationRef {\n          name\n        }\n        roles {\n          name\n          namespace\n        }\n        userRef {\n          name\n        }\n      }\n      metadata {\n        annotations\n        uid\n        name\n        namespace\n        labels\n        creationTimestamp\n      }\n      status {\n        organization {\n          displayName\n          type\n        }\n        conditions {\n          reason\n          status\n          type\n        }\n      }\n    }\n    metadata {\n      continue\n      remainingItemCount\n    }\n  }\n}':
    types.ListOrganizationMembershipsDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'query ListOrganizationMemberships {\n  listResourcemanagerMiloapisComV1alpha1OrganizationMembershipForAllNamespaces {\n    items {\n      spec {\n        organizationRef {\n          name\n        }\n        roles {\n          name\n          namespace\n        }\n        userRef {\n          name\n        }\n      }\n      metadata {\n        annotations\n        uid\n        name\n        namespace\n        labels\n        creationTimestamp\n      }\n      status {\n        organization {\n          displayName\n          type\n        }\n        conditions {\n          reason\n          status\n          type\n        }\n      }\n    }\n    metadata {\n      continue\n      remainingItemCount\n    }\n  }\n}'
): typeof import('./graphql').ListOrganizationMembershipsDocument;

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
