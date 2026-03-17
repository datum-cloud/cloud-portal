// This file is manually written following the @hey-api/openapi-ts pattern
// for notes.miloapis.com/v1alpha1

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

/**
 * Note is the Schema for the notes API (notes.miloapis.com/v1alpha1).
 * It represents a note attached to a resource via subjectRef.
 */
export type ComMiloapisNotesV1Alpha1Note = {
  /**
   * APIVersion defines the versioned schema of this representation of an object.
   */
  apiVersion?: string;
  /**
   * Kind is a string value representing the REST resource this object represents.
   */
  kind?: string;
  /**
   * Standard object's metadata.
   */
  metadata?: IoK8sApimachineryPkgApisMetaV1ObjectMeta;
  /**
   * NoteSpec defines the desired state of Note.
   */
  spec?: {
    /**
     * Content is the text content of the note. Max 1000 characters.
     */
    content: string;
    /**
     * SubjectRef is a reference to the resource this note is attached to.
     */
    subjectRef: {
      /**
       * APIGroup is the group for the resource being referenced.
       */
      apiGroup: string;
      /**
       * Kind is the type of resource being referenced.
       */
      kind: string;
      /**
       * Name is the name of resource being referenced.
       */
      name: string;
      /**
       * Namespace is the namespace of resource being referenced.
       */
      namespace?: string;
    };
    /**
     * CreatorRef is a reference to the creator of this note.
     * Auto-populated by webhook.
     */
    creatorRef?: {
      /**
       * Name is the name (email) of the creator.
       */
      name?: string;
    };
    /**
     * FollowUp indicates if this note requires a follow-up action.
     */
    followUp?: boolean;
    /**
     * NextAction is an optional follow-up action description.
     */
    nextAction?: string;
    /**
     * NextActionTime is the timestamp for the follow-up action.
     */
    nextActionTime?: string;
    /**
     * InteractionTime is the timestamp of the interaction.
     */
    interactionTime?: string;
  };
  /**
   * NoteStatus defines the observed state of Note.
   */
  status?: {
    /**
     * CreatedBy is the email of the user who created the note.
     */
    createdBy?: string;
    /**
     * Conditions represent the latest available observations of an object's state.
     */
    conditions?: Array<{
      lastTransitionTime: string;
      message: string;
      observedGeneration?: number;
      reason: string;
      status: 'True' | 'False' | 'Unknown';
      type: string;
    }>;
  };
};

/**
 * NoteList is a list of Note
 */
export type ComMiloapisNotesV1Alpha1NoteList = {
  /**
   * APIVersion defines the versioned schema of this representation of an object.
   */
  apiVersion?: string;
  /**
   * List of notes.
   */
  items: Array<ComMiloapisNotesV1Alpha1Note>;
  /**
   * Kind is a string value representing the REST resource this object represents.
   */
  kind?: string;
  /**
   * Standard list metadata.
   */
  metadata?: {
    continue?: string;
    remainingItemCount?: number;
    resourceVersion?: string;
    selfLink?: string;
  };
};

export type ListNotesMiloapisComV1Alpha1NamespacedNoteData = {
  body?: never;
  path: {
    /**
     * object name and auth scope, such as for teams and projects
     */
    namespace: string;
  };
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
  url: '/apis/notes.miloapis.com/v1alpha1/namespaces/{namespace}/notes';
};

export type ListNotesMiloapisComV1Alpha1NamespacedNoteErrors = {
  401: unknown;
};

export type ListNotesMiloapisComV1Alpha1NamespacedNoteResponses = {
  200: ComMiloapisNotesV1Alpha1NoteList;
};

export type ListNotesMiloapisComV1Alpha1NamespacedNoteResponse =
  ListNotesMiloapisComV1Alpha1NamespacedNoteResponses[keyof ListNotesMiloapisComV1Alpha1NamespacedNoteResponses];

export type CreateNotesMiloapisComV1Alpha1NamespacedNoteData = {
  body: ComMiloapisNotesV1Alpha1Note;
  path: {
    /**
     * object name and auth scope, such as for teams and projects
     */
    namespace: string;
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
  url: '/apis/notes.miloapis.com/v1alpha1/namespaces/{namespace}/notes';
};

export type CreateNotesMiloapisComV1Alpha1NamespacedNoteErrors = {
  401: unknown;
};

export type CreateNotesMiloapisComV1Alpha1NamespacedNoteResponses = {
  200: ComMiloapisNotesV1Alpha1Note;
  201: ComMiloapisNotesV1Alpha1Note;
  202: ComMiloapisNotesV1Alpha1Note;
};

export type CreateNotesMiloapisComV1Alpha1NamespacedNoteResponse =
  CreateNotesMiloapisComV1Alpha1NamespacedNoteResponses[keyof CreateNotesMiloapisComV1Alpha1NamespacedNoteResponses];

export type ReadNotesMiloapisComV1Alpha1NamespacedNoteData = {
  body?: never;
  path: {
    /**
     * name of the Note
     */
    name: string;
    /**
     * object name and auth scope, such as for teams and projects
     */
    namespace: string;
  };
  query?: never;
  url: '/apis/notes.miloapis.com/v1alpha1/namespaces/{namespace}/notes/{name}';
};

export type ReadNotesMiloapisComV1Alpha1NamespacedNoteErrors = {
  401: unknown;
};

export type ReadNotesMiloapisComV1Alpha1NamespacedNoteResponses = {
  200: ComMiloapisNotesV1Alpha1Note;
};

export type ReadNotesMiloapisComV1Alpha1NamespacedNoteResponse =
  ReadNotesMiloapisComV1Alpha1NamespacedNoteResponses[keyof ReadNotesMiloapisComV1Alpha1NamespacedNoteResponses];

export type ReplaceNotesMiloapisComV1Alpha1NamespacedNoteData = {
  body: ComMiloapisNotesV1Alpha1Note;
  path: {
    /**
     * name of the Note
     */
    name: string;
    /**
     * object name and auth scope, such as for teams and projects
     */
    namespace: string;
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
  url: '/apis/notes.miloapis.com/v1alpha1/namespaces/{namespace}/notes/{name}';
};

export type ReplaceNotesMiloapisComV1Alpha1NamespacedNoteErrors = {
  401: unknown;
};

export type ReplaceNotesMiloapisComV1Alpha1NamespacedNoteResponses = {
  200: ComMiloapisNotesV1Alpha1Note;
  201: ComMiloapisNotesV1Alpha1Note;
};

export type ReplaceNotesMiloapisComV1Alpha1NamespacedNoteResponse =
  ReplaceNotesMiloapisComV1Alpha1NamespacedNoteResponses[keyof ReplaceNotesMiloapisComV1Alpha1NamespacedNoteResponses];

export type PatchNotesMiloapisComV1Alpha1NamespacedNoteData = {
  body: Record<string, unknown>;
  path: {
    /**
     * name of the Note
     */
    name: string;
    /**
     * object name and auth scope, such as for teams and projects
     */
    namespace: string;
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
  url: '/apis/notes.miloapis.com/v1alpha1/namespaces/{namespace}/notes/{name}';
};

export type PatchNotesMiloapisComV1Alpha1NamespacedNoteErrors = {
  401: unknown;
};

export type PatchNotesMiloapisComV1Alpha1NamespacedNoteResponses = {
  200: ComMiloapisNotesV1Alpha1Note;
};

export type PatchNotesMiloapisComV1Alpha1NamespacedNoteResponse =
  PatchNotesMiloapisComV1Alpha1NamespacedNoteResponses[keyof PatchNotesMiloapisComV1Alpha1NamespacedNoteResponses];

export type DeleteNotesMiloapisComV1Alpha1NamespacedNoteData = {
  body?: never;
  path: {
    /**
     * name of the Note
     */
    name: string;
    /**
     * object name and auth scope, such as for teams and projects
     */
    namespace: string;
  };
  query?: {
    /**
     * When present, indicates that modifications should not be persisted.
     */
    dryRun?: string;
    /**
     * The duration in seconds before the object should be deleted.
     */
    gracePeriodSeconds?: number;
  };
  url: '/apis/notes.miloapis.com/v1alpha1/namespaces/{namespace}/notes/{name}';
};

export type DeleteNotesMiloapisComV1Alpha1NamespacedNoteErrors = {
  401: unknown;
};

export type DeleteNotesMiloapisComV1Alpha1NamespacedNoteResponses = {
  200: ComMiloapisNotesV1Alpha1Note;
};

export type DeleteNotesMiloapisComV1Alpha1NamespacedNoteResponse =
  DeleteNotesMiloapisComV1Alpha1NamespacedNoteResponses[keyof DeleteNotesMiloapisComV1Alpha1NamespacedNoteResponses];
