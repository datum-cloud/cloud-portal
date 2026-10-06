import type { Project, ProjectList } from './project.schema';
import { projectKeys } from './project.service';
import { projectListWatchCache } from './project.watch';
import { applyWatchEvent } from '@/modules/watch/watch-cache-handler';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'bun:test';

const project = (name: string, organizationId: string, resourceVersion = '1'): Project => ({
  uid: name,
  name,
  displayName: name,
  resourceVersion,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  organizationId,
  status: {},
});

function setup() {
  const qc = new QueryClient();
  const cfg = { ...projectListWatchCache('org-a'), isDetail: false };
  qc.setQueryData<ProjectList>(projectKeys.list('org-a'), {
    items: [project('mine', 'org-a')],
    nextCursor: null,
    hasMore: false,
  });
  const names = () =>
    qc.getQueryData<ProjectList>(projectKeys.list('org-a'))?.items.map((p) => p.name);
  return { qc, cfg, names };
}

describe('projectListWatchCache', () => {
  it('drops ADDED events for another org', () => {
    const { qc, cfg, names } = setup();
    const result = applyWatchEvent(qc, cfg, { type: 'ADDED', object: project('theirs', 'org-b') });
    expect(result).toBe('ignored');
    expect(names()).toEqual(['mine']);
  });

  it('still adds projects from its own org', () => {
    const { qc, cfg, names } = setup();
    applyWatchEvent(qc, cfg, { type: 'ADDED', object: project('new', 'org-a') });
    expect(names()).toEqual(['mine', 'new']);
  });
});
