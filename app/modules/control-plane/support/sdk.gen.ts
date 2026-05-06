// This file is manually written following the @hey-api/openapi-ts pattern
// for support.miloapis.com/v1alpha1
import type { Client, Options as Options2, TDataShape } from '../shared/client';
import { client } from '../shared/client.gen';
import type {
  ListSupportMiloapisComV1Alpha1SupportTicketData,
  ListSupportMiloapisComV1Alpha1SupportTicketErrors,
  ListSupportMiloapisComV1Alpha1SupportTicketResponses,
  ReadSupportMiloapisComV1Alpha1SupportTicketData,
  ReadSupportMiloapisComV1Alpha1SupportTicketErrors,
  ReadSupportMiloapisComV1Alpha1SupportTicketResponses,
  CreateSupportMiloapisComV1Alpha1SupportTicketData,
  CreateSupportMiloapisComV1Alpha1SupportTicketErrors,
  CreateSupportMiloapisComV1Alpha1SupportTicketResponses,
  PatchSupportMiloapisComV1Alpha1SupportTicketData,
  PatchSupportMiloapisComV1Alpha1SupportTicketErrors,
  PatchSupportMiloapisComV1Alpha1SupportTicketResponses,
  ListSupportMiloapisComV1Alpha1SupportMessageData,
  ListSupportMiloapisComV1Alpha1SupportMessageErrors,
  ListSupportMiloapisComV1Alpha1SupportMessageResponses,
  CreateSupportMiloapisComV1Alpha1SupportMessageData,
  CreateSupportMiloapisComV1Alpha1SupportMessageErrors,
  CreateSupportMiloapisComV1Alpha1SupportMessageResponses,
  PatchSupportMiloapisComV1Alpha1SupportMessageData,
  PatchSupportMiloapisComV1Alpha1SupportMessageErrors,
  PatchSupportMiloapisComV1Alpha1SupportMessageResponses,
} from './types.gen';

type Options<T extends TDataShape, ThrowOnError extends boolean> = Options2<T, ThrowOnError> & {
  client?: Client;
};

export { type Options };

/**
 * list objects of kind SupportTicket
 */
export const listSupportMiloapisComV1Alpha1SupportTicket = <ThrowOnError extends boolean = false>(
  options?: Options<ListSupportMiloapisComV1Alpha1SupportTicketData, ThrowOnError>
) =>
  (options?.client ?? client).get<
    ListSupportMiloapisComV1Alpha1SupportTicketResponses,
    ListSupportMiloapisComV1Alpha1SupportTicketErrors,
    ThrowOnError
  >({
    url: '/apis/support.miloapis.com/v1alpha1/supporttickets',
    ...options,
  });

/**
 * read the specified SupportTicket
 */
export const readSupportMiloapisComV1Alpha1SupportTicket = <ThrowOnError extends boolean = false>(
  options: Options<ReadSupportMiloapisComV1Alpha1SupportTicketData, ThrowOnError>
) =>
  (options?.client ?? client).get<
    ReadSupportMiloapisComV1Alpha1SupportTicketResponses,
    ReadSupportMiloapisComV1Alpha1SupportTicketErrors,
    ThrowOnError
  >({
    url: '/apis/support.miloapis.com/v1alpha1/supporttickets/{name}',
    ...options,
  });

/**
 * create a SupportTicket
 */
export const createSupportMiloapisComV1Alpha1SupportTicket = <ThrowOnError extends boolean = false>(
  options: Options<CreateSupportMiloapisComV1Alpha1SupportTicketData, ThrowOnError>
) =>
  (options?.client ?? client).post<
    CreateSupportMiloapisComV1Alpha1SupportTicketResponses,
    CreateSupportMiloapisComV1Alpha1SupportTicketErrors,
    ThrowOnError
  >({
    url: '/apis/support.miloapis.com/v1alpha1/supporttickets',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

/**
 * partially update the specified SupportTicket (merge-patch)
 */
export const patchSupportMiloapisComV1Alpha1SupportTicket = <ThrowOnError extends boolean = false>(
  options: Options<PatchSupportMiloapisComV1Alpha1SupportTicketData, ThrowOnError>
) =>
  (options?.client ?? client).patch<
    PatchSupportMiloapisComV1Alpha1SupportTicketResponses,
    PatchSupportMiloapisComV1Alpha1SupportTicketErrors,
    ThrowOnError
  >({
    url: '/apis/support.miloapis.com/v1alpha1/supporttickets/{name}',
    ...options,
    headers: {
      'Content-Type': 'application/merge-patch+json',
      ...options?.headers,
    },
  });

/**
 * list objects of kind SupportMessage
 */
export const listSupportMiloapisComV1Alpha1SupportMessage = <ThrowOnError extends boolean = false>(
  options?: Options<ListSupportMiloapisComV1Alpha1SupportMessageData, ThrowOnError>
) =>
  (options?.client ?? client).get<
    ListSupportMiloapisComV1Alpha1SupportMessageResponses,
    ListSupportMiloapisComV1Alpha1SupportMessageErrors,
    ThrowOnError
  >({
    url: '/apis/support.miloapis.com/v1alpha1/supportmessages',
    ...options,
  });

/**
 * create a SupportMessage
 */
export const createSupportMiloapisComV1Alpha1SupportMessage = <ThrowOnError extends boolean = false>(
  options: Options<CreateSupportMiloapisComV1Alpha1SupportMessageData, ThrowOnError>
) =>
  (options?.client ?? client).post<
    CreateSupportMiloapisComV1Alpha1SupportMessageResponses,
    CreateSupportMiloapisComV1Alpha1SupportMessageErrors,
    ThrowOnError
  >({
    url: '/apis/support.miloapis.com/v1alpha1/supportmessages',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

/**
 * partially update the specified SupportMessage (merge-patch)
 */
export const patchSupportMiloapisComV1Alpha1SupportMessage = <ThrowOnError extends boolean = false>(
  options: Options<PatchSupportMiloapisComV1Alpha1SupportMessageData, ThrowOnError>
) =>
  (options?.client ?? client).patch<
    PatchSupportMiloapisComV1Alpha1SupportMessageResponses,
    PatchSupportMiloapisComV1Alpha1SupportMessageErrors,
    ThrowOnError
  >({
    url: '/apis/support.miloapis.com/v1alpha1/supportmessages/{name}',
    ...options,
    headers: {
      'Content-Type': 'application/merge-patch+json',
      ...options?.headers,
    },
  });
