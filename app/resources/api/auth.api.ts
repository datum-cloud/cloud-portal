import { IUser } from '../interfaces/user.interface';
import { apiRequest } from '@/modules/axios/axios';
import { env } from '@/utils/config/env.server';

export const authAPI = () => {
  const apiClient = apiRequest({
    baseURL: env.AUTH_OIDC_ISSUER,
  }).instance();

  return {
    async profile(accessToken: string): Promise<IUser> {
      const response = await apiClient.get<IUser>('/oidc/v1/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    },
  };
};
