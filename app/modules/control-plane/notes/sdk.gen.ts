// This file is manually written following the @hey-api/openapi-ts pattern
// for notes.miloapis.com/v1alpha1
import type { Client, Options as Options2, TDataShape } from '../shared/client';
import { client } from '../shared/client.gen';
import type {
  CreateNotesMiloapisComV1Alpha1NamespacedNoteData,
  CreateNotesMiloapisComV1Alpha1NamespacedNoteErrors,
  CreateNotesMiloapisComV1Alpha1NamespacedNoteResponses,
  ReadNotesMiloapisComV1Alpha1NamespacedNoteData,
  ReadNotesMiloapisComV1Alpha1NamespacedNoteErrors,
  ReadNotesMiloapisComV1Alpha1NamespacedNoteResponses,
  ReplaceNotesMiloapisComV1Alpha1NamespacedNoteData,
  ReplaceNotesMiloapisComV1Alpha1NamespacedNoteErrors,
  ReplaceNotesMiloapisComV1Alpha1NamespacedNoteResponses,
  PatchNotesMiloapisComV1Alpha1NamespacedNoteData,
  PatchNotesMiloapisComV1Alpha1NamespacedNoteErrors,
  PatchNotesMiloapisComV1Alpha1NamespacedNoteResponses,
  DeleteNotesMiloapisComV1Alpha1NamespacedNoteData,
  DeleteNotesMiloapisComV1Alpha1NamespacedNoteErrors,
  DeleteNotesMiloapisComV1Alpha1NamespacedNoteResponses,
  ListNotesMiloapisComV1Alpha1NamespacedNoteData,
  ListNotesMiloapisComV1Alpha1NamespacedNoteErrors,
  ListNotesMiloapisComV1Alpha1NamespacedNoteResponses,
} from './types.gen';

type Options<T extends TDataShape, ThrowOnError extends boolean> = Options2<T, ThrowOnError> & {
  client?: Client;
};

export { type Options };

/**
 * list objects of kind Note
 */
export const listNotesMiloapisComV1Alpha1NamespacedNote = <ThrowOnError extends boolean = false>(
  options: Options<ListNotesMiloapisComV1Alpha1NamespacedNoteData, ThrowOnError>
) =>
  (options.client ?? client).get<
    ListNotesMiloapisComV1Alpha1NamespacedNoteResponses,
    ListNotesMiloapisComV1Alpha1NamespacedNoteErrors,
    ThrowOnError
  >({ url: '/apis/notes.miloapis.com/v1alpha1/namespaces/{namespace}/notes', ...options });

/**
 * create a Note
 */
export const createNotesMiloapisComV1Alpha1NamespacedNote = <ThrowOnError extends boolean = false>(
  options: Options<CreateNotesMiloapisComV1Alpha1NamespacedNoteData, ThrowOnError>
) =>
  (options.client ?? client).post<
    CreateNotesMiloapisComV1Alpha1NamespacedNoteResponses,
    CreateNotesMiloapisComV1Alpha1NamespacedNoteErrors,
    ThrowOnError
  >({
    url: '/apis/notes.miloapis.com/v1alpha1/namespaces/{namespace}/notes',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

/**
 * read the specified Note
 */
export const readNotesMiloapisComV1Alpha1NamespacedNote = <ThrowOnError extends boolean = false>(
  options: Options<ReadNotesMiloapisComV1Alpha1NamespacedNoteData, ThrowOnError>
) =>
  (options.client ?? client).get<
    ReadNotesMiloapisComV1Alpha1NamespacedNoteResponses,
    ReadNotesMiloapisComV1Alpha1NamespacedNoteErrors,
    ThrowOnError
  >({
    url: '/apis/notes.miloapis.com/v1alpha1/namespaces/{namespace}/notes/{name}',
    ...options,
  });

/**
 * replace the specified Note
 */
export const replaceNotesMiloapisComV1Alpha1NamespacedNote = <ThrowOnError extends boolean = false>(
  options: Options<ReplaceNotesMiloapisComV1Alpha1NamespacedNoteData, ThrowOnError>
) =>
  (options.client ?? client).put<
    ReplaceNotesMiloapisComV1Alpha1NamespacedNoteResponses,
    ReplaceNotesMiloapisComV1Alpha1NamespacedNoteErrors,
    ThrowOnError
  >({
    url: '/apis/notes.miloapis.com/v1alpha1/namespaces/{namespace}/notes/{name}',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

/**
 * partially update the specified Note (merge-patch)
 */
export const patchNotesMiloapisComV1Alpha1NamespacedNote = <ThrowOnError extends boolean = false>(
  options: Options<PatchNotesMiloapisComV1Alpha1NamespacedNoteData, ThrowOnError>
) =>
  (options.client ?? client).patch<
    PatchNotesMiloapisComV1Alpha1NamespacedNoteResponses,
    PatchNotesMiloapisComV1Alpha1NamespacedNoteErrors,
    ThrowOnError
  >({
    url: '/apis/notes.miloapis.com/v1alpha1/namespaces/{namespace}/notes/{name}',
    ...options,
    headers: {
      'Content-Type': 'application/merge-patch+json',
      ...options.headers,
    },
  });

/**
 * delete a Note
 */
export const deleteNotesMiloapisComV1Alpha1NamespacedNote = <ThrowOnError extends boolean = false>(
  options: Options<DeleteNotesMiloapisComV1Alpha1NamespacedNoteData, ThrowOnError>
) =>
  (options.client ?? client).delete<
    DeleteNotesMiloapisComV1Alpha1NamespacedNoteResponses,
    DeleteNotesMiloapisComV1Alpha1NamespacedNoteErrors,
    ThrowOnError
  >({
    url: '/apis/notes.miloapis.com/v1alpha1/namespaces/{namespace}/notes/{name}',
    ...options,
  });
