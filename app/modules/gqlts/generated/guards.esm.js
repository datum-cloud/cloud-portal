var Query_possibleTypes = ['Query'];
export var isQuery = function (obj) {
  if (!obj || !obj.__typename) throw new Error('__typename is missing in "isQuery"');
  return Query_possibleTypes.includes(obj.__typename);
};

var io_k8s_apimachinery_pkg_apis_meta_v1_ObjectMeta_possibleTypes = [
  'io_k8s_apimachinery_pkg_apis_meta_v1_ObjectMeta',
];
export var isio_k8s_apimachinery_pkg_apis_meta_v1_ObjectMeta = function (obj) {
  if (!obj || !obj.__typename)
    throw new Error('__typename is missing in "isio_k8s_apimachinery_pkg_apis_meta_v1_ObjectMeta"');
  return io_k8s_apimachinery_pkg_apis_meta_v1_ObjectMeta_possibleTypes.includes(obj.__typename);
};

var io_k8s_apimachinery_pkg_apis_meta_v1_ManagedFieldsEntry_possibleTypes = [
  'io_k8s_apimachinery_pkg_apis_meta_v1_ManagedFieldsEntry',
];
export var isio_k8s_apimachinery_pkg_apis_meta_v1_ManagedFieldsEntry = function (obj) {
  if (!obj || !obj.__typename)
    throw new Error(
      '__typename is missing in "isio_k8s_apimachinery_pkg_apis_meta_v1_ManagedFieldsEntry"'
    );
  return io_k8s_apimachinery_pkg_apis_meta_v1_ManagedFieldsEntry_possibleTypes.includes(
    obj.__typename
  );
};

var io_k8s_apimachinery_pkg_apis_meta_v1_OwnerReference_possibleTypes = [
  'io_k8s_apimachinery_pkg_apis_meta_v1_OwnerReference',
];
export var isio_k8s_apimachinery_pkg_apis_meta_v1_OwnerReference = function (obj) {
  if (!obj || !obj.__typename)
    throw new Error(
      '__typename is missing in "isio_k8s_apimachinery_pkg_apis_meta_v1_OwnerReference"'
    );
  return io_k8s_apimachinery_pkg_apis_meta_v1_OwnerReference_possibleTypes.includes(obj.__typename);
};

var io_k8s_apimachinery_pkg_apis_meta_v1_ListMeta_possibleTypes = [
  'io_k8s_apimachinery_pkg_apis_meta_v1_ListMeta',
];
export var isio_k8s_apimachinery_pkg_apis_meta_v1_ListMeta = function (obj) {
  if (!obj || !obj.__typename)
    throw new Error('__typename is missing in "isio_k8s_apimachinery_pkg_apis_meta_v1_ListMeta"');
  return io_k8s_apimachinery_pkg_apis_meta_v1_ListMeta_possibleTypes.includes(obj.__typename);
};

var Mutation_possibleTypes = ['Mutation'];
export var isMutation = function (obj) {
  if (!obj || !obj.__typename) throw new Error('__typename is missing in "isMutation"');
  return Mutation_possibleTypes.includes(obj.__typename);
};

var io_k8s_apimachinery_pkg_apis_meta_v1_Status_possibleTypes = [
  'io_k8s_apimachinery_pkg_apis_meta_v1_Status',
];
export var isio_k8s_apimachinery_pkg_apis_meta_v1_Status = function (obj) {
  if (!obj || !obj.__typename)
    throw new Error('__typename is missing in "isio_k8s_apimachinery_pkg_apis_meta_v1_Status"');
  return io_k8s_apimachinery_pkg_apis_meta_v1_Status_possibleTypes.includes(obj.__typename);
};

var io_k8s_apimachinery_pkg_apis_meta_v1_StatusDetails_possibleTypes = [
  'io_k8s_apimachinery_pkg_apis_meta_v1_StatusDetails',
];
export var isio_k8s_apimachinery_pkg_apis_meta_v1_StatusDetails = function (obj) {
  if (!obj || !obj.__typename)
    throw new Error(
      '__typename is missing in "isio_k8s_apimachinery_pkg_apis_meta_v1_StatusDetails"'
    );
  return io_k8s_apimachinery_pkg_apis_meta_v1_StatusDetails_possibleTypes.includes(obj.__typename);
};

var io_k8s_apimachinery_pkg_apis_meta_v1_StatusCause_possibleTypes = [
  'io_k8s_apimachinery_pkg_apis_meta_v1_StatusCause',
];
export var isio_k8s_apimachinery_pkg_apis_meta_v1_StatusCause = function (obj) {
  if (!obj || !obj.__typename)
    throw new Error(
      '__typename is missing in "isio_k8s_apimachinery_pkg_apis_meta_v1_StatusCause"'
    );
  return io_k8s_apimachinery_pkg_apis_meta_v1_StatusCause_possibleTypes.includes(obj.__typename);
};

var com_miloapis_resourcemanager_v1alpha1_OrganizationMembershipList_possibleTypes = [
  'com_miloapis_resourcemanager_v1alpha1_OrganizationMembershipList',
];
export var iscom_miloapis_resourcemanager_v1alpha1_OrganizationMembershipList = function (obj) {
  if (!obj || !obj.__typename)
    throw new Error(
      '__typename is missing in "iscom_miloapis_resourcemanager_v1alpha1_OrganizationMembershipList"'
    );
  return com_miloapis_resourcemanager_v1alpha1_OrganizationMembershipList_possibleTypes.includes(
    obj.__typename
  );
};

var com_miloapis_resourcemanager_v1alpha1_OrganizationMembership_possibleTypes = [
  'com_miloapis_resourcemanager_v1alpha1_OrganizationMembership',
];
export var iscom_miloapis_resourcemanager_v1alpha1_OrganizationMembership = function (obj) {
  if (!obj || !obj.__typename)
    throw new Error(
      '__typename is missing in "iscom_miloapis_resourcemanager_v1alpha1_OrganizationMembership"'
    );
  return com_miloapis_resourcemanager_v1alpha1_OrganizationMembership_possibleTypes.includes(
    obj.__typename
  );
};

var query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_possibleTypes =
  ['query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec'];
export var isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec =
  function (obj) {
    if (!obj || !obj.__typename)
      throw new Error(
        '__typename is missing in "isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec"'
      );
    return query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_possibleTypes.includes(
      obj.__typename
    );
  };

var query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_organizationRef_possibleTypes =
  [
    'query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_organizationRef',
  ];
export var isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_organizationRef =
  function (obj) {
    if (!obj || !obj.__typename)
      throw new Error(
        '__typename is missing in "isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_organizationRef"'
      );
    return query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_organizationRef_possibleTypes.includes(
      obj.__typename
    );
  };

var query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_roles_items_possibleTypes =
  [
    'query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_roles_items',
  ];
export var isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_roles_items =
  function (obj) {
    if (!obj || !obj.__typename)
      throw new Error(
        '__typename is missing in "isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_roles_items"'
      );
    return query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_roles_items_possibleTypes.includes(
      obj.__typename
    );
  };

var query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_userRef_possibleTypes =
  [
    'query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_userRef',
  ];
export var isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_userRef =
  function (obj) {
    if (!obj || !obj.__typename)
      throw new Error(
        '__typename is missing in "isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_userRef"'
      );
    return query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_userRef_possibleTypes.includes(
      obj.__typename
    );
  };

var query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_possibleTypes =
  [
    'query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status',
  ];
export var isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status =
  function (obj) {
    if (!obj || !obj.__typename)
      throw new Error(
        '__typename is missing in "isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status"'
      );
    return query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_possibleTypes.includes(
      obj.__typename
    );
  };

var query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items_possibleTypes =
  [
    'query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items',
  ];
export var isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items =
  function (obj) {
    if (!obj || !obj.__typename)
      throw new Error(
        '__typename is missing in "isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items"'
      );
    return query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items_possibleTypes.includes(
      obj.__typename
    );
  };

var query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items_policyBindingRef_possibleTypes =
  [
    'query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items_policyBindingRef',
  ];
export var isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items_policyBindingRef =
  function (obj) {
    if (!obj || !obj.__typename)
      throw new Error(
        '__typename is missing in "isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items_policyBindingRef"'
      );
    return query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items_policyBindingRef_possibleTypes.includes(
      obj.__typename
    );
  };

var query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_conditions_items_possibleTypes =
  [
    'query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_conditions_items',
  ];
export var isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_conditions_items =
  function (obj) {
    if (!obj || !obj.__typename)
      throw new Error(
        '__typename is missing in "isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_conditions_items"'
      );
    return query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_conditions_items_possibleTypes.includes(
      obj.__typename
    );
  };

var query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_organization_possibleTypes =
  [
    'query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_organization',
  ];
export var isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_organization =
  function (obj) {
    if (!obj || !obj.__typename)
      throw new Error(
        '__typename is missing in "isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_organization"'
      );
    return query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_organization_possibleTypes.includes(
      obj.__typename
    );
  };

var query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_user_possibleTypes =
  [
    'query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_user',
  ];
export var isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_user =
  function (obj) {
    if (!obj || !obj.__typename)
      throw new Error(
        '__typename is missing in "isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_user"'
      );
    return query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_user_possibleTypes.includes(
      obj.__typename
    );
  };

var com_miloapis_resourcemanager_v1alpha1_Organization_possibleTypes = [
  'com_miloapis_resourcemanager_v1alpha1_Organization',
];
export var iscom_miloapis_resourcemanager_v1alpha1_Organization = function (obj) {
  if (!obj || !obj.__typename)
    throw new Error(
      '__typename is missing in "iscom_miloapis_resourcemanager_v1alpha1_Organization"'
    );
  return com_miloapis_resourcemanager_v1alpha1_Organization_possibleTypes.includes(obj.__typename);
};

var query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec_possibleTypes = [
  'query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec',
];
export var isquery_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec = function (
  obj
) {
  if (!obj || !obj.__typename)
    throw new Error(
      '__typename is missing in "isquery_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec"'
    );
  return query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec_possibleTypes.includes(
    obj.__typename
  );
};

var query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_possibleTypes = [
  'query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status',
];
export var isquery_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status =
  function (obj) {
    if (!obj || !obj.__typename)
      throw new Error(
        '__typename is missing in "isquery_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status"'
      );
    return query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_possibleTypes.includes(
      obj.__typename
    );
  };

var query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items_possibleTypes =
  ['query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items'];
export var isquery_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items =
  function (obj) {
    if (!obj || !obj.__typename)
      throw new Error(
        '__typename is missing in "isquery_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items"'
      );
    return query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items_possibleTypes.includes(
      obj.__typename
    );
  };
