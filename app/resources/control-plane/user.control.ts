import { IUser, IUserPreferences, ThemeValue } from '@/resources/interfaces/user.interface';
import { UserPreferencesSchema, UserSchema } from '@/resources/schemas/user.schema';
import { toBoolean } from '@/utils/helpers/text.helper';
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
    annotations: Record<string, string>;
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

    // TODO: temporary solution until the user preferences API can be accessed
    const preferences: IUserPreferences = {
      theme: (metadata?.annotations?.['preferences/theme'] ?? 'system') as ThemeValue,
      timezone: metadata?.annotations?.['preferences/timezone'] ?? 'Etc/GMT',
      newsletter: toBoolean(metadata?.annotations?.['preferences/newsletter']),
    };

    return {
      sub: metadata?.name,
      email: spec?.email,
      familyName: spec?.familyName,
      givenName: spec?.givenName,
      createdAt: metadata?.creationTimestamp ?? new Date(),
      uid: metadata?.uid ?? '',
      resourceVersion: metadata?.resourceVersion ?? '',
      fullName: `${spec?.givenName} ${spec?.familyName}`,
      preferences,
    };
  };

  return {
    detail: async (userId: string): Promise<IUser> => {
      try {
        const response = await client.get({
          url: `/apis/iam.miloapis.com/v1alpha1/users/${userId}`,
          responseType: 'json',
        });

        return transform(response.data as ComMiloapisIamV1Alpha1User);
      } catch (e) {
        throw e;
      }
    },
    update: async (userId: string, user: UserSchema): Promise<IUser> => {
      try {
        const response = await client.patch({
          url: `/apis/iam.miloapis.com/v1alpha1/users/${userId}`,
          headers: {
            'Content-Type': 'application/merge-patch+json',
          },
          query: {
            fieldManager: 'datum-cloud-portal',
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

        return transform(response.data as ComMiloapisIamV1Alpha1User);
      } catch (e) {
        throw e;
      }
    },
    delete: async (userId: string): Promise<IUser> => {
      try {
        const response = await client.delete({
          url: `/apis/iam.miloapis.com/v1alpha1/users/${userId}`,
          responseType: 'json',
        });

        return transform(response.data as ComMiloapisIamV1Alpha1User);
      } catch (e) {
        throw e;
      }
    },
    updatePreferences: async (
      userId: string,
      preferences: UserPreferencesSchema
    ): Promise<IUser> => {
      try {
        const annotations: Record<string, string> = {};
        if (preferences.theme) {
          annotations['preferences/theme'] = preferences.theme;
        }
        if (preferences.timezone) {
          annotations['preferences/timezone'] = preferences.timezone;
        }
        if (typeof preferences.newsletter === 'boolean') {
          annotations['preferences/newsletter'] = String(preferences.newsletter);
        }

        const metadata = Object.keys(annotations).length > 0 ? { annotations } : undefined;

        const body = {
          apiVersion: 'iam.miloapis.com/v1alpha1',
          kind: 'User',
          ...(metadata ? { metadata } : {}),
        };

        const response = await client.patch({
          url: `/apis/iam.miloapis.com/v1alpha1/users/${userId}`,
          headers: {
            'Content-Type': 'application/merge-patch+json',
          },
          query: {
            fieldManager: 'datum-cloud-portal',
          },
          body,
          responseType: 'json',
        });

        return transform(response.data as ComMiloapisIamV1Alpha1User);
      } catch (e) {
        throw e;
      }
    },
  };
};
