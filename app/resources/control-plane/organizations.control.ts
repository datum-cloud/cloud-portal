import {
  ComMiloapisResourcemanagerV1Alpha1Organization,
  ComMiloapisResourcemanagerV1Alpha1OrganizationMembership,
  ComMiloapisResourcemanagerV1Alpha1OrganizationMembershipList,
  createResourcemanagerMiloapisComV1Alpha1Organization,
  deleteResourcemanagerMiloapisComV1Alpha1Organization,
  listResourcemanagerMiloapisComV1Alpha1OrganizationMembershipForAllNamespaces,
  patchResourcemanagerMiloapisComV1Alpha1Organization,
  readResourcemanagerMiloapisComV1Alpha1Organization,
} from '@/modules/control-plane/resource-manager';
import { IOrganization, OrganizationType } from '@/resources/interfaces/organization.interface';
import {
  OrganizationSchema,
  UpdateOrganizationSchema,
} from '@/resources/schemas/organization.schema';
import { convertLabelsToObject } from '@/utils/data';
import { CustomError } from '@/utils/error';
import { Client } from '@hey-api/client-axios';

export const createOrganizationsControl = (client: Client) => {
  const transform = (org: ComMiloapisResourcemanagerV1Alpha1Organization) => {
    const { metadata, spec, status } = org;

    return {
      name: metadata?.name,
      displayName: metadata?.annotations?.['kubernetes.io/display-name'],
      createdAt: metadata?.creationTimestamp ?? new Date(),
      uid: metadata?.uid ?? '',
      resourceVersion: metadata?.resourceVersion ?? '',
      namespace: metadata?.namespace ?? 'default',
      annotations: metadata?.annotations,
      labels: metadata?.labels,
      type: spec?.type as OrganizationType,
      status: status,
    };
  };

  const transformOrgMembership = (
    org: ComMiloapisResourcemanagerV1Alpha1OrganizationMembership
  ): IOrganization => {
    const { metadata, spec, status } = org;

    return {
      name: spec?.organizationRef?.name ?? '',
      displayName: status?.organization?.displayName,
      createdAt: metadata?.creationTimestamp ?? new Date(),
      uid: metadata?.uid ?? '',
      resourceVersion: metadata?.resourceVersion ?? '',
      namespace: metadata?.namespace ?? 'default',
      annotations: metadata?.annotations,
      labels: metadata?.labels,
      type: status?.organization?.type as OrganizationType,
      status: status,
    };
  };

  return {
    list: async () => {
      const response =
        await listResourcemanagerMiloapisComV1Alpha1OrganizationMembershipForAllNamespaces({
          client,
        });

      // Type guard to check if data is a valid project list
      const orgList =
        response?.data as ComMiloapisResourcemanagerV1Alpha1OrganizationMembershipList;

      return (
        orgList?.items?.map((org: ComMiloapisResourcemanagerV1Alpha1OrganizationMembership) =>
          transformOrgMembership(org)
        ) ?? []
      );
    },
    detail: async (orgId: string) => {
      const response = await readResourcemanagerMiloapisComV1Alpha1Organization({
        client,
        path: {
          name: orgId,
        },
      });

      // Type guard to check if data is a valid project list
      const org = response?.data as ComMiloapisResourcemanagerV1Alpha1Organization;

      return transform(org);
    },
    create: async (payload: OrganizationSchema, dryRun: boolean = false) => {
      const response = await createResourcemanagerMiloapisComV1Alpha1Organization({
        client,
        query: {
          dryRun: dryRun ? 'All' : undefined,
        },
        body: {
          apiVersion: 'resourcemanager.miloapis.com/v1alpha1',
          kind: 'Organization',
          metadata: {
            name: payload.name,
            annotations: {
              'kubernetes.io/display-name': payload.description,
              ...convertLabelsToObject(payload.annotations ?? []),
            },
            labels: convertLabelsToObject(payload.labels ?? []),
          },
          spec: {
            type: OrganizationType.Standard,
          },
        },
      });

      if (!response.data) {
        throw new CustomError('Failed to create organization', 500);
      }

      const org = response.data as ComMiloapisResourcemanagerV1Alpha1Organization;

      return dryRun ? response.data : transform(org);
    },
    update: async (orgId: string, payload: UpdateOrganizationSchema, dryRun: boolean = false) => {
      // Build metadata object conditionally based on available payload properties
      const metadata: Record<string, any> = {};

      // Only add annotations if description is provided
      if (payload.description) {
        metadata.annotations = {
          'kubernetes.io/display-name': payload.description,
        };
      }

      // Only add labels if they are provided
      if ('labels' in payload && payload.labels && payload.labels.length > 0) {
        metadata.labels = convertLabelsToObject(payload.labels);
      }

      const response = await patchResourcemanagerMiloapisComV1Alpha1Organization({
        client,
        path: {
          name: orgId,
        },
        query: {
          dryRun: dryRun ? 'All' : undefined,
          fieldManager: 'datum-cloud-portal',
        },
        headers: {
          'Content-Type': 'application/merge-patch+json',
        },
        body: {
          apiVersion: 'resourcemanager.miloapis.com/v1alpha1',
          kind: 'Organization',
          metadata,
        },
      });

      if (!response.data) {
        throw new CustomError('Failed to update organization', 500);
      }

      const org = response.data as ComMiloapisResourcemanagerV1Alpha1Organization;

      return dryRun ? response.data : transform(org);
    },

    delete: async (orgId: string) => {
      const response = await deleteResourcemanagerMiloapisComV1Alpha1Organization({
        client,
        path: {
          name: orgId,
        },
      });

      if (!response.data) {
        throw new CustomError('Failed to delete organization', 500);
      }

      return response.data;
    },
  };
};
