import {
  ComMiloapisIamV1Alpha1UserInvitation,
  ComMiloapisIamV1Alpha1UserInvitationList,
  createIamMiloapisComV1Alpha1NamespacedUserInvitation,
  deleteIamMiloapisComV1Alpha1NamespacedUserInvitation,
  listIamMiloapisComV1Alpha1NamespacedUserInvitation,
  patchIamMiloapisComV1Alpha1NamespacedUserInvitation,
  readIamMiloapisComV1Alpha1NamespacedUserInvitation,
} from '@/modules/control-plane/iam';
import { IInvitationControlResponse } from '@/resources/interfaces/invitation.interface';
import { NewInvitationSchema } from '@/resources/schemas/invitation.schema';
import { generateRandomString } from '@/utils/helpers/text.helper';
import { Client } from '@hey-api/client-axios';
import { addHours, formatRFC3339 } from 'date-fns';

const buildNamespace = (organizationId: string) => `organization-${organizationId}`;

const buildBaseUrl = (client: Client, organizationId: string) =>
  `${client.instance.defaults.baseURL}/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${organizationId}/control-plane`;

const transform = (
  invitation: ComMiloapisIamV1Alpha1UserInvitation
): IInvitationControlResponse => {
  const { metadata, spec, status } = invitation;

  return {
    name: metadata?.name ?? '',
    createdAt: metadata?.creationTimestamp,
    uid: metadata?.uid ?? '',
    resourceVersion: metadata?.resourceVersion ?? '',
    namespace: metadata?.namespace ?? '',
    email: spec?.email ?? '',
    expirationDate: spec?.expirationDate,
    familyName: spec?.familyName,
    givenName: spec?.givenName,
    invitedBy: spec?.invitedBy?.name,
    organizationName: spec?.organizationRef?.name ?? '',
    role: spec?.roles?.[0]?.name,
    state: spec?.state ?? 'Pending',
    status: status ?? {},
  };
};

export const createInvitationsControl = (client: Client) => {
  return {
    list: async (organizationId: string) => {
      try {
        const response = await listIamMiloapisComV1Alpha1NamespacedUserInvitation({
          client,
          baseURL: buildBaseUrl(client, organizationId),
          path: {
            namespace: buildNamespace(organizationId),
          },
        });

        const invitations = response.data as ComMiloapisIamV1Alpha1UserInvitationList;

        return invitations.items?.map(transform) ?? [];
      } catch (error) {
        throw error;
      }
    },
    create: async (
      organizationId: string,
      payload: NewInvitationSchema,
      dryRun: boolean = false
    ) => {
      try {
        const orgNamespace = buildNamespace(organizationId);
        // @TODO: make it dynamic if we add more roles
        const roles = payload.role ? [{ name: payload.role, namespace: 'milo-system' }] : [];

        const response = await createIamMiloapisComV1Alpha1NamespacedUserInvitation({
          client,
          baseURL: buildBaseUrl(client, organizationId),
          path: {
            namespace: orgNamespace,
          },
          query: {
            dryRun: dryRun ? 'All' : undefined,
          },
          body: {
            apiVersion: 'iam.miloapis.com/v1alpha1',
            kind: 'UserInvitation',
            metadata: {
              name: `${organizationId}-${generateRandomString(8)}`,
            },
            spec: {
              familyName: payload.inviterFamilyName, // For Inviter
              givenName: payload.inviterGivenName, // For Inviter
              email: payload.email,
              expirationDate: formatRFC3339(addHours(new Date(), 24)), // 24 hours (RFC3339 format)
              organizationRef: { name: organizationId },
              roles,
              state: 'Pending',
            },
          },
        });

        const invitation = response.data as ComMiloapisIamV1Alpha1UserInvitation;

        return dryRun ? invitation : transform(invitation);
      } catch (error) {
        throw error;
      }
    },
    delete: async (organizationId: string, invitationId: string) => {
      try {
        const response = await deleteIamMiloapisComV1Alpha1NamespacedUserInvitation({
          client,
          baseURL: buildBaseUrl(client, organizationId),
          path: {
            namespace: buildNamespace(organizationId),
            name: invitationId,
          },
        });

        return response.data;
      } catch (e) {
        throw e;
      }
    },
    detail: async (organizationId: string, invitationId: string) => {
      try {
        const response = await readIamMiloapisComV1Alpha1NamespacedUserInvitation({
          client,
          baseURL: buildBaseUrl(client, organizationId),
          path: {
            namespace: buildNamespace(organizationId),
            name: invitationId,
          },
        });

        const invitation = response.data as ComMiloapisIamV1Alpha1UserInvitation;

        return transform(invitation);
      } catch (e) {
        throw e;
      }
    },
    updateState: async (
      organizationId: string,
      invitationId: string,
      state: 'Accepted' | 'Declined'
    ) => {
      try {
        const response = await patchIamMiloapisComV1Alpha1NamespacedUserInvitation({
          client,
          baseURL: buildBaseUrl(client, organizationId),
          path: {
            namespace: buildNamespace(organizationId),
            name: invitationId,
          },
          headers: {
            'Content-Type': 'application/merge-patch+json',
          },
          query: {
            fieldManager: 'datum-cloud-portal',
          },
          body: {
            apiVersion: 'iam.miloapis.com/v1alpha1',
            kind: 'UserInvitation',
            spec: {
              state,
            },
          },
        });

        const invitation = response.data as ComMiloapisIamV1Alpha1UserInvitation;

        return transform(invitation);
      } catch (e) {
        throw e;
      }
    },
  };
};
