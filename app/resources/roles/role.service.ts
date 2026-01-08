import { toRole, toRoleList } from './role.adapter';
import type { Role } from './role.schema';
import {
  listIamMiloapisComV1Alpha1NamespacedRole,
  readIamMiloapisComV1Alpha1NamespacedRole,
  type ComMiloapisIamV1Alpha1RoleList,
  type ComMiloapisIamV1Alpha1Role,
} from '@/modules/control-plane/iam';
import { logger } from '@/modules/logger';
import { ControlPlaneStatus } from '@/resources/base';
import type { ServiceOptions } from '@/resources/base/types';
import { mapApiError } from '@/utils/errors/error-mapper';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';

export const roleKeys = {
  all: ['roles'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
  list: (namespace: string) => [...roleKeys.lists(), namespace] as const,
  details: () => [...roleKeys.all, 'detail'] as const,
  detail: (namespace: string, name: string) => [...roleKeys.details(), namespace, name] as const,
};

const SERVICE_NAME = 'RoleService';

export function createRoleService() {
  return {
    /**
     * List all roles in a namespace (defaults to datum-cloud)
     */
    async list(namespace: string = 'datum-cloud', _options?: ServiceOptions): Promise<Role[]> {
      const startTime = Date.now();

      try {
        const result = await this.fetchList(namespace);

        logger.service(SERVICE_NAME, 'list', {
          input: { namespace },
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.list failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async fetchList(namespace: string): Promise<Role[]> {
      const response = await listIamMiloapisComV1Alpha1NamespacedRole({
        path: { namespace },
      });

      const data = response.data as ComMiloapisIamV1Alpha1RoleList;

      // Filter only successful roles
      const filteredItems = (data?.items ?? []).filter((item) => {
        const status = transformControlPlaneStatus(item.status);
        return status.status === ControlPlaneStatus.Success;
      });

      return toRoleList(filteredItems).items;
    },

    /**
     * Get a single role by name
     */
    async get(
      name: string,
      namespace: string = 'datum-cloud',
      _options?: ServiceOptions
    ): Promise<Role> {
      const startTime = Date.now();

      try {
        const result = await this.fetchOne(name, namespace);

        logger.service(SERVICE_NAME, 'get', {
          input: { name, namespace },
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.get failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async fetchOne(name: string, namespace: string): Promise<Role> {
      const response = await readIamMiloapisComV1Alpha1NamespacedRole({
        path: { namespace, name },
      });

      const data = response.data as ComMiloapisIamV1Alpha1Role;
      return toRole(data);
    },
  };
}

export type RoleService = ReturnType<typeof createRoleService>;
