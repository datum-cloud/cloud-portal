export type Scalars = {
  JSON: any;
  DateTime: any;
  BigInt: any;
  query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_conditions_items_message: any;
  query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_conditions_items_reason: any;
  query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_conditions_items_type: any;
  query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items_message: any;
  query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items_reason: any;
  query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items_type: any;
  Boolean: boolean;
  String: string;
  Int: number;
};

export interface Query {
  /** list objects of kind OrganizationMembership */
  listResourcemanagerMiloapisComV1alpha1OrganizationMembershipForAllNamespaces?: com_miloapis_resourcemanager_v1alpha1_OrganizationMembershipList;
  /** read the specified Organization */
  readResourcemanagerMiloapisComV1alpha1Organization?: com_miloapis_resourcemanager_v1alpha1_Organization;
  __typename: 'Query';
}

/** ObjectMeta is metadata that all persisted resources must have, which includes all objects users must create. */
export interface io_k8s_apimachinery_pkg_apis_meta_v1_ObjectMeta {
  /** Annotations is an unstructured key value map stored with a resource that may be set by external tools to store and retrieve arbitrary metadata. They are not queryable and should be preserved when modifying objects. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations */
  annotations?: Scalars['JSON'];
  /** Time is a wrapper around time.Time which supports correct marshaling to YAML and JSON.  Wrappers are provided for many of the factory methods that the time package offers. */
  creationTimestamp?: Scalars['DateTime'];
  /** Number of seconds allowed for this object to gracefully terminate before it will be removed from the system. Only set when deletionTimestamp is also set. May only be shortened. Read-only. */
  deletionGracePeriodSeconds?: Scalars['BigInt'];
  /** Time is a wrapper around time.Time which supports correct marshaling to YAML and JSON.  Wrappers are provided for many of the factory methods that the time package offers. */
  deletionTimestamp?: Scalars['DateTime'];
  /** Must be empty before the object is deleted from the registry. Each entry is an identifier for the responsible component that will remove the entry from the list. If the deletionTimestamp of the object is non-nil, entries in this list can only be removed. Finalizers may be processed and removed in any order.  Order is NOT enforced because it introduces significant risk of stuck finalizers. finalizers is a shared field, any actor with permission can reorder it. If the finalizer list is processed in order, then this can lead to a situation in which the component responsible for the first finalizer in the list is waiting for a signal (field value, external system, or other) produced by a component responsible for a finalizer later in the list, resulting in a deadlock. Without enforced ordering finalizers are free to order amongst themselves and are not vulnerable to ordering changes in the list. */
  finalizers?: (Scalars['String'] | undefined)[];
  /**
   * GenerateName is an optional prefix, used by the server, to generate a unique name ONLY IF the Name field has not been provided. If this field is used, the name returned to the client will be different than the name passed. This value will also be combined with a unique suffix. The provided value has the same validation rules as the Name field, and may be truncated by the length of the suffix required to make the value unique on the server.
   *
   * If this field is specified and the generated name exists, the server will return a 409.
   *
   * Applied only if Name is not specified. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#idempotency
   */
  generateName?: Scalars['String'];
  /** A sequence number representing a specific generation of the desired state. Populated by the system. Read-only. */
  generation?: Scalars['BigInt'];
  /** Map of string keys and values that can be used to organize and categorize (scope and select) objects. May match selectors of replication controllers and services. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels */
  labels?: Scalars['JSON'];
  /** ManagedFields maps workflow-id and version to the set of fields that are managed by that workflow. This is mostly for internal housekeeping, and users typically shouldn't need to set or understand this field. A workflow can be the user's name, a controller's name, or the name of a specific apply path like "ci-cd". The set of fields is always in the version that the workflow used when modifying the object. */
  managedFields?: (io_k8s_apimachinery_pkg_apis_meta_v1_ManagedFieldsEntry | undefined)[];
  /** Name must be unique within a namespace. Is required when creating resources, although some resources may allow a client to request the generation of an appropriate name automatically. Name is primarily intended for creation idempotence and configuration definition. Cannot be updated. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names#names */
  name?: Scalars['String'];
  /**
   * Namespace defines the space within which each name must be unique. An empty namespace is equivalent to the "default" namespace, but "default" is the canonical representation. Not all objects are required to be scoped to a namespace - the value of this field for those objects will be empty.
   *
   * Must be a DNS_LABEL. Cannot be updated. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces
   */
  namespace?: Scalars['String'];
  /** List of objects depended by this object. If ALL objects in the list have been deleted, this object will be garbage collected. If this object is managed by a controller, then an entry in this list will point to this controller, with the controller field set to true. There cannot be more than one managing controller. */
  ownerReferences?: (io_k8s_apimachinery_pkg_apis_meta_v1_OwnerReference | undefined)[];
  /**
   * An opaque value that represents the internal version of this object that can be used by clients to determine when objects have changed. May be used for optimistic concurrency, change detection, and the watch operation on a resource or set of resources. Clients must treat these values as opaque and passed unmodified back to the server. They may only be valid for a particular resource or set of resources.
   *
   * Populated by the system. Read-only. Value must be treated as opaque by clients and . More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#concurrency-control-and-consistency
   */
  resourceVersion?: Scalars['String'];
  /** Deprecated: selfLink is a legacy read-only field that is no longer populated by the system. */
  selfLink?: Scalars['String'];
  /**
   * UID is the unique in time and space value for this object. It is typically generated by the server on successful creation of a resource and is not allowed to change on PUT operations.
   *
   * Populated by the system. Read-only. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names#uids
   */
  uid?: Scalars['String'];
  __typename: 'io_k8s_apimachinery_pkg_apis_meta_v1_ObjectMeta';
}

/** ManagedFieldsEntry is a workflow-id, a FieldSet and the group version of the resource that the fieldset applies to. */
export interface io_k8s_apimachinery_pkg_apis_meta_v1_ManagedFieldsEntry {
  /** APIVersion defines the version of this resource that this field set applies to. The format is "group/version" just like the top-level APIVersion field. It is necessary to track the version of a field set because it cannot be automatically converted. */
  apiVersion?: Scalars['String'];
  /** FieldsType is the discriminator for the different fields format and version. There is currently only one possible value: "FieldsV1" */
  fieldsType?: Scalars['String'];
  fieldsV1?: Scalars['JSON'];
  /** Manager is an identifier of the workflow managing these fields. */
  manager?: Scalars['String'];
  /** Operation is the type of operation which lead to this ManagedFieldsEntry being created. The only valid values for this field are 'Apply' and 'Update'. */
  operation?: Scalars['String'];
  /** Subresource is the name of the subresource used to update that object, or empty string if the object was updated through the main resource. The value of this field is used to distinguish between managers, even if they share the same name. For example, a status update will be distinct from a regular update using the same manager name. Note that the APIVersion field is not related to the Subresource field and it always corresponds to the version of the main resource. */
  subresource?: Scalars['String'];
  /** Time is a wrapper around time.Time which supports correct marshaling to YAML and JSON.  Wrappers are provided for many of the factory methods that the time package offers. */
  time?: Scalars['DateTime'];
  __typename: 'io_k8s_apimachinery_pkg_apis_meta_v1_ManagedFieldsEntry';
}

/** OwnerReference contains enough information to let you identify an owning object. An owning object must be in the same namespace as the dependent, or be cluster-scoped, so there is no namespace field. */
export interface io_k8s_apimachinery_pkg_apis_meta_v1_OwnerReference {
  /** API version of the referent. */
  apiVersion: Scalars['String'];
  /** If true, AND if the owner has the "foregroundDeletion" finalizer, then the owner cannot be deleted from the key-value store until this reference is removed. See https://kubernetes.io/docs/concepts/architecture/garbage-collection/#foreground-deletion for how the garbage collector interacts with this field and enforces the foreground deletion. Defaults to false. To set this field, a user needs "delete" permission of the owner, otherwise 422 (Unprocessable Entity) will be returned. */
  blockOwnerDeletion?: Scalars['Boolean'];
  /** If true, this reference points to the managing controller. */
  controller?: Scalars['Boolean'];
  /** Kind of the referent. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds */
  kind: Scalars['String'];
  /** Name of the referent. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names#names */
  name: Scalars['String'];
  /** UID of the referent. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names#uids */
  uid: Scalars['String'];
  __typename: 'io_k8s_apimachinery_pkg_apis_meta_v1_OwnerReference';
}

/** ListMeta describes metadata that synthetic resources must have, including lists and various status objects. A resource may have only one of {ObjectMeta, ListMeta}. */
export interface io_k8s_apimachinery_pkg_apis_meta_v1_ListMeta {
  /** continue may be set if the user set a limit on the number of items returned, and indicates that the server has more data available. The value is opaque and may be used to issue another request to the endpoint that served this list to retrieve the next set of available objects. Continuing a consistent list may not be possible if the server configuration has changed or more than a few minutes have passed. The resourceVersion field returned when using this continue value will be identical to the value in the first response, unless you have received this token from an error message. */
  continue?: Scalars['String'];
  /** remainingItemCount is the number of subsequent items in the list which are not included in this list response. If the list request contained label or field selectors, then the number of remaining items is unknown and the field will be left unset and omitted during serialization. If the list is complete (either because it is not chunking or because this is the last chunk), then there are no more remaining items and this field will be left unset and omitted during serialization. Servers older than v1.15 do not set this field. The intended use of the remainingItemCount is *estimating* the size of a collection. Clients should not rely on the remainingItemCount to be set or to be exact. */
  remainingItemCount?: Scalars['BigInt'];
  /** String that identifies the server's internal version of this object that can be used by clients to determine when objects have changed. Value must be treated as opaque by clients and passed unmodified back to the server. Populated by the system. Read-only. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#concurrency-control-and-consistency */
  resourceVersion?: Scalars['String'];
  /** Deprecated: selfLink is a legacy read-only field that is no longer populated by the system. */
  selfLink?: Scalars['String'];
  __typename: 'io_k8s_apimachinery_pkg_apis_meta_v1_ListMeta';
}

export interface Mutation {
  /** create an Organization */
  createResourcemanagerMiloapisComV1alpha1Organization?: com_miloapis_resourcemanager_v1alpha1_Organization;
  /** delete an Organization */
  deleteResourcemanagerMiloapisComV1alpha1Organization?: io_k8s_apimachinery_pkg_apis_meta_v1_Status;
  /** partially update the specified Organization */
  patchResourcemanagerMiloapisComV1alpha1Organization?: com_miloapis_resourcemanager_v1alpha1_Organization;
  __typename: 'Mutation';
}

/** Status is a return value for calls that don't return other objects. */
export interface io_k8s_apimachinery_pkg_apis_meta_v1_Status {
  /** APIVersion defines the versioned schema of this representation of an object. Servers should convert recognized schemas to the latest internal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources */
  apiVersion?: Scalars['String'];
  /** Suggested HTTP return code for this status, 0 if not set. */
  code?: Scalars['Int'];
  details?: io_k8s_apimachinery_pkg_apis_meta_v1_StatusDetails;
  /** Kind is a string value representing the REST resource this object represents. Servers may infer this from the endpoint the client submits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds */
  kind?: Scalars['String'];
  /** A human-readable description of the status of this operation. */
  message?: Scalars['String'];
  metadata?: io_k8s_apimachinery_pkg_apis_meta_v1_ListMeta;
  /** A machine-readable description of why this operation is in the "Failure" status. If this value is empty there is no information available. A Reason clarifies an HTTP status code but does not override it. */
  reason?: Scalars['String'];
  /** Status of the operation. One of: "Success" or "Failure". More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#spec-and-status */
  status?: Scalars['String'];
  __typename: 'io_k8s_apimachinery_pkg_apis_meta_v1_Status';
}

/** StatusDetails is a set of additional properties that MAY be set by the server to provide additional information about a response. The Reason field of a Status object defines what attributes will be set. Clients must ignore fields that do not match the defined type of each attribute, and should assume that any attribute may be empty, invalid, or under defined. */
export interface io_k8s_apimachinery_pkg_apis_meta_v1_StatusDetails {
  /** The Causes array includes more details associated with the StatusReason failure. Not all StatusReasons may provide detailed causes. */
  causes?: (io_k8s_apimachinery_pkg_apis_meta_v1_StatusCause | undefined)[];
  /** The group attribute of the resource associated with the status StatusReason. */
  group?: Scalars['String'];
  /** The kind attribute of the resource associated with the status StatusReason. On some operations may differ from the requested resource Kind. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds */
  kind?: Scalars['String'];
  /** The name attribute of the resource associated with the status StatusReason (when there is a single name which can be described). */
  name?: Scalars['String'];
  /** If specified, the time in seconds before the operation should be retried. Some errors may indicate the client must take an alternate action - for those errors this field may indicate how long to wait before taking the alternate action. */
  retryAfterSeconds?: Scalars['Int'];
  /** UID of the resource. (when there is a single resource which can be described). More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names#uids */
  uid?: Scalars['String'];
  __typename: 'io_k8s_apimachinery_pkg_apis_meta_v1_StatusDetails';
}

/** StatusCause provides more information about an api.Status failure, including cases when multiple errors are encountered. */
export interface io_k8s_apimachinery_pkg_apis_meta_v1_StatusCause {
  /**
   * The field of the resource that has caused this error, as named by its JSON serialization. May include dot and postfix notation for nested attributes. Arrays are zero-indexed.  Fields may appear more than once in an array of causes due to fields having multiple errors. Optional.
   *
   * Examples:
   *   "name" - the field "name" on the current resource
   *   "items[0].name" - the field "name" on the first array entry in "items"
   */
  field?: Scalars['String'];
  /** A human-readable description of the cause of the error.  This field may be presented as-is to a reader. */
  message?: Scalars['String'];
  /** A machine-readable description of the cause of the error. If this value is empty there is no information available. */
  reason?: Scalars['String'];
  __typename: 'io_k8s_apimachinery_pkg_apis_meta_v1_StatusCause';
}

/** OrganizationMembershipList is a list of OrganizationMembership */
export interface com_miloapis_resourcemanager_v1alpha1_OrganizationMembershipList {
  /** APIVersion defines the versioned schema of this representation of an object. Servers should convert recognized schemas to the latest internal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources */
  apiVersion?: Scalars['String'];
  /** List of organizationmemberships. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md */
  items: (com_miloapis_resourcemanager_v1alpha1_OrganizationMembership | undefined)[];
  /** Kind is a string value representing the REST resource this object represents. Servers may infer this from the endpoint the client submits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds */
  kind?: Scalars['String'];
  metadata?: io_k8s_apimachinery_pkg_apis_meta_v1_ListMeta;
  __typename: 'com_miloapis_resourcemanager_v1alpha1_OrganizationMembershipList';
}

/**
 * OrganizationMembership establishes a user's membership in an organization and
 * optionally assigns roles to grant permissions. The controller automatically
 * manages PolicyBinding resources for each assigned role, simplifying access
 * control management.
 *
 * Key features:
 *   - Establishes user-organization relationship
 *   - Automatic PolicyBinding creation and deletion for assigned roles
 *   - Supports multiple roles per membership
 *   - Cross-namespace role references
 *   - Detailed status tracking with per-role reconciliation state
 *
 * Prerequisites:
 *   - User resource must exist
 *   - Organization resource must exist
 *   - Referenced Role resources must exist in their respective namespaces
 *
 * Example - Basic membership with role assignment:
 *
 * 	apiVersion: resourcemanager.miloapis.com/v1alpha1
 * 	kind: OrganizationMembership
 * 	metadata:
 * 	  name: jane-acme-membership
 * 	  namespace: organization-acme-corp
 * 	spec:
 * 	  organizationRef:
 * 	    name: acme-corp
 * 	  userRef:
 * 	    name: jane-doe
 * 	  roles:
 * 	  - name: organization-viewer
 * 	    namespace: organization-acme-corp
 *
 * Related resources:
 *   - User: The user being granted membership
 *   - Organization: The organization the user joins
 *   - Role: Defines permissions granted to the user
 *   - PolicyBinding: Automatically created by the controller for each role
 */
export interface com_miloapis_resourcemanager_v1alpha1_OrganizationMembership {
  /** APIVersion defines the versioned schema of this representation of an object. Servers should convert recognized schemas to the latest internal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources */
  apiVersion?: Scalars['String'];
  /** Kind is a string value representing the REST resource this object represents. Servers may infer this from the endpoint the client submits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds */
  kind?: Scalars['String'];
  metadata?: io_k8s_apimachinery_pkg_apis_meta_v1_ObjectMeta;
  spec?: query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec;
  status?: query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status;
  __typename: 'com_miloapis_resourcemanager_v1alpha1_OrganizationMembership';
}

/**
 * OrganizationMembershipSpec defines the desired state of OrganizationMembership.
 * It specifies which user should be a member of which organization, and optionally
 * which roles should be assigned to grant permissions.
 */
export interface query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec {
  organizationRef: query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_organizationRef;
  /**
   * Roles specifies a list of roles to assign to the user within the organization.
   * The controller automatically creates and manages PolicyBinding resources for
   * each role. Roles can be added or removed after the membership is created.
   *
   * Optional field. When omitted or empty, the membership is established without
   * any role assignments. Roles can be added later via update operations.
   *
   * Each role reference must specify:
   *   - name: The role name (required)
   *   - namespace: The role namespace (optional, defaults to membership namespace)
   *
   * Duplicate roles are prevented by admission webhook validation.
   *
   * Example:
   *
   *   roles:
   *   - name: organization-admin
   *     namespace: organization-acme-corp
   *   - name: billing-manager
   *     namespace: organization-acme-corp
   *   - name: shared-developer
   *     namespace: milo-system
   */
  roles?: (
    | query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_roles_items
    | undefined
  )[];
  userRef: query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_userRef;
  __typename: 'query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec';
}

/**
 * OrganizationRef identifies the organization to grant membership in.
 * The organization must exist before creating the membership.
 *
 * Required field.
 */
export interface query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_organizationRef {
  /** Name is the name of resource being referenced */
  name: Scalars['String'];
  __typename: 'query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_organizationRef';
}

/** RoleReference defines a reference to a Role resource for organization membership. */
export interface query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_roles_items {
  /** Name of the referenced Role. */
  name: Scalars['String'];
  /**
   * Namespace of the referenced Role.
   * If not specified, it defaults to the organization membership's namespace.
   */
  namespace?: Scalars['String'];
  __typename: 'query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_roles_items';
}

/**
 * UserRef identifies the user to grant organization membership.
 * The user must exist before creating the membership.
 *
 * Required field.
 */
export interface query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_userRef {
  /** Name is the name of resource being referenced */
  name: Scalars['String'];
  __typename: 'query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_userRef';
}

/**
 * OrganizationMembershipStatus defines the observed state of OrganizationMembership.
 * The controller populates this status to reflect the current reconciliation state,
 * including whether the membership is ready and which roles have been successfully applied.
 */
export interface query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status {
  /**
   * AppliedRoles tracks the reconciliation state of each role in spec.roles.
   * This array provides per-role status, making it easy to identify which
   * roles are applied and which failed.
   *
   * Each entry includes:
   *   - name and namespace: Identifies the role
   *   - status: "Applied", "Pending", or "Failed"
   *   - policyBindingRef: Reference to the created PolicyBinding (when Applied)
   *   - appliedAt: Timestamp when role was applied (when Applied)
   *   - message: Error details (when Failed)
   *
   * Use this to troubleshoot role assignment issues. Roles marked as "Failed"
   * include a message explaining why the PolicyBinding could not be created.
   *
   * Example:
   *
   *   appliedRoles:
   *   - name: org-admin
   *     namespace: organization-acme-corp
   *     status: Applied
   *     appliedAt: "2025-10-28T10:00:00Z"
   *     policyBindingRef:
   *       name: jane-acme-membership-a1b2c3d4
   *       namespace: organization-acme-corp
   *   - name: invalid-role
   *     namespace: organization-acme-corp
   *     status: Failed
   *     message: "role 'invalid-role' not found in namespace 'organization-acme-corp'"
   */
  appliedRoles?: (
    | query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items
    | undefined
  )[];
  /**
   * Conditions represent the current status of the membership.
   *
   * Standard conditions:
   *   - Ready: Indicates membership has been established (user and org exist)
   *   - RolesApplied: Indicates whether all roles have been successfully applied
   *
   * Check the RolesApplied condition to determine overall role assignment status:
   *   - True with reason "AllRolesApplied": All roles successfully applied
   *   - True with reason "NoRolesSpecified": No roles in spec, membership only
   *   - False with reason "PartialRolesApplied": Some roles failed (check appliedRoles for details)
   */
  conditions?: (
    | query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_conditions_items
    | undefined
  )[];
  /**
   * ObservedGeneration tracks the most recent membership spec that the
   * controller has processed. Use this to determine if status reflects
   * the latest changes.
   */
  observedGeneration?: Scalars['BigInt'];
  organization?: query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_organization;
  user?: query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_user;
  __typename: 'query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status';
}

/**
 * AppliedRole tracks the reconciliation status of a single role assignment
 * within an organization membership. The controller maintains this status to
 * provide visibility into which roles are successfully applied and which failed.
 */
export interface query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items {
  /**
   * AppliedAt records when this role was successfully applied.
   * Corresponds to the PolicyBinding creation time.
   *
   * Only populated when Status is "Applied".
   */
  appliedAt?: Scalars['DateTime'];
  /**
   * Message provides additional context about the role status.
   * Contains error details when Status is "Failed", explaining why the
   * PolicyBinding could not be created.
   *
   * Common failure messages:
   *   - "role 'role-name' not found in namespace 'namespace'"
   *   - "Failed to create PolicyBinding: <error details>"
   *
   * Empty when Status is "Applied" or "Pending".
   */
  message?: Scalars['String'];
  /**
   * Name identifies the Role resource.
   *
   * Required field.
   */
  name: Scalars['String'];
  /**
   * Namespace identifies the namespace containing the Role resource.
   * Empty when the role is in the membership's namespace.
   */
  namespace?: Scalars['String'];
  policyBindingRef?: query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items_policyBindingRef;
  status: query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items_status;
  __typename: 'query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items';
}

/**
 * PolicyBindingRef references the PolicyBinding resource that was
 * automatically created for this role.
 *
 * Only populated when Status is "Applied". Use this reference to
 * inspect or troubleshoot the underlying PolicyBinding.
 */
export interface query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items_policyBindingRef {
  /** Name of the PolicyBinding resource. */
  name: Scalars['String'];
  /** Namespace of the PolicyBinding resource. */
  namespace?: Scalars['String'];
  __typename: 'query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items_policyBindingRef';
}

/** Condition contains details for one aspect of the current state of this API Resource. */
export interface query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_conditions_items {
  /**
   * lastTransitionTime is the last time the condition transitioned from one status to another.
   * This should be when the underlying condition changed.  If that is not known, then using the time when the API field changed is acceptable.
   */
  lastTransitionTime: Scalars['DateTime'];
  /**
   * message is a human readable message indicating details about the transition.
   * This may be an empty string.
   */
  message: Scalars['query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_conditions_items_message'];
  /**
   * observedGeneration represents the .metadata.generation that the condition was set based upon.
   * For instance, if .metadata.generation is currently 12, but the .status.conditions[x].observedGeneration is 9, the condition is out of date
   * with respect to the current state of the instance.
   */
  observedGeneration?: Scalars['BigInt'];
  reason: Scalars['query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_conditions_items_reason'];
  status: query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_conditions_items_status;
  type: Scalars['query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_conditions_items_type'];
  __typename: 'query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_conditions_items';
}

/**
 * Organization contains cached information about the organization in this membership.
 * This information is populated by the controller from the referenced organization.
 */
export interface query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_organization {
  /** DisplayName is the display name of the organization in the membership. */
  displayName?: Scalars['String'];
  /** Type is the type of the organization in the membership. */
  type?: Scalars['String'];
  __typename: 'query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_organization';
}

/**
 * User contains cached information about the user in this membership.
 * This information is populated by the controller from the referenced user.
 */
export interface query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_user {
  /** AvatarURL is the avatar URL of the user in the membership. */
  avatarUrl?: Scalars['String'];
  /** Email is the email of the user in the membership. */
  email?: Scalars['String'];
  /** FamilyName is the family name of the user in the membership. */
  familyName?: Scalars['String'];
  /** GivenName is the given name of the user in the membership. */
  givenName?: Scalars['String'];
  __typename: 'query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_user';
}

/**
 * Use lowercase for path, which influences plural name. Ensure kind is Organization.
 * Organization is the Schema for the Organizations API
 */
export interface com_miloapis_resourcemanager_v1alpha1_Organization {
  /** APIVersion defines the versioned schema of this representation of an object. Servers should convert recognized schemas to the latest internal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources */
  apiVersion?: Scalars['String'];
  /** Kind is a string value representing the REST resource this object represents. Servers may infer this from the endpoint the client submits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds */
  kind?: Scalars['String'];
  metadata?: io_k8s_apimachinery_pkg_apis_meta_v1_ObjectMeta;
  spec: query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec;
  status?: query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status;
  __typename: 'com_miloapis_resourcemanager_v1alpha1_Organization';
}

/** OrganizationSpec defines the desired state of Organization */
export interface query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec {
  type: query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec_type;
  __typename: 'query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec';
}

/** OrganizationStatus defines the observed state of Organization */
export interface query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status {
  /**
   * Conditions represents the observations of an organization's current state.
   * Known condition types are: "Ready"
   */
  conditions?: (
    | query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items
    | undefined
  )[];
  /** ObservedGeneration is the most recent generation observed for this Organization by the controller. */
  observedGeneration?: Scalars['BigInt'];
  __typename: 'query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status';
}

/** Condition contains details for one aspect of the current state of this API Resource. */
export interface query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items {
  /**
   * lastTransitionTime is the last time the condition transitioned from one status to another.
   * This should be when the underlying condition changed.  If that is not known, then using the time when the API field changed is acceptable.
   */
  lastTransitionTime: Scalars['DateTime'];
  /**
   * message is a human readable message indicating details about the transition.
   * This may be an empty string.
   */
  message: Scalars['query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items_message'];
  /**
   * observedGeneration represents the .metadata.generation that the condition was set based upon.
   * For instance, if .metadata.generation is currently 12, but the .status.conditions[x].observedGeneration is 9, the condition is out of date
   * with respect to the current state of the instance.
   */
  observedGeneration?: Scalars['BigInt'];
  reason: Scalars['query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items_reason'];
  status: query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items_status;
  type: Scalars['query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items_type'];
  __typename: 'query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items';
}

/**
 * Status indicates the current state of this role assignment.
 *
 * Valid values:
 *   - "Applied": PolicyBinding successfully created and role is active
 *   - "Pending": Role is being reconciled (transitional state)
 *   - "Failed": PolicyBinding could not be created (see Message for details)
 *
 * Required field.
 */
export type query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items_status =
  'Applied' | 'Pending' | 'Failed';

/** status of the condition, one of True, False, Unknown. */
export type query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_conditions_items_status =
  'True' | 'False' | 'Unknown';

/** The type of organization. */
export type query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec_type =
  | 'Personal'
  | 'Standard';

/** status of the condition, one of True, False, Unknown. */
export type query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items_status =
  'True' | 'False' | 'Unknown';

export interface QueryRequest {
  /** list objects of kind OrganizationMembership */
  listResourcemanagerMiloapisComV1alpha1OrganizationMembershipForAllNamespaces?: [
    {
      /** allowWatchBookmarks requests watch events with type "BOOKMARK". Servers that do not implement bookmarks may ignore this flag and bookmarks are sent at the server's discretion. Clients should not assume bookmarks are returned at any specific interval, nor may they assume the server will send any BOOKMARK event during a session. If this is not a watch, this field is ignored. */
      allowWatchBookmarks?: Scalars['Boolean'] | null;
      /**
       * The continue option should be set when retrieving more results from the server. Since this value is server defined, clients may only use the continue value from a previous query result with identical query parameters (except for the value of continue) and the server may reject a continue value it does not recognize. If the specified continue value is no longer valid whether due to expiration (generally five to fifteen minutes) or a configuration change on the server, the server will respond with a 410 ResourceExpired error together with a continue token. If the client needs a consistent list, it must restart their list without the continue field. Otherwise, the client may send another list request with the token received with the 410 error, the server will respond with a list starting from the next key, but from the latest snapshot, which is inconsistent from the previous list results - objects that are created, modified, or deleted after the first list request will be included in the response, as long as their keys are after the "next key".
       *
       * This field is not supported when watch is true. Clients may start a watch from the last resourceVersion value returned by the server and not miss any modifications.
       */
      continue?: Scalars['String'] | null;
      /** A selector to restrict the list of returned objects by their fields. Defaults to everything. */
      fieldSelector?: Scalars['String'] | null;
      /** A selector to restrict the list of returned objects by their labels. Defaults to everything. */
      labelSelector?: Scalars['String'] | null;
      /**
       * limit is a maximum number of responses to return for a list call. If more items exist, the server will set the `continue` field on the list metadata to a value that can be used with the same initial query to retrieve the next set of results. Setting a limit may return fewer than the requested amount of items (up to zero items) in the event all requested objects are filtered out and clients should only use the presence of the continue field to determine whether more results are available. Servers may choose not to support the limit argument and will return all of the available results. If limit is specified and the continue field is empty, clients may assume that no more results are available. This field is not supported if watch is true.
       *
       * The server guarantees that the objects returned when using continue will be identical to issuing a single list call without a limit - that is, no objects created, modified, or deleted after the first request is issued will be included in any subsequent continued requests. This is sometimes referred to as a consistent snapshot, and ensures that a client that is using limit to receive smaller chunks of a very large result can ensure they see all possible objects. If objects are updated during a chunked list the version of the object that was present at the time the first list result was calculated is returned.
       */
      limit?: Scalars['Int'] | null;
      /** If 'true', then the output is pretty printed. Defaults to 'false' unless the user-agent indicates a browser or command-line HTTP tool (curl and wget). */
      pretty?: Scalars['String'] | null;
      /**
       * resourceVersion sets a constraint on what resource versions a request may be served from. See https://kubernetes.io/docs/reference/using-api/api-concepts/#resource-versions for details.
       *
       * Defaults to unset
       */
      resourceVersion?: Scalars['String'] | null;
      /**
       * resourceVersionMatch determines how resourceVersion is applied to list calls. It is highly recommended that resourceVersionMatch be set for list calls where resourceVersion is set See https://kubernetes.io/docs/reference/using-api/api-concepts/#resource-versions for details.
       *
       * Defaults to unset
       */
      resourceVersionMatch?: Scalars['String'] | null;
      /**
       * `sendInitialEvents=true` may be set together with `watch=true`. In that case, the watch stream will begin with synthetic events to produce the current state of objects in the collection. Once all such events have been sent, a synthetic "Bookmark" event  will be sent. The bookmark will report the ResourceVersion (RV) corresponding to the set of objects, and be marked with `"k8s.io/initial-events-end": "true"` annotation. Afterwards, the watch stream will proceed as usual, sending watch events corresponding to changes (subsequent to the RV) to objects watched.
       *
       * When `sendInitialEvents` option is set, we require `resourceVersionMatch` option to also be set. The semantic of the watch request is as following: - `resourceVersionMatch` = NotOlderThan
       *   is interpreted as "data at least as new as the provided `resourceVersion`"
       *   and the bookmark event is send when the state is synced
       *   to a `resourceVersion` at least as fresh as the one provided by the ListOptions.
       *   If `resourceVersion` is unset, this is interpreted as "consistent read" and the
       *   bookmark event is send when the state is synced at least to the moment
       *   when request started being processed.
       * - `resourceVersionMatch` set to any other value or unset
       *   Invalid error is returned.
       *
       * Defaults to true if `resourceVersion=""` or `resourceVersion="0"` (for backward compatibility reasons) and to false otherwise.
       */
      sendInitialEvents?: Scalars['Boolean'] | null;
      /** Timeout for the list/watch call. This limits the duration of the call, regardless of any activity or inactivity. */
      timeoutSeconds?: Scalars['Int'] | null;
      /** Watch for changes to the described resources and return them as a stream of add, update, and remove notifications. Specify resourceVersion. */
      watch?: Scalars['Boolean'] | null;
    },
    com_miloapis_resourcemanager_v1alpha1_OrganizationMembershipListRequest,
  ];
  /** read the specified Organization */
  readResourcemanagerMiloapisComV1alpha1Organization?: [
    {
      /** name of the Organization */
      name: Scalars['String'];
      /** If 'true', then the output is pretty printed. Defaults to 'false' unless the user-agent indicates a browser or command-line HTTP tool (curl and wget). */
      pretty?: Scalars['String'] | null;
      /**
       * resourceVersion sets a constraint on what resource versions a request may be served from. See https://kubernetes.io/docs/reference/using-api/api-concepts/#resource-versions for details.
       *
       * Defaults to unset
       */
      resourceVersion?: Scalars['String'] | null;
    },
    com_miloapis_resourcemanager_v1alpha1_OrganizationRequest,
  ];
  __typename?: boolean | number;
  __scalar?: boolean | number;
}

/** ObjectMeta is metadata that all persisted resources must have, which includes all objects users must create. */
export interface io_k8s_apimachinery_pkg_apis_meta_v1_ObjectMetaRequest {
  /** Annotations is an unstructured key value map stored with a resource that may be set by external tools to store and retrieve arbitrary metadata. They are not queryable and should be preserved when modifying objects. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations */
  annotations?: boolean | number;
  /** Time is a wrapper around time.Time which supports correct marshaling to YAML and JSON.  Wrappers are provided for many of the factory methods that the time package offers. */
  creationTimestamp?: boolean | number;
  /** Number of seconds allowed for this object to gracefully terminate before it will be removed from the system. Only set when deletionTimestamp is also set. May only be shortened. Read-only. */
  deletionGracePeriodSeconds?: boolean | number;
  /** Time is a wrapper around time.Time which supports correct marshaling to YAML and JSON.  Wrappers are provided for many of the factory methods that the time package offers. */
  deletionTimestamp?: boolean | number;
  /** Must be empty before the object is deleted from the registry. Each entry is an identifier for the responsible component that will remove the entry from the list. If the deletionTimestamp of the object is non-nil, entries in this list can only be removed. Finalizers may be processed and removed in any order.  Order is NOT enforced because it introduces significant risk of stuck finalizers. finalizers is a shared field, any actor with permission can reorder it. If the finalizer list is processed in order, then this can lead to a situation in which the component responsible for the first finalizer in the list is waiting for a signal (field value, external system, or other) produced by a component responsible for a finalizer later in the list, resulting in a deadlock. Without enforced ordering finalizers are free to order amongst themselves and are not vulnerable to ordering changes in the list. */
  finalizers?: boolean | number;
  /**
   * GenerateName is an optional prefix, used by the server, to generate a unique name ONLY IF the Name field has not been provided. If this field is used, the name returned to the client will be different than the name passed. This value will also be combined with a unique suffix. The provided value has the same validation rules as the Name field, and may be truncated by the length of the suffix required to make the value unique on the server.
   *
   * If this field is specified and the generated name exists, the server will return a 409.
   *
   * Applied only if Name is not specified. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#idempotency
   */
  generateName?: boolean | number;
  /** A sequence number representing a specific generation of the desired state. Populated by the system. Read-only. */
  generation?: boolean | number;
  /** Map of string keys and values that can be used to organize and categorize (scope and select) objects. May match selectors of replication controllers and services. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels */
  labels?: boolean | number;
  /** ManagedFields maps workflow-id and version to the set of fields that are managed by that workflow. This is mostly for internal housekeeping, and users typically shouldn't need to set or understand this field. A workflow can be the user's name, a controller's name, or the name of a specific apply path like "ci-cd". The set of fields is always in the version that the workflow used when modifying the object. */
  managedFields?: io_k8s_apimachinery_pkg_apis_meta_v1_ManagedFieldsEntryRequest;
  /** Name must be unique within a namespace. Is required when creating resources, although some resources may allow a client to request the generation of an appropriate name automatically. Name is primarily intended for creation idempotence and configuration definition. Cannot be updated. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names#names */
  name?: boolean | number;
  /**
   * Namespace defines the space within which each name must be unique. An empty namespace is equivalent to the "default" namespace, but "default" is the canonical representation. Not all objects are required to be scoped to a namespace - the value of this field for those objects will be empty.
   *
   * Must be a DNS_LABEL. Cannot be updated. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces
   */
  namespace?: boolean | number;
  /** List of objects depended by this object. If ALL objects in the list have been deleted, this object will be garbage collected. If this object is managed by a controller, then an entry in this list will point to this controller, with the controller field set to true. There cannot be more than one managing controller. */
  ownerReferences?: io_k8s_apimachinery_pkg_apis_meta_v1_OwnerReferenceRequest;
  /**
   * An opaque value that represents the internal version of this object that can be used by clients to determine when objects have changed. May be used for optimistic concurrency, change detection, and the watch operation on a resource or set of resources. Clients must treat these values as opaque and passed unmodified back to the server. They may only be valid for a particular resource or set of resources.
   *
   * Populated by the system. Read-only. Value must be treated as opaque by clients and . More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#concurrency-control-and-consistency
   */
  resourceVersion?: boolean | number;
  /** Deprecated: selfLink is a legacy read-only field that is no longer populated by the system. */
  selfLink?: boolean | number;
  /**
   * UID is the unique in time and space value for this object. It is typically generated by the server on successful creation of a resource and is not allowed to change on PUT operations.
   *
   * Populated by the system. Read-only. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names#uids
   */
  uid?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
}

/** ManagedFieldsEntry is a workflow-id, a FieldSet and the group version of the resource that the fieldset applies to. */
export interface io_k8s_apimachinery_pkg_apis_meta_v1_ManagedFieldsEntryRequest {
  /** APIVersion defines the version of this resource that this field set applies to. The format is "group/version" just like the top-level APIVersion field. It is necessary to track the version of a field set because it cannot be automatically converted. */
  apiVersion?: boolean | number;
  /** FieldsType is the discriminator for the different fields format and version. There is currently only one possible value: "FieldsV1" */
  fieldsType?: boolean | number;
  fieldsV1?: boolean | number;
  /** Manager is an identifier of the workflow managing these fields. */
  manager?: boolean | number;
  /** Operation is the type of operation which lead to this ManagedFieldsEntry being created. The only valid values for this field are 'Apply' and 'Update'. */
  operation?: boolean | number;
  /** Subresource is the name of the subresource used to update that object, or empty string if the object was updated through the main resource. The value of this field is used to distinguish between managers, even if they share the same name. For example, a status update will be distinct from a regular update using the same manager name. Note that the APIVersion field is not related to the Subresource field and it always corresponds to the version of the main resource. */
  subresource?: boolean | number;
  /** Time is a wrapper around time.Time which supports correct marshaling to YAML and JSON.  Wrappers are provided for many of the factory methods that the time package offers. */
  time?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
}

/** OwnerReference contains enough information to let you identify an owning object. An owning object must be in the same namespace as the dependent, or be cluster-scoped, so there is no namespace field. */
export interface io_k8s_apimachinery_pkg_apis_meta_v1_OwnerReferenceRequest {
  /** API version of the referent. */
  apiVersion?: boolean | number;
  /** If true, AND if the owner has the "foregroundDeletion" finalizer, then the owner cannot be deleted from the key-value store until this reference is removed. See https://kubernetes.io/docs/concepts/architecture/garbage-collection/#foreground-deletion for how the garbage collector interacts with this field and enforces the foreground deletion. Defaults to false. To set this field, a user needs "delete" permission of the owner, otherwise 422 (Unprocessable Entity) will be returned. */
  blockOwnerDeletion?: boolean | number;
  /** If true, this reference points to the managing controller. */
  controller?: boolean | number;
  /** Kind of the referent. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds */
  kind?: boolean | number;
  /** Name of the referent. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names#names */
  name?: boolean | number;
  /** UID of the referent. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names#uids */
  uid?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
}

/** ListMeta describes metadata that synthetic resources must have, including lists and various status objects. A resource may have only one of {ObjectMeta, ListMeta}. */
export interface io_k8s_apimachinery_pkg_apis_meta_v1_ListMetaRequest {
  /** continue may be set if the user set a limit on the number of items returned, and indicates that the server has more data available. The value is opaque and may be used to issue another request to the endpoint that served this list to retrieve the next set of available objects. Continuing a consistent list may not be possible if the server configuration has changed or more than a few minutes have passed. The resourceVersion field returned when using this continue value will be identical to the value in the first response, unless you have received this token from an error message. */
  continue?: boolean | number;
  /** remainingItemCount is the number of subsequent items in the list which are not included in this list response. If the list request contained label or field selectors, then the number of remaining items is unknown and the field will be left unset and omitted during serialization. If the list is complete (either because it is not chunking or because this is the last chunk), then there are no more remaining items and this field will be left unset and omitted during serialization. Servers older than v1.15 do not set this field. The intended use of the remainingItemCount is *estimating* the size of a collection. Clients should not rely on the remainingItemCount to be set or to be exact. */
  remainingItemCount?: boolean | number;
  /** String that identifies the server's internal version of this object that can be used by clients to determine when objects have changed. Value must be treated as opaque by clients and passed unmodified back to the server. Populated by the system. Read-only. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#concurrency-control-and-consistency */
  resourceVersion?: boolean | number;
  /** Deprecated: selfLink is a legacy read-only field that is no longer populated by the system. */
  selfLink?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
}

export interface MutationRequest {
  /** create an Organization */
  createResourcemanagerMiloapisComV1alpha1Organization?: [
    {
      /** If 'true', then the output is pretty printed. Defaults to 'false' unless the user-agent indicates a browser or command-line HTTP tool (curl and wget). */
      pretty?: Scalars['String'] | null;
      /** When present, indicates that modifications should not be persisted. An invalid or unrecognized dryRun directive will result in an error response and no further processing of the request. Valid values are: - All: all dry run stages will be processed */
      dryRun?: Scalars['String'] | null;
      /** fieldManager is a name associated with the actor or entity that is making these changes. The value must be less than or 128 characters long, and only contain printable characters, as defined by https://golang.org/pkg/unicode/#IsPrint. */
      fieldManager?: Scalars['String'] | null;
      /** fieldValidation instructs the server on how to handle objects in the request (POST/PUT/PATCH) containing unknown or duplicate fields. Valid values are: - Ignore: This will ignore any unknown fields that are silently dropped from the object, and will ignore all but the last duplicate field that the decoder encounters. This is the default behavior prior to v1.23. - Warn: This will send a warning via the standard warning response header for each unknown field that is dropped from the object, and for each duplicate field that is encountered. The request will still succeed if there are no other errors, and will only persist the last of any duplicate fields. This is the default in v1.23+ - Strict: This will fail the request with a BadRequest error if any unknown fields would be dropped from the object, or if any duplicate fields are present. The error returned from the server will contain all unknown and duplicate fields encountered. */
      fieldValidation?: Scalars['String'] | null;
      input?: com_miloapis_resourcemanager_v1alpha1_Organization_Input | null;
    },
    com_miloapis_resourcemanager_v1alpha1_OrganizationRequest,
  ];
  /** delete an Organization */
  deleteResourcemanagerMiloapisComV1alpha1Organization?: [
    {
      /** name of the Organization */
      name: Scalars['String'];
      /** If 'true', then the output is pretty printed. Defaults to 'false' unless the user-agent indicates a browser or command-line HTTP tool (curl and wget). */
      pretty?: Scalars['String'] | null;
      /** When present, indicates that modifications should not be persisted. An invalid or unrecognized dryRun directive will result in an error response and no further processing of the request. Valid values are: - All: all dry run stages will be processed */
      dryRun?: Scalars['String'] | null;
      /** The duration in seconds before the object should be deleted. Value must be non-negative integer. The value zero indicates delete immediately. If this value is nil, the default grace period for the specified type will be used. Defaults to a per object value if not specified. zero means delete immediately. */
      gracePeriodSeconds?: Scalars['Int'] | null;
      /** if set to true, it will trigger an unsafe deletion of the resource in case the normal deletion flow fails with a corrupt object error. A resource is considered corrupt if it can not be retrieved from the underlying storage successfully because of a) its data can not be transformed e.g. decryption failure, or b) it fails to decode into an object. NOTE: unsafe deletion ignores finalizer constraints, skips precondition checks, and removes the object from the storage. WARNING: This may potentially break the cluster if the workload associated with the resource being unsafe-deleted relies on normal deletion flow. Use only if you REALLY know what you are doing. The default value is false, and the user must opt in to enable it */
      ignoreStoreReadErrorWithClusterBreakingPotential?: Scalars['Boolean'] | null;
      /** Deprecated: please use the PropagationPolicy, this field will be deprecated in 1.7. Should the dependent objects be orphaned. If true/false, the "orphan" finalizer will be added to/removed from the object's finalizers list. Either this field or PropagationPolicy may be set, but not both. */
      orphanDependents?: Scalars['Boolean'] | null;
      /** Whether and how garbage collection will be performed. Either this field or OrphanDependents may be set, but not both. The default policy is decided by the existing finalizer set in the metadata.finalizers and the resource-specific default policy. Acceptable values are: 'Orphan' - orphan the dependents; 'Background' - allow the garbage collector to delete the dependents in the background; 'Foreground' - a cascading policy that deletes all dependents in the foreground. */
      propagationPolicy?: Scalars['String'] | null;
      input?: io_k8s_apimachinery_pkg_apis_meta_v1_DeleteOptions_Input | null;
    },
    io_k8s_apimachinery_pkg_apis_meta_v1_StatusRequest,
  ];
  /** partially update the specified Organization */
  patchResourcemanagerMiloapisComV1alpha1Organization?: [
    {
      /** name of the Organization */
      name: Scalars['String'];
      /** If 'true', then the output is pretty printed. Defaults to 'false' unless the user-agent indicates a browser or command-line HTTP tool (curl and wget). */
      pretty?: Scalars['String'] | null;
      /** When present, indicates that modifications should not be persisted. An invalid or unrecognized dryRun directive will result in an error response and no further processing of the request. Valid values are: - All: all dry run stages will be processed */
      dryRun?: Scalars['String'] | null;
      /** fieldManager is a name associated with the actor or entity that is making these changes. The value must be less than or 128 characters long, and only contain printable characters, as defined by https://golang.org/pkg/unicode/#IsPrint. This field is required for apply requests (application/apply-patch) but optional for non-apply patch types (JsonPatch, MergePatch, StrategicMergePatch). */
      fieldManager?: Scalars['String'] | null;
      /** fieldValidation instructs the server on how to handle objects in the request (POST/PUT/PATCH) containing unknown or duplicate fields. Valid values are: - Ignore: This will ignore any unknown fields that are silently dropped from the object, and will ignore all but the last duplicate field that the decoder encounters. This is the default behavior prior to v1.23. - Warn: This will send a warning via the standard warning response header for each unknown field that is dropped from the object, and for each duplicate field that is encountered. The request will still succeed if there are no other errors, and will only persist the last of any duplicate fields. This is the default in v1.23+ - Strict: This will fail the request with a BadRequest error if any unknown fields would be dropped from the object, or if any duplicate fields are present. The error returned from the server will contain all unknown and duplicate fields encountered. */
      fieldValidation?: Scalars['String'] | null;
      /** Force is going to "force" Apply requests. It means user will re-acquire conflicting fields owned by other people. Force flag must be unset for non-apply patch requests. */
      force?: Scalars['Boolean'] | null;
      input?: Scalars['JSON'] | null;
    },
    com_miloapis_resourcemanager_v1alpha1_OrganizationRequest,
  ];
  __typename?: boolean | number;
  __scalar?: boolean | number;
}

/** Status is a return value for calls that don't return other objects. */
export interface io_k8s_apimachinery_pkg_apis_meta_v1_StatusRequest {
  /** APIVersion defines the versioned schema of this representation of an object. Servers should convert recognized schemas to the latest internal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources */
  apiVersion?: boolean | number;
  /** Suggested HTTP return code for this status, 0 if not set. */
  code?: boolean | number;
  details?: io_k8s_apimachinery_pkg_apis_meta_v1_StatusDetailsRequest;
  /** Kind is a string value representing the REST resource this object represents. Servers may infer this from the endpoint the client submits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds */
  kind?: boolean | number;
  /** A human-readable description of the status of this operation. */
  message?: boolean | number;
  metadata?: io_k8s_apimachinery_pkg_apis_meta_v1_ListMetaRequest;
  /** A machine-readable description of why this operation is in the "Failure" status. If this value is empty there is no information available. A Reason clarifies an HTTP status code but does not override it. */
  reason?: boolean | number;
  /** Status of the operation. One of: "Success" or "Failure". More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#spec-and-status */
  status?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
}

/** StatusDetails is a set of additional properties that MAY be set by the server to provide additional information about a response. The Reason field of a Status object defines what attributes will be set. Clients must ignore fields that do not match the defined type of each attribute, and should assume that any attribute may be empty, invalid, or under defined. */
export interface io_k8s_apimachinery_pkg_apis_meta_v1_StatusDetailsRequest {
  /** The Causes array includes more details associated with the StatusReason failure. Not all StatusReasons may provide detailed causes. */
  causes?: io_k8s_apimachinery_pkg_apis_meta_v1_StatusCauseRequest;
  /** The group attribute of the resource associated with the status StatusReason. */
  group?: boolean | number;
  /** The kind attribute of the resource associated with the status StatusReason. On some operations may differ from the requested resource Kind. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds */
  kind?: boolean | number;
  /** The name attribute of the resource associated with the status StatusReason (when there is a single name which can be described). */
  name?: boolean | number;
  /** If specified, the time in seconds before the operation should be retried. Some errors may indicate the client must take an alternate action - for those errors this field may indicate how long to wait before taking the alternate action. */
  retryAfterSeconds?: boolean | number;
  /** UID of the resource. (when there is a single resource which can be described). More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names#uids */
  uid?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
}

/** StatusCause provides more information about an api.Status failure, including cases when multiple errors are encountered. */
export interface io_k8s_apimachinery_pkg_apis_meta_v1_StatusCauseRequest {
  /**
   * The field of the resource that has caused this error, as named by its JSON serialization. May include dot and postfix notation for nested attributes. Arrays are zero-indexed.  Fields may appear more than once in an array of causes due to fields having multiple errors. Optional.
   *
   * Examples:
   *   "name" - the field "name" on the current resource
   *   "items[0].name" - the field "name" on the first array entry in "items"
   */
  field?: boolean | number;
  /** A human-readable description of the cause of the error.  This field may be presented as-is to a reader. */
  message?: boolean | number;
  /** A machine-readable description of the cause of the error. If this value is empty there is no information available. */
  reason?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
}

/** OrganizationMembershipList is a list of OrganizationMembership */
export interface com_miloapis_resourcemanager_v1alpha1_OrganizationMembershipListRequest {
  /** APIVersion defines the versioned schema of this representation of an object. Servers should convert recognized schemas to the latest internal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources */
  apiVersion?: boolean | number;
  /** List of organizationmemberships. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md */
  items?: com_miloapis_resourcemanager_v1alpha1_OrganizationMembershipRequest;
  /** Kind is a string value representing the REST resource this object represents. Servers may infer this from the endpoint the client submits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds */
  kind?: boolean | number;
  metadata?: io_k8s_apimachinery_pkg_apis_meta_v1_ListMetaRequest;
  __typename?: boolean | number;
  __scalar?: boolean | number;
}

/**
 * OrganizationMembership establishes a user's membership in an organization and
 * optionally assigns roles to grant permissions. The controller automatically
 * manages PolicyBinding resources for each assigned role, simplifying access
 * control management.
 *
 * Key features:
 *   - Establishes user-organization relationship
 *   - Automatic PolicyBinding creation and deletion for assigned roles
 *   - Supports multiple roles per membership
 *   - Cross-namespace role references
 *   - Detailed status tracking with per-role reconciliation state
 *
 * Prerequisites:
 *   - User resource must exist
 *   - Organization resource must exist
 *   - Referenced Role resources must exist in their respective namespaces
 *
 * Example - Basic membership with role assignment:
 *
 * 	apiVersion: resourcemanager.miloapis.com/v1alpha1
 * 	kind: OrganizationMembership
 * 	metadata:
 * 	  name: jane-acme-membership
 * 	  namespace: organization-acme-corp
 * 	spec:
 * 	  organizationRef:
 * 	    name: acme-corp
 * 	  userRef:
 * 	    name: jane-doe
 * 	  roles:
 * 	  - name: organization-viewer
 * 	    namespace: organization-acme-corp
 *
 * Related resources:
 *   - User: The user being granted membership
 *   - Organization: The organization the user joins
 *   - Role: Defines permissions granted to the user
 *   - PolicyBinding: Automatically created by the controller for each role
 */
export interface com_miloapis_resourcemanager_v1alpha1_OrganizationMembershipRequest {
  /** APIVersion defines the versioned schema of this representation of an object. Servers should convert recognized schemas to the latest internal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources */
  apiVersion?: boolean | number;
  /** Kind is a string value representing the REST resource this object represents. Servers may infer this from the endpoint the client submits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds */
  kind?: boolean | number;
  metadata?: io_k8s_apimachinery_pkg_apis_meta_v1_ObjectMetaRequest;
  spec?: query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_specRequest;
  status?: query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_statusRequest;
  __typename?: boolean | number;
  __scalar?: boolean | number;
}

/**
 * OrganizationMembershipSpec defines the desired state of OrganizationMembership.
 * It specifies which user should be a member of which organization, and optionally
 * which roles should be assigned to grant permissions.
 */
export interface query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_specRequest {
  organizationRef?: query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_organizationRefRequest;
  /**
   * Roles specifies a list of roles to assign to the user within the organization.
   * The controller automatically creates and manages PolicyBinding resources for
   * each role. Roles can be added or removed after the membership is created.
   *
   * Optional field. When omitted or empty, the membership is established without
   * any role assignments. Roles can be added later via update operations.
   *
   * Each role reference must specify:
   *   - name: The role name (required)
   *   - namespace: The role namespace (optional, defaults to membership namespace)
   *
   * Duplicate roles are prevented by admission webhook validation.
   *
   * Example:
   *
   *   roles:
   *   - name: organization-admin
   *     namespace: organization-acme-corp
   *   - name: billing-manager
   *     namespace: organization-acme-corp
   *   - name: shared-developer
   *     namespace: milo-system
   */
  roles?: query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_roles_itemsRequest;
  userRef?: query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_userRefRequest;
  __typename?: boolean | number;
  __scalar?: boolean | number;
}

/**
 * OrganizationRef identifies the organization to grant membership in.
 * The organization must exist before creating the membership.
 *
 * Required field.
 */
export interface query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_organizationRefRequest {
  /** Name is the name of resource being referenced */
  name?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
}

/** RoleReference defines a reference to a Role resource for organization membership. */
export interface query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_roles_itemsRequest {
  /** Name of the referenced Role. */
  name?: boolean | number;
  /**
   * Namespace of the referenced Role.
   * If not specified, it defaults to the organization membership's namespace.
   */
  namespace?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
}

/**
 * UserRef identifies the user to grant organization membership.
 * The user must exist before creating the membership.
 *
 * Required field.
 */
export interface query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_userRefRequest {
  /** Name is the name of resource being referenced */
  name?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
}

/**
 * OrganizationMembershipStatus defines the observed state of OrganizationMembership.
 * The controller populates this status to reflect the current reconciliation state,
 * including whether the membership is ready and which roles have been successfully applied.
 */
export interface query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_statusRequest {
  /**
   * AppliedRoles tracks the reconciliation state of each role in spec.roles.
   * This array provides per-role status, making it easy to identify which
   * roles are applied and which failed.
   *
   * Each entry includes:
   *   - name and namespace: Identifies the role
   *   - status: "Applied", "Pending", or "Failed"
   *   - policyBindingRef: Reference to the created PolicyBinding (when Applied)
   *   - appliedAt: Timestamp when role was applied (when Applied)
   *   - message: Error details (when Failed)
   *
   * Use this to troubleshoot role assignment issues. Roles marked as "Failed"
   * include a message explaining why the PolicyBinding could not be created.
   *
   * Example:
   *
   *   appliedRoles:
   *   - name: org-admin
   *     namespace: organization-acme-corp
   *     status: Applied
   *     appliedAt: "2025-10-28T10:00:00Z"
   *     policyBindingRef:
   *       name: jane-acme-membership-a1b2c3d4
   *       namespace: organization-acme-corp
   *   - name: invalid-role
   *     namespace: organization-acme-corp
   *     status: Failed
   *     message: "role 'invalid-role' not found in namespace 'organization-acme-corp'"
   */
  appliedRoles?: query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_itemsRequest;
  /**
   * Conditions represent the current status of the membership.
   *
   * Standard conditions:
   *   - Ready: Indicates membership has been established (user and org exist)
   *   - RolesApplied: Indicates whether all roles have been successfully applied
   *
   * Check the RolesApplied condition to determine overall role assignment status:
   *   - True with reason "AllRolesApplied": All roles successfully applied
   *   - True with reason "NoRolesSpecified": No roles in spec, membership only
   *   - False with reason "PartialRolesApplied": Some roles failed (check appliedRoles for details)
   */
  conditions?: query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_conditions_itemsRequest;
  /**
   * ObservedGeneration tracks the most recent membership spec that the
   * controller has processed. Use this to determine if status reflects
   * the latest changes.
   */
  observedGeneration?: boolean | number;
  organization?: query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_organizationRequest;
  user?: query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_userRequest;
  __typename?: boolean | number;
  __scalar?: boolean | number;
}

/**
 * AppliedRole tracks the reconciliation status of a single role assignment
 * within an organization membership. The controller maintains this status to
 * provide visibility into which roles are successfully applied and which failed.
 */
export interface query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_itemsRequest {
  /**
   * AppliedAt records when this role was successfully applied.
   * Corresponds to the PolicyBinding creation time.
   *
   * Only populated when Status is "Applied".
   */
  appliedAt?: boolean | number;
  /**
   * Message provides additional context about the role status.
   * Contains error details when Status is "Failed", explaining why the
   * PolicyBinding could not be created.
   *
   * Common failure messages:
   *   - "role 'role-name' not found in namespace 'namespace'"
   *   - "Failed to create PolicyBinding: <error details>"
   *
   * Empty when Status is "Applied" or "Pending".
   */
  message?: boolean | number;
  /**
   * Name identifies the Role resource.
   *
   * Required field.
   */
  name?: boolean | number;
  /**
   * Namespace identifies the namespace containing the Role resource.
   * Empty when the role is in the membership's namespace.
   */
  namespace?: boolean | number;
  policyBindingRef?: query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items_policyBindingRefRequest;
  status?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
}

/**
 * PolicyBindingRef references the PolicyBinding resource that was
 * automatically created for this role.
 *
 * Only populated when Status is "Applied". Use this reference to
 * inspect or troubleshoot the underlying PolicyBinding.
 */
export interface query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items_policyBindingRefRequest {
  /** Name of the PolicyBinding resource. */
  name?: boolean | number;
  /** Namespace of the PolicyBinding resource. */
  namespace?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
}

/** Condition contains details for one aspect of the current state of this API Resource. */
export interface query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_conditions_itemsRequest {
  /**
   * lastTransitionTime is the last time the condition transitioned from one status to another.
   * This should be when the underlying condition changed.  If that is not known, then using the time when the API field changed is acceptable.
   */
  lastTransitionTime?: boolean | number;
  /**
   * message is a human readable message indicating details about the transition.
   * This may be an empty string.
   */
  message?: boolean | number;
  /**
   * observedGeneration represents the .metadata.generation that the condition was set based upon.
   * For instance, if .metadata.generation is currently 12, but the .status.conditions[x].observedGeneration is 9, the condition is out of date
   * with respect to the current state of the instance.
   */
  observedGeneration?: boolean | number;
  reason?: boolean | number;
  status?: boolean | number;
  type?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
}

/**
 * Organization contains cached information about the organization in this membership.
 * This information is populated by the controller from the referenced organization.
 */
export interface query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_organizationRequest {
  /** DisplayName is the display name of the organization in the membership. */
  displayName?: boolean | number;
  /** Type is the type of the organization in the membership. */
  type?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
}

/**
 * User contains cached information about the user in this membership.
 * This information is populated by the controller from the referenced user.
 */
export interface query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_userRequest {
  /** AvatarURL is the avatar URL of the user in the membership. */
  avatarUrl?: boolean | number;
  /** Email is the email of the user in the membership. */
  email?: boolean | number;
  /** FamilyName is the family name of the user in the membership. */
  familyName?: boolean | number;
  /** GivenName is the given name of the user in the membership. */
  givenName?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
}

/**
 * Use lowercase for path, which influences plural name. Ensure kind is Organization.
 * Organization is the Schema for the Organizations API
 */
export interface com_miloapis_resourcemanager_v1alpha1_OrganizationRequest {
  /** APIVersion defines the versioned schema of this representation of an object. Servers should convert recognized schemas to the latest internal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources */
  apiVersion?: boolean | number;
  /** Kind is a string value representing the REST resource this object represents. Servers may infer this from the endpoint the client submits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds */
  kind?: boolean | number;
  metadata?: io_k8s_apimachinery_pkg_apis_meta_v1_ObjectMetaRequest;
  spec?: query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_specRequest;
  status?: query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_statusRequest;
  __typename?: boolean | number;
  __scalar?: boolean | number;
}

/** OrganizationSpec defines the desired state of Organization */
export interface query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_specRequest {
  type?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
}

/** OrganizationStatus defines the observed state of Organization */
export interface query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_statusRequest {
  /**
   * Conditions represents the observations of an organization's current state.
   * Known condition types are: "Ready"
   */
  conditions?: query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_itemsRequest;
  /** ObservedGeneration is the most recent generation observed for this Organization by the controller. */
  observedGeneration?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
}

/** Condition contains details for one aspect of the current state of this API Resource. */
export interface query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_itemsRequest {
  /**
   * lastTransitionTime is the last time the condition transitioned from one status to another.
   * This should be when the underlying condition changed.  If that is not known, then using the time when the API field changed is acceptable.
   */
  lastTransitionTime?: boolean | number;
  /**
   * message is a human readable message indicating details about the transition.
   * This may be an empty string.
   */
  message?: boolean | number;
  /**
   * observedGeneration represents the .metadata.generation that the condition was set based upon.
   * For instance, if .metadata.generation is currently 12, but the .status.conditions[x].observedGeneration is 9, the condition is out of date
   * with respect to the current state of the instance.
   */
  observedGeneration?: boolean | number;
  reason?: boolean | number;
  status?: boolean | number;
  type?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
}

/** ObjectMeta is metadata that all persisted resources must have, which includes all objects users must create. */
export interface io_k8s_apimachinery_pkg_apis_meta_v1_ObjectMeta_Input {
  /** Annotations is an unstructured key value map stored with a resource that may be set by external tools to store and retrieve arbitrary metadata. They are not queryable and should be preserved when modifying objects. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations */
  annotations?: Scalars['JSON'] | null;
  /** Time is a wrapper around time.Time which supports correct marshaling to YAML and JSON.  Wrappers are provided for many of the factory methods that the time package offers. */
  creationTimestamp?: Scalars['DateTime'] | null;
  /** Number of seconds allowed for this object to gracefully terminate before it will be removed from the system. Only set when deletionTimestamp is also set. May only be shortened. Read-only. */
  deletionGracePeriodSeconds?: Scalars['BigInt'] | null;
  /** Time is a wrapper around time.Time which supports correct marshaling to YAML and JSON.  Wrappers are provided for many of the factory methods that the time package offers. */
  deletionTimestamp?: Scalars['DateTime'] | null;
  /** Must be empty before the object is deleted from the registry. Each entry is an identifier for the responsible component that will remove the entry from the list. If the deletionTimestamp of the object is non-nil, entries in this list can only be removed. Finalizers may be processed and removed in any order.  Order is NOT enforced because it introduces significant risk of stuck finalizers. finalizers is a shared field, any actor with permission can reorder it. If the finalizer list is processed in order, then this can lead to a situation in which the component responsible for the first finalizer in the list is waiting for a signal (field value, external system, or other) produced by a component responsible for a finalizer later in the list, resulting in a deadlock. Without enforced ordering finalizers are free to order amongst themselves and are not vulnerable to ordering changes in the list. */
  finalizers?: (Scalars['String'] | null)[] | null;
  /**
   * GenerateName is an optional prefix, used by the server, to generate a unique name ONLY IF the Name field has not been provided. If this field is used, the name returned to the client will be different than the name passed. This value will also be combined with a unique suffix. The provided value has the same validation rules as the Name field, and may be truncated by the length of the suffix required to make the value unique on the server.
   *
   * If this field is specified and the generated name exists, the server will return a 409.
   *
   * Applied only if Name is not specified. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#idempotency
   */
  generateName?: Scalars['String'] | null;
  /** A sequence number representing a specific generation of the desired state. Populated by the system. Read-only. */
  generation?: Scalars['BigInt'] | null;
  /** Map of string keys and values that can be used to organize and categorize (scope and select) objects. May match selectors of replication controllers and services. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels */
  labels?: Scalars['JSON'] | null;
  /** ManagedFields maps workflow-id and version to the set of fields that are managed by that workflow. This is mostly for internal housekeeping, and users typically shouldn't need to set or understand this field. A workflow can be the user's name, a controller's name, or the name of a specific apply path like "ci-cd". The set of fields is always in the version that the workflow used when modifying the object. */
  managedFields?: (io_k8s_apimachinery_pkg_apis_meta_v1_ManagedFieldsEntry_Input | null)[] | null;
  /** Name must be unique within a namespace. Is required when creating resources, although some resources may allow a client to request the generation of an appropriate name automatically. Name is primarily intended for creation idempotence and configuration definition. Cannot be updated. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names#names */
  name?: Scalars['String'] | null;
  /**
   * Namespace defines the space within which each name must be unique. An empty namespace is equivalent to the "default" namespace, but "default" is the canonical representation. Not all objects are required to be scoped to a namespace - the value of this field for those objects will be empty.
   *
   * Must be a DNS_LABEL. Cannot be updated. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces
   */
  namespace?: Scalars['String'] | null;
  /** List of objects depended by this object. If ALL objects in the list have been deleted, this object will be garbage collected. If this object is managed by a controller, then an entry in this list will point to this controller, with the controller field set to true. There cannot be more than one managing controller. */
  ownerReferences?: (io_k8s_apimachinery_pkg_apis_meta_v1_OwnerReference_Input | null)[] | null;
  /**
   * An opaque value that represents the internal version of this object that can be used by clients to determine when objects have changed. May be used for optimistic concurrency, change detection, and the watch operation on a resource or set of resources. Clients must treat these values as opaque and passed unmodified back to the server. They may only be valid for a particular resource or set of resources.
   *
   * Populated by the system. Read-only. Value must be treated as opaque by clients and . More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#concurrency-control-and-consistency
   */
  resourceVersion?: Scalars['String'] | null;
  /** Deprecated: selfLink is a legacy read-only field that is no longer populated by the system. */
  selfLink?: Scalars['String'] | null;
  /**
   * UID is the unique in time and space value for this object. It is typically generated by the server on successful creation of a resource and is not allowed to change on PUT operations.
   *
   * Populated by the system. Read-only. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names#uids
   */
  uid?: Scalars['String'] | null;
}

/** ManagedFieldsEntry is a workflow-id, a FieldSet and the group version of the resource that the fieldset applies to. */
export interface io_k8s_apimachinery_pkg_apis_meta_v1_ManagedFieldsEntry_Input {
  /** APIVersion defines the version of this resource that this field set applies to. The format is "group/version" just like the top-level APIVersion field. It is necessary to track the version of a field set because it cannot be automatically converted. */
  apiVersion?: Scalars['String'] | null;
  /** FieldsType is the discriminator for the different fields format and version. There is currently only one possible value: "FieldsV1" */
  fieldsType?: Scalars['String'] | null;
  fieldsV1?: Scalars['JSON'] | null;
  /** Manager is an identifier of the workflow managing these fields. */
  manager?: Scalars['String'] | null;
  /** Operation is the type of operation which lead to this ManagedFieldsEntry being created. The only valid values for this field are 'Apply' and 'Update'. */
  operation?: Scalars['String'] | null;
  /** Subresource is the name of the subresource used to update that object, or empty string if the object was updated through the main resource. The value of this field is used to distinguish between managers, even if they share the same name. For example, a status update will be distinct from a regular update using the same manager name. Note that the APIVersion field is not related to the Subresource field and it always corresponds to the version of the main resource. */
  subresource?: Scalars['String'] | null;
  /** Time is a wrapper around time.Time which supports correct marshaling to YAML and JSON.  Wrappers are provided for many of the factory methods that the time package offers. */
  time?: Scalars['DateTime'] | null;
}

/** OwnerReference contains enough information to let you identify an owning object. An owning object must be in the same namespace as the dependent, or be cluster-scoped, so there is no namespace field. */
export interface io_k8s_apimachinery_pkg_apis_meta_v1_OwnerReference_Input {
  /** API version of the referent. */
  apiVersion: Scalars['String'];
  /** If true, AND if the owner has the "foregroundDeletion" finalizer, then the owner cannot be deleted from the key-value store until this reference is removed. See https://kubernetes.io/docs/concepts/architecture/garbage-collection/#foreground-deletion for how the garbage collector interacts with this field and enforces the foreground deletion. Defaults to false. To set this field, a user needs "delete" permission of the owner, otherwise 422 (Unprocessable Entity) will be returned. */
  blockOwnerDeletion?: Scalars['Boolean'] | null;
  /** If true, this reference points to the managing controller. */
  controller?: Scalars['Boolean'] | null;
  /** Kind of the referent. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds */
  kind: Scalars['String'];
  /** Name of the referent. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names#names */
  name: Scalars['String'];
  /** UID of the referent. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names#uids */
  uid: Scalars['String'];
}

/** DeleteOptions may be provided when deleting an API object. */
export interface io_k8s_apimachinery_pkg_apis_meta_v1_DeleteOptions_Input {
  /** APIVersion defines the versioned schema of this representation of an object. Servers should convert recognized schemas to the latest internal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources */
  apiVersion?: Scalars['String'] | null;
  /** When present, indicates that modifications should not be persisted. An invalid or unrecognized dryRun directive will result in an error response and no further processing of the request. Valid values are: - All: all dry run stages will be processed */
  dryRun?: (Scalars['String'] | null)[] | null;
  /** The duration in seconds before the object should be deleted. Value must be non-negative integer. The value zero indicates delete immediately. If this value is nil, the default grace period for the specified type will be used. Defaults to a per object value if not specified. zero means delete immediately. */
  gracePeriodSeconds?: Scalars['BigInt'] | null;
  /** if set to true, it will trigger an unsafe deletion of the resource in case the normal deletion flow fails with a corrupt object error. A resource is considered corrupt if it can not be retrieved from the underlying storage successfully because of a) its data can not be transformed e.g. decryption failure, or b) it fails to decode into an object. NOTE: unsafe deletion ignores finalizer constraints, skips precondition checks, and removes the object from the storage. WARNING: This may potentially break the cluster if the workload associated with the resource being unsafe-deleted relies on normal deletion flow. Use only if you REALLY know what you are doing. The default value is false, and the user must opt in to enable it */
  ignoreStoreReadErrorWithClusterBreakingPotential?: Scalars['Boolean'] | null;
  /** Kind is a string value representing the REST resource this object represents. Servers may infer this from the endpoint the client submits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds */
  kind?: Scalars['String'] | null;
  /** Deprecated: please use the PropagationPolicy, this field will be deprecated in 1.7. Should the dependent objects be orphaned. If true/false, the "orphan" finalizer will be added to/removed from the object's finalizers list. Either this field or PropagationPolicy may be set, but not both. */
  orphanDependents?: Scalars['Boolean'] | null;
  preconditions?: io_k8s_apimachinery_pkg_apis_meta_v1_Preconditions_Input | null;
  /** Whether and how garbage collection will be performed. Either this field or OrphanDependents may be set, but not both. The default policy is decided by the existing finalizer set in the metadata.finalizers and the resource-specific default policy. Acceptable values are: 'Orphan' - orphan the dependents; 'Background' - allow the garbage collector to delete the dependents in the background; 'Foreground' - a cascading policy that deletes all dependents in the foreground. */
  propagationPolicy?: Scalars['String'] | null;
}

/** Preconditions must be fulfilled before an operation (update, delete, etc.) is carried out. */
export interface io_k8s_apimachinery_pkg_apis_meta_v1_Preconditions_Input {
  /** Specifies the target ResourceVersion */
  resourceVersion?: Scalars['String'] | null;
  /** Specifies the target UID. */
  uid?: Scalars['String'] | null;
}

/**
 * Use lowercase for path, which influences plural name. Ensure kind is Organization.
 * Organization is the Schema for the Organizations API
 */
export interface com_miloapis_resourcemanager_v1alpha1_Organization_Input {
  /** APIVersion defines the versioned schema of this representation of an object. Servers should convert recognized schemas to the latest internal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources */
  apiVersion?: Scalars['String'] | null;
  /** Kind is a string value representing the REST resource this object represents. Servers may infer this from the endpoint the client submits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds */
  kind?: Scalars['String'] | null;
  metadata?: io_k8s_apimachinery_pkg_apis_meta_v1_ObjectMeta_Input | null;
  spec: query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec_Input;
  status?: query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_Input | null;
}

/** OrganizationSpec defines the desired state of Organization */
export interface query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec_Input {
  type: query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec_type;
}

/** OrganizationStatus defines the observed state of Organization */
export interface query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_Input {
  /**
   * Conditions represents the observations of an organization's current state.
   * Known condition types are: "Ready"
   */
  conditions?:
    | (query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items_Input | null)[]
    | null;
  /** ObservedGeneration is the most recent generation observed for this Organization by the controller. */
  observedGeneration?: Scalars['BigInt'] | null;
}

/** Condition contains details for one aspect of the current state of this API Resource. */
export interface query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items_Input {
  /**
   * lastTransitionTime is the last time the condition transitioned from one status to another.
   * This should be when the underlying condition changed.  If that is not known, then using the time when the API field changed is acceptable.
   */
  lastTransitionTime: Scalars['DateTime'];
  /**
   * message is a human readable message indicating details about the transition.
   * This may be an empty string.
   */
  message: Scalars['query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items_message'];
  /**
   * observedGeneration represents the .metadata.generation that the condition was set based upon.
   * For instance, if .metadata.generation is currently 12, but the .status.conditions[x].observedGeneration is 9, the condition is out of date
   * with respect to the current state of the instance.
   */
  observedGeneration?: Scalars['BigInt'] | null;
  reason: Scalars['query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items_reason'];
  status: query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items_status;
  type: Scalars['query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items_type'];
}

const Query_possibleTypes: string[] = ['Query'];
export const isQuery = (obj?: { __typename?: any } | null): obj is Query => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isQuery"');
  return Query_possibleTypes.includes(obj.__typename);
};

const io_k8s_apimachinery_pkg_apis_meta_v1_ObjectMeta_possibleTypes: string[] = [
  'io_k8s_apimachinery_pkg_apis_meta_v1_ObjectMeta',
];
export const isio_k8s_apimachinery_pkg_apis_meta_v1_ObjectMeta = (
  obj?: { __typename?: any } | null
): obj is io_k8s_apimachinery_pkg_apis_meta_v1_ObjectMeta => {
  if (!obj?.__typename)
    throw new Error('__typename is missing in "isio_k8s_apimachinery_pkg_apis_meta_v1_ObjectMeta"');
  return io_k8s_apimachinery_pkg_apis_meta_v1_ObjectMeta_possibleTypes.includes(obj.__typename);
};

const io_k8s_apimachinery_pkg_apis_meta_v1_ManagedFieldsEntry_possibleTypes: string[] = [
  'io_k8s_apimachinery_pkg_apis_meta_v1_ManagedFieldsEntry',
];
export const isio_k8s_apimachinery_pkg_apis_meta_v1_ManagedFieldsEntry = (
  obj?: { __typename?: any } | null
): obj is io_k8s_apimachinery_pkg_apis_meta_v1_ManagedFieldsEntry => {
  if (!obj?.__typename)
    throw new Error(
      '__typename is missing in "isio_k8s_apimachinery_pkg_apis_meta_v1_ManagedFieldsEntry"'
    );
  return io_k8s_apimachinery_pkg_apis_meta_v1_ManagedFieldsEntry_possibleTypes.includes(
    obj.__typename
  );
};

const io_k8s_apimachinery_pkg_apis_meta_v1_OwnerReference_possibleTypes: string[] = [
  'io_k8s_apimachinery_pkg_apis_meta_v1_OwnerReference',
];
export const isio_k8s_apimachinery_pkg_apis_meta_v1_OwnerReference = (
  obj?: { __typename?: any } | null
): obj is io_k8s_apimachinery_pkg_apis_meta_v1_OwnerReference => {
  if (!obj?.__typename)
    throw new Error(
      '__typename is missing in "isio_k8s_apimachinery_pkg_apis_meta_v1_OwnerReference"'
    );
  return io_k8s_apimachinery_pkg_apis_meta_v1_OwnerReference_possibleTypes.includes(obj.__typename);
};

const io_k8s_apimachinery_pkg_apis_meta_v1_ListMeta_possibleTypes: string[] = [
  'io_k8s_apimachinery_pkg_apis_meta_v1_ListMeta',
];
export const isio_k8s_apimachinery_pkg_apis_meta_v1_ListMeta = (
  obj?: { __typename?: any } | null
): obj is io_k8s_apimachinery_pkg_apis_meta_v1_ListMeta => {
  if (!obj?.__typename)
    throw new Error('__typename is missing in "isio_k8s_apimachinery_pkg_apis_meta_v1_ListMeta"');
  return io_k8s_apimachinery_pkg_apis_meta_v1_ListMeta_possibleTypes.includes(obj.__typename);
};

const Mutation_possibleTypes: string[] = ['Mutation'];
export const isMutation = (obj?: { __typename?: any } | null): obj is Mutation => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isMutation"');
  return Mutation_possibleTypes.includes(obj.__typename);
};

const io_k8s_apimachinery_pkg_apis_meta_v1_Status_possibleTypes: string[] = [
  'io_k8s_apimachinery_pkg_apis_meta_v1_Status',
];
export const isio_k8s_apimachinery_pkg_apis_meta_v1_Status = (
  obj?: { __typename?: any } | null
): obj is io_k8s_apimachinery_pkg_apis_meta_v1_Status => {
  if (!obj?.__typename)
    throw new Error('__typename is missing in "isio_k8s_apimachinery_pkg_apis_meta_v1_Status"');
  return io_k8s_apimachinery_pkg_apis_meta_v1_Status_possibleTypes.includes(obj.__typename);
};

const io_k8s_apimachinery_pkg_apis_meta_v1_StatusDetails_possibleTypes: string[] = [
  'io_k8s_apimachinery_pkg_apis_meta_v1_StatusDetails',
];
export const isio_k8s_apimachinery_pkg_apis_meta_v1_StatusDetails = (
  obj?: { __typename?: any } | null
): obj is io_k8s_apimachinery_pkg_apis_meta_v1_StatusDetails => {
  if (!obj?.__typename)
    throw new Error(
      '__typename is missing in "isio_k8s_apimachinery_pkg_apis_meta_v1_StatusDetails"'
    );
  return io_k8s_apimachinery_pkg_apis_meta_v1_StatusDetails_possibleTypes.includes(obj.__typename);
};

const io_k8s_apimachinery_pkg_apis_meta_v1_StatusCause_possibleTypes: string[] = [
  'io_k8s_apimachinery_pkg_apis_meta_v1_StatusCause',
];
export const isio_k8s_apimachinery_pkg_apis_meta_v1_StatusCause = (
  obj?: { __typename?: any } | null
): obj is io_k8s_apimachinery_pkg_apis_meta_v1_StatusCause => {
  if (!obj?.__typename)
    throw new Error(
      '__typename is missing in "isio_k8s_apimachinery_pkg_apis_meta_v1_StatusCause"'
    );
  return io_k8s_apimachinery_pkg_apis_meta_v1_StatusCause_possibleTypes.includes(obj.__typename);
};

const com_miloapis_resourcemanager_v1alpha1_OrganizationMembershipList_possibleTypes: string[] = [
  'com_miloapis_resourcemanager_v1alpha1_OrganizationMembershipList',
];
export const iscom_miloapis_resourcemanager_v1alpha1_OrganizationMembershipList = (
  obj?: { __typename?: any } | null
): obj is com_miloapis_resourcemanager_v1alpha1_OrganizationMembershipList => {
  if (!obj?.__typename)
    throw new Error(
      '__typename is missing in "iscom_miloapis_resourcemanager_v1alpha1_OrganizationMembershipList"'
    );
  return com_miloapis_resourcemanager_v1alpha1_OrganizationMembershipList_possibleTypes.includes(
    obj.__typename
  );
};

const com_miloapis_resourcemanager_v1alpha1_OrganizationMembership_possibleTypes: string[] = [
  'com_miloapis_resourcemanager_v1alpha1_OrganizationMembership',
];
export const iscom_miloapis_resourcemanager_v1alpha1_OrganizationMembership = (
  obj?: { __typename?: any } | null
): obj is com_miloapis_resourcemanager_v1alpha1_OrganizationMembership => {
  if (!obj?.__typename)
    throw new Error(
      '__typename is missing in "iscom_miloapis_resourcemanager_v1alpha1_OrganizationMembership"'
    );
  return com_miloapis_resourcemanager_v1alpha1_OrganizationMembership_possibleTypes.includes(
    obj.__typename
  );
};

const query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_possibleTypes: string[] =
  ['query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec'];
export const isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec =
  (
    obj?: { __typename?: any } | null
  ): obj is query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec => {
    if (!obj?.__typename)
      throw new Error(
        '__typename is missing in "isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec"'
      );
    return query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_possibleTypes.includes(
      obj.__typename
    );
  };

const query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_organizationRef_possibleTypes: string[] =
  [
    'query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_organizationRef',
  ];
export const isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_organizationRef =
  (
    obj?: { __typename?: any } | null
  ): obj is query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_organizationRef => {
    if (!obj?.__typename)
      throw new Error(
        '__typename is missing in "isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_organizationRef"'
      );
    return query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_organizationRef_possibleTypes.includes(
      obj.__typename
    );
  };

const query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_roles_items_possibleTypes: string[] =
  [
    'query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_roles_items',
  ];
export const isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_roles_items =
  (
    obj?: { __typename?: any } | null
  ): obj is query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_roles_items => {
    if (!obj?.__typename)
      throw new Error(
        '__typename is missing in "isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_roles_items"'
      );
    return query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_roles_items_possibleTypes.includes(
      obj.__typename
    );
  };

const query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_userRef_possibleTypes: string[] =
  [
    'query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_userRef',
  ];
export const isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_userRef =
  (
    obj?: { __typename?: any } | null
  ): obj is query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_userRef => {
    if (!obj?.__typename)
      throw new Error(
        '__typename is missing in "isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_userRef"'
      );
    return query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_spec_userRef_possibleTypes.includes(
      obj.__typename
    );
  };

const query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_possibleTypes: string[] =
  [
    'query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status',
  ];
export const isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status =
  (
    obj?: { __typename?: any } | null
  ): obj is query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status => {
    if (!obj?.__typename)
      throw new Error(
        '__typename is missing in "isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status"'
      );
    return query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_possibleTypes.includes(
      obj.__typename
    );
  };

const query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items_possibleTypes: string[] =
  [
    'query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items',
  ];
export const isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items =
  (
    obj?: { __typename?: any } | null
  ): obj is query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items => {
    if (!obj?.__typename)
      throw new Error(
        '__typename is missing in "isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items"'
      );
    return query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items_possibleTypes.includes(
      obj.__typename
    );
  };

const query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items_policyBindingRef_possibleTypes: string[] =
  [
    'query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items_policyBindingRef',
  ];
export const isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items_policyBindingRef =
  (
    obj?: { __typename?: any } | null
  ): obj is query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items_policyBindingRef => {
    if (!obj?.__typename)
      throw new Error(
        '__typename is missing in "isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items_policyBindingRef"'
      );
    return query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_appliedRoles_items_policyBindingRef_possibleTypes.includes(
      obj.__typename
    );
  };

const query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_conditions_items_possibleTypes: string[] =
  [
    'query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_conditions_items',
  ];
export const isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_conditions_items =
  (
    obj?: { __typename?: any } | null
  ): obj is query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_conditions_items => {
    if (!obj?.__typename)
      throw new Error(
        '__typename is missing in "isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_conditions_items"'
      );
    return query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_conditions_items_possibleTypes.includes(
      obj.__typename
    );
  };

const query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_organization_possibleTypes: string[] =
  [
    'query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_organization',
  ];
export const isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_organization =
  (
    obj?: { __typename?: any } | null
  ): obj is query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_organization => {
    if (!obj?.__typename)
      throw new Error(
        '__typename is missing in "isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_organization"'
      );
    return query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_organization_possibleTypes.includes(
      obj.__typename
    );
  };

const query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_user_possibleTypes: string[] =
  [
    'query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_user',
  ];
export const isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_user =
  (
    obj?: { __typename?: any } | null
  ): obj is query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_user => {
    if (!obj?.__typename)
      throw new Error(
        '__typename is missing in "isquery_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_user"'
      );
    return query_listResourcemanagerMiloapisComV1alpha1NamespacedOrganizationMembership_items_items_status_user_possibleTypes.includes(
      obj.__typename
    );
  };

const com_miloapis_resourcemanager_v1alpha1_Organization_possibleTypes: string[] = [
  'com_miloapis_resourcemanager_v1alpha1_Organization',
];
export const iscom_miloapis_resourcemanager_v1alpha1_Organization = (
  obj?: { __typename?: any } | null
): obj is com_miloapis_resourcemanager_v1alpha1_Organization => {
  if (!obj?.__typename)
    throw new Error(
      '__typename is missing in "iscom_miloapis_resourcemanager_v1alpha1_Organization"'
    );
  return com_miloapis_resourcemanager_v1alpha1_Organization_possibleTypes.includes(obj.__typename);
};

const query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec_possibleTypes: string[] =
  ['query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec'];
export const isquery_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec = (
  obj?: { __typename?: any } | null
): obj is query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec => {
  if (!obj?.__typename)
    throw new Error(
      '__typename is missing in "isquery_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec"'
    );
  return query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_spec_possibleTypes.includes(
    obj.__typename
  );
};

const query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_possibleTypes: string[] =
  ['query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status'];
export const isquery_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status = (
  obj?: { __typename?: any } | null
): obj is query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status => {
  if (!obj?.__typename)
    throw new Error(
      '__typename is missing in "isquery_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status"'
    );
  return query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_possibleTypes.includes(
    obj.__typename
  );
};

const query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items_possibleTypes: string[] =
  ['query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items'];
export const isquery_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items =
  (
    obj?: { __typename?: any } | null
  ): obj is query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items => {
    if (!obj?.__typename)
      throw new Error(
        '__typename is missing in "isquery_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items"'
      );
    return query_listResourcemanagerMiloapisComV1alpha1Organization_items_items_status_conditions_items_possibleTypes.includes(
      obj.__typename
    );
  };
