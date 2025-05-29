/**
 * Represents the verification state of an organization
 */
export enum VerificationState {
  // Add appropriate enum values here
  UNSPECIFIED = 'UNSPECIFIED',
  VERIFIED = 'VERIFIED',
  UNVERIFIED = 'UNVERIFIED',
}

/**
 * Specification of an Organization
 */
export interface IOrganizationSpec {
  /**
   * A description of the organization
   */
  description?: string;
}

/**
 * Status of an Organization
 */
export interface IOrganizationStatus {
  /**
   * The verification state of the organization
   * @readonly Output only
   */
  readonly verificationState: VerificationState;

  /**
   * For internal use only
   * @readonly Output only
   */
  readonly internal: boolean;

  /**
   * For internal user only
   * @readonly Output only
   */
  readonly personal: boolean;
}

/**
 * Represents an Organization resource
 * Resource type: resourcemanager.datumapis.com/Organization
 * Pattern: organizations/{organization}
 */
export interface IOrganization {
  /**
   * The resource name of this Organization
   * @readonly Output only, Immutable, Identifier
   */
  readonly name: string;

  /**
   * The resource ID of this Organization
   * @readonly Output only, Immutable
   */
  readonly organizationId: string;

  /**
   * Server assigned unique identifier for the Organization
   * UUID4 string guaranteed to remain unchanged until the resource is deleted
   * @readonly Output only, Immutable
   */
  readonly uid: string;

  /**
   * The ID of this Organization
   * This is a unique identifier used throughout the application
   * If organizationId is empty, the uid value will be used instead
   */

  id?: string;

  /**
   * Human-readable display name of this Organization
   * Maximum length is 63 characters
   */
  displayName?: string;

  /**
   * Unstructured key-value map stored with a Organization
   * May be set by external tools to store and retrieve arbitrary metadata
   * Not queryable and should be preserved when modifying objects
   */
  annotations?: Record<string, string>;

  /**
   * Unstructured key-value map stored with a Organization
   * May be set by external tools to enable platform features
   * which identify Organizations via label selections
   */
  labels?: Record<string, string>;

  /**
   * The time when the Organization was created
   * @readonly Output only, Immutable
   */
  readonly createTime: string;

  /**
   * The last time that the Organization was updated
   * @readonly Output only, Immutable
   */
  readonly updateTime: string;

  /**
   * For a deleted resource, the deletion time
   * Only populated as a response to a Delete request
   * @readonly Output only, Immutable
   */
  readonly deleteTime?: string;

  /**
   * If set, there are currently changes in flight to the Organization
   * @readonly Output only, Immutable
   */
  readonly reconciling: boolean;

  /**
   * Checksum computed by the server based on the value of other fields
   * Might be sent on update requests to ensure the client has an up-to-date value
   * @readonly Output only, Immutable
   */
  readonly etag: string;

  /**
   * The specifications of the Organization
   * @required Required
   */
  spec: IOrganizationSpec;

  /**
   * The status of the Organization
   * @readonly Output only
   */
  readonly status: IOrganizationStatus;
}
