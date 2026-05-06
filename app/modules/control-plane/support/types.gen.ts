// This file is manually written following the @hey-api/openapi-ts pattern
// for support.miloapis.com/v1alpha1

export type ClientOptions = {
  baseUrl: `${string}://temp-openapi-spec.json` | (string & {});
};

export type IoK8sApimachineryPkgApisMetaV1ObjectMeta = {
  annotations?: {
    [key: string]: string;
  };
  creationTimestamp?: string;
  deletionGracePeriodSeconds?: number;
  deletionTimestamp?: string;
  finalizers?: string[];
  generateName?: string;
  generation?: number;
  labels?: {
    [key: string]: string;
  };
  managedFields?: Array<{
    apiVersion?: string;
    fieldsType?: string;
    fieldsV1?: unknown;
    manager?: string;
    operation?: string;
    subresource?: string;
    time?: string;
  }>;
  name?: string;
  namespace?: string;
  ownerReferences?: Array<{
    apiVersion: string;
    blockOwnerDeletion?: boolean;
    controller?: boolean;
    kind: string;
    name: string;
    uid: string;
  }>;
  resourceVersion?: string;
  selfLink?: string;
  uid?: string;
};

export type ComMiloApisSupportV1Alpha1UserReference = {
  name: string;
  displayName?: string;
  email?: string;
};

export type ComMiloApisSupportV1Alpha1ObjectReference = {
  kind?: string;
  name: string;
};

export type ComMiloApisSupportV1Alpha1TicketParticipant = {
  userRef: ComMiloApisSupportV1Alpha1UserReference;
  addedAt?: string;
};

export type ComMiloApisSupportV1Alpha1SupportTicketSpec = {
  title: string;
  description?: string;
  status?: 'open' | 'in-progress' | 'waiting-on-customer' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  ownerRef?: ComMiloApisSupportV1Alpha1UserReference;
  contributors?: ComMiloApisSupportV1Alpha1UserReference[];
  participants?: ComMiloApisSupportV1Alpha1TicketParticipant[];
  tags?: string[];
  visibility?: string;
  organizationRef?: ComMiloApisSupportV1Alpha1ObjectReference;
  reporterRef: ComMiloApisSupportV1Alpha1UserReference;
};

export type ComMiloApisSupportV1Alpha1SupportTicketStatus = {
  phase?: string;
  messageCount?: number;
  lastActivity?: string;
  /** Maps principal name → ISO timestamp of last read. */
  readState?: Record<string, string>;
  conditions?: Array<{ type: string; status: string; message?: string }>;
};

export type ComMiloApisSupportV1Alpha1SupportTicket = {
  apiVersion?: string;
  kind?: string;
  metadata?: IoK8sApimachineryPkgApisMetaV1ObjectMeta;
  spec: ComMiloApisSupportV1Alpha1SupportTicketSpec;
  status?: ComMiloApisSupportV1Alpha1SupportTicketStatus;
};

export type ComMiloApisSupportV1Alpha1SupportTicketList = {
  apiVersion?: string;
  kind?: string;
  metadata?: { continue?: string; resourceVersion?: string };
  items: ComMiloApisSupportV1Alpha1SupportTicket[];
};

export type ComMiloApisSupportV1Alpha1SupportMessageSpec = {
  ticketRef: string;
  body: string;
  authorRef: ComMiloApisSupportV1Alpha1UserReference;
  authorType?: 'staff' | 'customer';
  internal?: boolean;
};

export type ComMiloApisSupportV1Alpha1SupportMessageStatus = {
  createdAt?: string;
  updatedAt?: string;
};

export type ComMiloApisSupportV1Alpha1SupportMessage = {
  apiVersion?: string;
  kind?: string;
  metadata?: IoK8sApimachineryPkgApisMetaV1ObjectMeta;
  spec: ComMiloApisSupportV1Alpha1SupportMessageSpec;
  status?: ComMiloApisSupportV1Alpha1SupportMessageStatus;
};

export type ComMiloApisSupportV1Alpha1SupportMessageList = {
  apiVersion?: string;
  kind?: string;
  metadata?: { continue?: string; resourceVersion?: string };
  items: ComMiloApisSupportV1Alpha1SupportMessage[];
};

// ListSupportTicket operation types

export type ListSupportMiloapisComV1Alpha1SupportTicketData = {
  body?: never;
  path?: never;
  query?: {
    /**
     * A selector to restrict the list of returned objects by their fields.
     */
    fieldSelector?: string;
    /**
     * A selector to restrict the list of returned objects by their labels.
     */
    labelSelector?: string;
    /**
     * limit is a maximum number of responses to return for a list call.
     */
    limit?: number;
    /**
     * The continue option should be set when retrieving more results from the server.
     */
    continue?: string;
  };
  url: '/apis/support.miloapis.com/v1alpha1/supporttickets';
};

export type ListSupportMiloapisComV1Alpha1SupportTicketErrors = {
  [status: number]: unknown;
};

export type ListSupportMiloapisComV1Alpha1SupportTicketResponses = {
  200: ComMiloApisSupportV1Alpha1SupportTicketList;
};

export type ListSupportMiloapisComV1Alpha1SupportTicketResponse =
  ListSupportMiloapisComV1Alpha1SupportTicketResponses[keyof ListSupportMiloapisComV1Alpha1SupportTicketResponses];

// ReadSupportTicket operation types

export type ReadSupportMiloapisComV1Alpha1SupportTicketData = {
  body?: never;
  path: {
    /**
     * name of the SupportTicket
     */
    name: string;
  };
  query?: never;
  url: '/apis/support.miloapis.com/v1alpha1/supporttickets/{name}';
};

export type ReadSupportMiloapisComV1Alpha1SupportTicketErrors = {
  [status: number]: unknown;
};

export type ReadSupportMiloapisComV1Alpha1SupportTicketResponses = {
  200: ComMiloApisSupportV1Alpha1SupportTicket;
};

export type ReadSupportMiloapisComV1Alpha1SupportTicketResponse =
  ReadSupportMiloapisComV1Alpha1SupportTicketResponses[keyof ReadSupportMiloapisComV1Alpha1SupportTicketResponses];

// CreateSupportTicket operation types

export type CreateSupportMiloapisComV1Alpha1SupportTicketData = {
  body: ComMiloApisSupportV1Alpha1SupportTicket;
  path?: never;
  query?: {
    /**
     * When present, indicates that modifications should not be persisted.
     */
    dryRun?: string;
    /**
     * fieldManager is a name associated with the actor or entity making these changes.
     */
    fieldManager?: string;
  };
  url: '/apis/support.miloapis.com/v1alpha1/supporttickets';
};

export type CreateSupportMiloapisComV1Alpha1SupportTicketErrors = {
  [status: number]: unknown;
};

export type CreateSupportMiloapisComV1Alpha1SupportTicketResponses = {
  200: ComMiloApisSupportV1Alpha1SupportTicket;
  201: ComMiloApisSupportV1Alpha1SupportTicket;
  202: ComMiloApisSupportV1Alpha1SupportTicket;
};

export type CreateSupportMiloapisComV1Alpha1SupportTicketResponse =
  CreateSupportMiloapisComV1Alpha1SupportTicketResponses[keyof CreateSupportMiloapisComV1Alpha1SupportTicketResponses];

// PatchSupportTicket operation types

export type PatchSupportMiloapisComV1Alpha1SupportTicketData = {
  body: Record<string, unknown>;
  path: {
    /**
     * name of the SupportTicket
     */
    name: string;
  };
  query?: {
    /**
     * When present, indicates that modifications should not be persisted.
     */
    dryRun?: string;
    /**
     * fieldManager is a name associated with the actor or entity making these changes.
     */
    fieldManager?: string;
  };
  url: '/apis/support.miloapis.com/v1alpha1/supporttickets/{name}';
};

export type PatchSupportMiloapisComV1Alpha1SupportTicketErrors = {
  [status: number]: unknown;
};

export type PatchSupportMiloapisComV1Alpha1SupportTicketResponses = {
  200: ComMiloApisSupportV1Alpha1SupportTicket;
};

export type PatchSupportMiloapisComV1Alpha1SupportTicketResponse =
  PatchSupportMiloapisComV1Alpha1SupportTicketResponses[keyof PatchSupportMiloapisComV1Alpha1SupportTicketResponses];

// ListSupportMessage operation types

export type ListSupportMiloapisComV1Alpha1SupportMessageData = {
  body?: never;
  path?: never;
  query?: {
    /**
     * A selector to restrict the list of returned objects by their fields.
     */
    fieldSelector?: string;
    /**
     * A selector to restrict the list of returned objects by their labels.
     */
    labelSelector?: string;
    /**
     * limit is a maximum number of responses to return for a list call.
     */
    limit?: number;
    /**
     * The continue option should be set when retrieving more results from the server.
     */
    continue?: string;
  };
  url: '/apis/support.miloapis.com/v1alpha1/supportmessages';
};

export type ListSupportMiloapisComV1Alpha1SupportMessageErrors = {
  [status: number]: unknown;
};

export type ListSupportMiloapisComV1Alpha1SupportMessageResponses = {
  200: ComMiloApisSupportV1Alpha1SupportMessageList;
};

export type ListSupportMiloapisComV1Alpha1SupportMessageResponse =
  ListSupportMiloapisComV1Alpha1SupportMessageResponses[keyof ListSupportMiloapisComV1Alpha1SupportMessageResponses];

// CreateSupportMessage operation types

export type CreateSupportMiloapisComV1Alpha1SupportMessageData = {
  body: ComMiloApisSupportV1Alpha1SupportMessage;
  path?: never;
  query?: {
    /**
     * When present, indicates that modifications should not be persisted.
     */
    dryRun?: string;
    /**
     * fieldManager is a name associated with the actor or entity making these changes.
     */
    fieldManager?: string;
  };
  url: '/apis/support.miloapis.com/v1alpha1/supportmessages';
};

export type CreateSupportMiloapisComV1Alpha1SupportMessageErrors = {
  [status: number]: unknown;
};

export type CreateSupportMiloapisComV1Alpha1SupportMessageResponses = {
  200: ComMiloApisSupportV1Alpha1SupportMessage;
  201: ComMiloApisSupportV1Alpha1SupportMessage;
  202: ComMiloApisSupportV1Alpha1SupportMessage;
};

export type CreateSupportMiloapisComV1Alpha1SupportMessageResponse =
  CreateSupportMiloapisComV1Alpha1SupportMessageResponses[keyof CreateSupportMiloapisComV1Alpha1SupportMessageResponses];

// PatchSupportMessage operation types

export type PatchSupportMiloapisComV1Alpha1SupportMessageData = {
  body: Record<string, unknown>;
  path: {
    /**
     * name of the SupportMessage
     */
    name: string;
  };
  query?: {
    dryRun?: string;
    fieldManager?: string;
  };
  url: '/apis/support.miloapis.com/v1alpha1/supportmessages/{name}';
};

export type PatchSupportMiloapisComV1Alpha1SupportMessageErrors = {
  [status: number]: unknown;
};

export type PatchSupportMiloapisComV1Alpha1SupportMessageResponses = {
  200: ComMiloApisSupportV1Alpha1SupportMessage;
};

export type PatchSupportMiloapisComV1Alpha1SupportMessageResponse =
  PatchSupportMiloapisComV1Alpha1SupportMessageResponses[keyof PatchSupportMiloapisComV1Alpha1SupportMessageResponses];
