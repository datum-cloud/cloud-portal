/// <reference types="bun-types/test" />
import { NETWORKING_SERVICE_NAME, NETWORKING_SERVICE_REF_NAME } from './service-entitlement.schema';
import { createServiceEntitlementService } from './service-entitlement.service';
import { ConflictError } from '@/utils/errors';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

const listSpy = mock();
const createSpy = mock();

mock.module('@/modules/control-plane/services', () => ({
  listServicesMiloapisComV1Alpha1ServiceEntitlement: (...args: unknown[]) => listSpy(...args),
  createServicesMiloapisComV1Alpha1ServiceEntitlement: (...args: unknown[]) => createSpy(...args),
}));

mock.module('@/resources/base/utils', () => ({
  getProjectScopedBase: (id: string) =>
    `/apis/resourcemanager.miloapis.com/v1alpha1/projects/${id}/control-plane`,
}));

mock.module('@/utils/errors/error-mapper', () => ({
  mapApiError: (e: unknown) => e,
}));

mock.module('@/modules/logger', () => ({
  logger: {
    debug: mock(() => {}),
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
    request: mock(() => {}),
    api: mock(() => {}),
    service: mock(() => {}),
  },
}));

beforeEach(() => {
  listSpy.mockReset();
  createSpy.mockReset();
});

describe('ServiceEntitlementService.ensure', () => {
  it('does not create when a networking entitlement already exists', async () => {
    const existing = {
      spec: { serviceRef: { name: NETWORKING_SERVICE_REF_NAME } },
      status: { phase: 'Active' as const, serviceName: NETWORKING_SERVICE_NAME },
    };
    listSpy.mockResolvedValueOnce({ data: { items: [existing] } });

    const result = await createServiceEntitlementService().ensure('acme-web');

    expect(result).toBe(existing);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('creates when the project has no networking entitlement', async () => {
    const created = {
      metadata: { name: 'acme-web--networking-datumapis-com' },
      spec: { serviceRef: { name: NETWORKING_SERVICE_REF_NAME } },
    };
    listSpy.mockResolvedValueOnce({ data: { items: [] } });
    createSpy.mockResolvedValueOnce({ data: created });

    const result = await createServiceEntitlementService().ensure('acme-web');

    expect(result).toBe(created);
    expect(createSpy).toHaveBeenCalledTimes(1);
    const call = createSpy.mock.calls[0][0];
    expect(call.body.spec.serviceRef.name).toBe(NETWORKING_SERVICE_REF_NAME);
    expect(call.body.metadata.name).toBe('acme-web--networking-datumapis-com');
  });

  it('treats a 409 conflict as already entitled', async () => {
    const existing = {
      spec: { serviceRef: { name: NETWORKING_SERVICE_REF_NAME } },
    };
    listSpy
      .mockResolvedValueOnce({ data: { items: [] } })
      .mockResolvedValueOnce({ data: { items: [existing] } });
    createSpy.mockRejectedValueOnce(new ConflictError('already exists'));

    const result = await createServiceEntitlementService().ensure('acme-web');

    expect(result).toBe(existing);
  });

  it('rethrows non-conflict create failures', async () => {
    listSpy.mockResolvedValueOnce({ data: { items: [] } });
    createSpy.mockRejectedValueOnce(new Error('boom'));

    await expect(createServiceEntitlementService().ensure('acme-web')).rejects.toThrow('boom');
  });
});
