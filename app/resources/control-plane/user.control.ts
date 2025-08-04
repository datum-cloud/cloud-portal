import { IUser } from '@/resources/interfaces/user.interface';
import { UserSchema } from '@/resources/schemas/user.schema';
import { CustomError } from '@/utils/error';
import { Client } from '@hey-api/client-axios';

export interface ComMiloapisIamV1Alpha1User {
  apiVersion: string;
  kind: string;
  metadata: {
    creationTimestamp: Date;
    generation: number;
    name: string;
    resourceVersion: string;
    uid: string;
  };
  spec: {
    email: string;
    familyName: string;
    givenName: string;
  };
}

export const createUserControl = (client: Client) => {
  const transform = (user: ComMiloapisIamV1Alpha1User): IUser => {
    const { metadata, spec } = user;

    return {
      sub: metadata?.name,
      email: spec?.email,
      familyName: spec?.familyName,
      givenName: spec?.givenName,
      createdAt: metadata?.creationTimestamp ?? new Date(),
      uid: metadata?.uid ?? '',
      resourceVersion: metadata?.resourceVersion ?? '',
      fullName: `${spec?.givenName} ${spec?.familyName}`,
    };
  };

  return {
    detail: async (userId: string): Promise<IUser> => {
      const response = await client.get({
        url: `/apis/iam.miloapis.com/v1alpha1/users/${userId}`,
        responseType: 'json',
      });

      if (!response.data) {
        throw new CustomError(`User with ID ${userId} not found`, 404);
      }

      return transform(response.data as ComMiloapisIamV1Alpha1User);
    },
    update: async (userId: string, user: UserSchema): Promise<IUser> => {
      const response = await client.patch({
        url: `/apis/iam.miloapis.com/v1alpha1/users/${userId}?fieldManager=datum-cloud-portal`,
        headers: {
          'Content-Type': 'application/merge-patch+json',
        },
        body: {
          apiVersion: 'iam.miloapis.com/v1alpha1',
          kind: 'User',
          spec: {
            familyName: user.lastName,
            givenName: user.firstName,
          },
        },
        responseType: 'json',
      });

      if (!response.data) {
        throw new CustomError(`User with ID ${userId} not found`, 404);
      }

      return transform(response.data as ComMiloapisIamV1Alpha1User);
    },
  };
};
