import types from './types.esm';
import {
  linkTypeMap,
  createClient as createClientOriginal,
  generateGraphqlOperation,
  assertSameVersion,
} from '@gqlts/runtime';

var typeMap = linkTypeMap(types);
export * from './guards.esm';

export var version = '3.3.0';
assertSameVersion(version);

export var createClient = function (options) {
  options = options || {};
  var optionsCopy = {
    url: undefined,
    queryRoot: typeMap.Query,
    mutationRoot: typeMap.Mutation,
    subscriptionRoot: typeMap.Subscription,
  };
  for (var name in options) {
    optionsCopy[name] = options[name];
  }
  return createClientOriginal(optionsCopy);
};

export const enumqueryListResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembershipItemsItemsStatusAppliedRolesItemsStatus =
  {
    Applied: 'Applied',
    Pending: 'Pending',
    Failed: 'Failed',
  };

export const enumqueryListResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembershipItemsItemsStatusConditionsItemsStatus =
  {
    True: 'True',
    False: 'False',
    Unknown: 'Unknown',
  };

export const enumqueryListResourcemanagerMiloapisComV1Alpha1OrganizationItemsItemsSpecType = {
  Personal: 'Personal',
  Standard: 'Standard',
};

export const enumqueryListResourcemanagerMiloapisComV1Alpha1OrganizationItemsItemsStatusConditionsItemsStatus =
  {
    True: 'True',
    False: 'False',
    Unknown: 'Unknown',
  };

export var generateQueryOp = function (fields) {
  return generateGraphqlOperation('query', typeMap.Query, fields);
};
export var generateMutationOp = function (fields) {
  return generateGraphqlOperation('mutation', typeMap.Mutation, fields);
};
export var generateSubscriptionOp = function (fields) {
  return generateGraphqlOperation('subscription', typeMap.Subscription, fields);
};
export var everything = {
  __scalar: true,
};
