/// <reference types="bun-types/test" />
import { PROJECT_KINDS } from './search.constants';
import { createSearchService } from './search.service';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

const createSpy = mock();

mock.module('@/modules/control-plane/search', () => ({
  createSearchMiloapisComV1Alpha1ResourceSearchQuery: (...args: unknown[]) => createSpy(...args),
}));

// NOTE: `mock.module` in Bun is process-global and persists for the rest of
// the run, so it can leak into other test files. Keep these mocks faithful to
// the real modules' shape/output (e.g. the real scoped-base URL format and the
// full logger surface) so execution order can never matter.
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
  createSpy.mockReset();
});

describe('searchService', () => {
  it('short-circuits to empty result when query is empty', async () => {
    const svc = createSearchService();
    const res = await svc.searchGlobal({ query: '   ', targetResources: PROJECT_KINDS });
    expect(res).toEqual({ hits: [], deniedKinds: [] });
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('calls SDK without baseURL for global scope', async () => {
    createSpy.mockResolvedValueOnce({ data: {} });
    const svc = createSearchService();
    await svc.searchGlobal({ query: 'acme', targetResources: PROJECT_KINDS });
    const call = createSpy.mock.calls[0][0];
    expect(call.baseURL).toBeUndefined();
    expect(call.body.spec.query).toBe('acme');
    expect(call.body.spec.targetResources).toEqual(PROJECT_KINDS);
  });

  it('calls SDK with project baseURL for project scope', async () => {
    createSpy.mockResolvedValueOnce({ data: {} });
    const svc = createSearchService();
    await svc.searchInProject('alpha', { query: 'acme', targetResources: PROJECT_KINDS });
    const call = createSpy.mock.calls[0][0];
    expect(call.baseURL).toBe(
      '/apis/resourcemanager.miloapis.com/v1alpha1/projects/alpha/control-plane'
    );
  });

  it('passes apiVersion, kind, metadata in body', async () => {
    createSpy.mockResolvedValueOnce({ data: {} });
    const svc = createSearchService();
    await svc.searchGlobal({ query: 'q', targetResources: PROJECT_KINDS, limit: 25 });
    const body = createSpy.mock.calls[0][0].body;
    expect(body.apiVersion).toBe('search.miloapis.com/v1alpha1');
    expect(body.kind).toBe('ResourceSearchQuery');
    expect(body.metadata.name).toMatch(/^search-/);
    expect(body.spec.limit).toBe(25);
  });

  it('sets Content-Type: application/json on the SDK call (K8s aggregated API rejects */*)', async () => {
    createSpy.mockResolvedValueOnce({ data: {} });
    const svc = createSearchService();
    await svc.searchGlobal({ query: 'acme', targetResources: PROJECT_KINDS });
    const call = createSpy.mock.calls[0][0];
    expect(call.headers).toBeDefined();
    expect(call.headers['Content-Type']).toBe('application/json');
  });

  it('propagates errors through mapApiError', async () => {
    createSpy.mockRejectedValueOnce(new Error('boom'));
    const svc = createSearchService();
    await expect(svc.searchGlobal({ query: 'q', targetResources: PROJECT_KINDS })).rejects.toThrow(
      'boom'
    );
  });
});
