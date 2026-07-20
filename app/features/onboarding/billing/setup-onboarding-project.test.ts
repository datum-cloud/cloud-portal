import { setupOnboardingProject } from './use-setup-onboarding-project';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

const contactInfo = {
  email: 'a@example.com',
  name: 'Jane',
  businessName: '',
  country: 'US',
  line1: '',
  line2: '',
  city: '',
  region: '',
  postalCode: '',
} as const;

const listAll = mock(async () => ({
  items: [] as { name: string; displayName: string }[],
  nextCursor: null,
  hasMore: false,
}));
const create = mock(async () => ({
  name: 'project-new',
  displayName: 'Default project',
}));
const bindingList = mock(async () => [] as never[]);
const bindingCreate = mock(async () => ({ metadata: { name: 'bab-1' } }));

mock.module('@/resources/projects', () => ({
  createProjectService: () => ({
    listAll,
    list: listAll,
    create,
  }),
}));

mock.module('@/resources/projects/project.watch', () => ({
  awaitProjectReady: async (_orgId: string, projectName: string) => ({
    name: projectName,
    displayName: 'Default project',
  }),
}));

mock.module('@/resources/billing-account-bindings', () => ({
  createBillingAccountBindingService: () => ({
    list: bindingList,
    create: bindingCreate,
  }),
}));

mock.module('@/resources/organizations', () => ({
  createOrganizationService: () => ({
    updateContactInfo: async () => ({}),
  }),
}));

mock.module('@/modules/logger', () => ({
  logger: {
    warn: () => {},
    error: () => {},
    service: () => {},
  },
}));

mock.module('@/resources/base/utils', () => ({
  retryOnTransientAuthError: async <T>(fn: () => Promise<T>) => fn(),
}));

describe('setupOnboardingProject', () => {
  beforeEach(() => {
    listAll.mockReset();
    create.mockReset();
    bindingList.mockReset();
    bindingCreate.mockReset();

    listAll.mockImplementation(async () => ({
      items: [],
      nextCursor: null,
      hasMore: false,
    }));
    create.mockImplementation(async () => ({
      name: 'project-new',
      displayName: 'Default project',
    }));
    bindingList.mockImplementation(async () => []);
    bindingCreate.mockImplementation(async () => ({ metadata: { name: 'bab-1' } }));
  });

  it('reuses an existing non-Ready project instead of creating another', async () => {
    listAll.mockImplementation(async () => ({
      items: [{ name: 'project-abc', displayName: 'Default project' }],
      nextCursor: null,
      hasMore: false,
    }));

    const result = await setupOnboardingProject({
      orgId: 'org-1',
      billingAccountName: 'ba-1',
      contactInfo,
    });

    expect(result.projectId).toBe('project-abc');
    expect(result.orgId).toBe('org-1');
    expect(create).not.toHaveBeenCalled();
    expect(bindingCreate).toHaveBeenCalled();
  });

  it('coalesces concurrent setup calls for the same org', async () => {
    listAll.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { items: [], nextCursor: null, hasMore: false };
    });
    create.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { name: 'project-new', displayName: 'Default project' };
    });

    const input = {
      orgId: 'org-1',
      billingAccountName: 'ba-1',
      contactInfo,
    };

    const [first, second] = await Promise.all([
      setupOnboardingProject(input),
      setupOnboardingProject(input),
    ]);

    expect(first.projectId).toBe('project-new');
    expect(second.projectId).toBe('project-new');
    expect(create).toHaveBeenCalledTimes(1);
  });
});
