import {
  IoK8sApiAuthorizationV1SelfSubjectAccessReview,
  createAuthorizationV1SelfSubjectAccessReview,
} from '@/modules/control-plane/authorization';
import { CreateSelfSubjectAccessReviewSchema } from '@/resources/schemas/self-subject.schema';
import { Client } from '@hey-api/client-axios';

export const createSelfSubjectAccessReviewControl = (client: Client) => {
  const buildBaseUrl = (client: Client, organizationId: string) =>
    `${client.instance.defaults.baseURL}/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${organizationId}/control-plane`;

  const transform = (selfSubjectAccessReview: IoK8sApiAuthorizationV1SelfSubjectAccessReview) => {
    const { status, spec } = selfSubjectAccessReview;
    return {
      allowed: status?.allowed ?? false,
      denied: status?.denied ?? false,
      namespace: spec?.resourceAttributes?.namespace ?? undefined,
      verb: spec?.resourceAttributes?.verb ?? undefined,
      group: spec?.resourceAttributes?.group ?? undefined,
      resource: spec?.resourceAttributes?.resource ?? undefined,
    };
  };

  return {
    create: async (
      organizationId: string,
      payload: CreateSelfSubjectAccessReviewSchema,
      dryRun: boolean = false
    ) => {
      try {
        console.log('payload', payload);
        const response = await createAuthorizationV1SelfSubjectAccessReview({
          client,
          baseURL: buildBaseUrl(client, organizationId),
          query: {
            dryRun: dryRun ? 'All' : undefined,
          },
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            apiVersion: 'authorization.k8s.io/v1',
            kind: 'SelfSubjectAccessReview',
            spec: {
              resourceAttributes: {
                namespace: payload.namespace,
                verb: payload.verb,
                group: payload.group,
                resource: payload.resource,
                name: payload.name,
              },
            },
          },
        });

        const selfSubjectAccessReview =
          response.data as IoK8sApiAuthorizationV1SelfSubjectAccessReview;

        return dryRun ? selfSubjectAccessReview : transform(selfSubjectAccessReview);
      } catch (error) {
        throw error;
      }
    },
  };
};
