import {
  toCreatePayload,
  toProject,
  toProjectList,
  toProjectListAll,
  toUpdatePayload,
} from './project.adapter';
import { pendingStatus, rawMetadata, readyStatus } from '@/test/factories/k8s';
import { describe, expect, it } from 'bun:test';

describe('toProject', () => {
  it('maps owner ref to organizationId and strips resourcemanager.* labels', () => {
    const raw = {
      metadata: rawMetadata({
        uid: 'p-1',
        name: 'web',
        namespace: 'org-acme',
        resourceVersion: '5',
        annotations: { 'kubernetes.io/description': 'Web project' },
        labels: { 'resourcemanager.miloapis.com/owner': 'x', team: 'frontend' },
      }),
      spec: { ownerRef: { kind: 'Organization', name: 'acme' } },
      status: {},
    };
    const project = toProject(raw as never);

    expect(project.uid).toBe('p-1');
    expect(project.organizationId).toBe('acme');
    expect(project.displayName).toBe('Web project');
    expect(project.description).toBe('Web project');
    // resourcemanager-prefixed label filtered out; others kept.
    expect(project.labels).toEqual({ team: 'frontend' });
  });

  it('uses metadata.name for displayName when no description annotation exists', () => {
    const raw = {
      metadata: rawMetadata({ name: 'no-desc' }),
      spec: { ownerRef: { name: 'acme' } },
    };
    expect(toProject(raw as never).displayName).toBe('no-desc');
    expect(toProject(raw as never).description).toBeUndefined();
  });

  it('prefers the display-name annotation over description for displayName', () => {
    const raw = {
      metadata: rawMetadata({
        name: 'proj-abc',
        annotations: {
          'kubernetes.io/display-name': 'Renamed Project',
          'kubernetes.io/description': 'Original Name',
        },
      }),
      spec: { ownerRef: { name: 'acme' } },
    };
    const project = toProject(raw as never);

    expect(project.displayName).toBe('Renamed Project');
    // description stays its own field even when display-name wins the label.
    expect(project.description).toBe('Original Name');
  });

  it('falls through an empty display-name annotation instead of blanking the label', () => {
    const raw = {
      metadata: rawMetadata({
        name: 'proj-abc',
        annotations: {
          'kubernetes.io/display-name': '',
          'kubernetes.io/description': 'Web project',
        },
      }),
      spec: { ownerRef: { name: 'acme' } },
    };

    expect(toProject(raw as never).displayName).toBe('Web project');
  });

  it('maps deletionTimestamp from metadata', () => {
    const raw = {
      metadata: rawMetadata({
        name: 'deleting',
        deletionTimestamp: '2024-02-02T00:00:00Z',
      }),
      spec: { ownerRef: { name: 'acme' } },
      status: readyStatus(),
    };
    const project = toProject(raw as never);

    expect(project.deletionTimestamp).toEqual(new Date('2024-02-02T00:00:00Z'));
  });
});

describe('toProjectList', () => {
  it('includes ready projects and deleting ones, but drops pending ones', () => {
    const items = [
      {
        metadata: rawMetadata({ name: 'ready' }),
        spec: { ownerRef: { name: 'acme' } },
        status: readyStatus(),
      },
      {
        metadata: rawMetadata({ name: 'pending' }),
        spec: { ownerRef: { name: 'acme' } },
        status: pendingStatus(),
      },
      {
        metadata: rawMetadata({ name: 'deleting', deletionTimestamp: '2024-02-02T00:00:00Z' }),
        spec: { ownerRef: { name: 'acme' } },
        status: readyStatus(),
      },
    ];
    const list = toProjectList({ items, metadata: { continue: 'tok' } } as never);

    expect(list.items.map((p) => p.name)).toEqual(['ready', 'deleting']);
    expect(list.items.find((p) => p.name === 'deleting')?.deletionTimestamp).toEqual(
      new Date('2024-02-02T00:00:00Z')
    );
    expect(list.nextCursor).toBe('tok');
    expect(list.hasMore).toBe(true);
  });

  it('handles a missing items array and reports no further pages', () => {
    const list = toProjectList({} as never);
    expect(list.items).toEqual([]);
    expect(list.nextCursor).toBeNull();
    expect(list.hasMore).toBe(false);
  });
});

describe('toProjectListAll', () => {
  it('excludes deleting projects for idempotent setup guards', () => {
    const items = [
      {
        metadata: rawMetadata({ name: 'ready' }),
        spec: { ownerRef: { name: 'acme' } },
        status: readyStatus(),
      },
      {
        metadata: rawMetadata({ name: 'deleting', deletionTimestamp: '2024-02-02T00:00:00Z' }),
        spec: { ownerRef: { name: 'acme' } },
        status: readyStatus(),
      },
    ];
    const list = toProjectListAll({ items } as never);

    expect(list.items.map((p) => p.name)).toEqual(['ready']);
  });

  it('includes pending projects for idempotent setup guards', () => {
    const items = [
      {
        metadata: rawMetadata({ name: 'ready' }),
        spec: { ownerRef: { name: 'acme' } },
        status: readyStatus(),
      },
      {
        metadata: rawMetadata({ name: 'pending' }),
        spec: { ownerRef: { name: 'acme' } },
        status: pendingStatus(),
      },
    ];
    const list = toProjectListAll({ items } as never);

    expect(list.items.map((p) => p.name)).toEqual(['ready', 'pending']);
  });
});

describe('toCreatePayload', () => {
  it('builds a Project owned by the given organization with a generated name', () => {
    const payload = toCreatePayload({
      organizationId: 'acme',
      description: 'desc',
    } as never);

    expect(payload.apiVersion).toBe('resourcemanager.miloapis.com/v1alpha1');
    expect(payload.kind).toBe('Project');
    expect(payload.metadata?.generateName).toBe('project-');
    expect(payload.metadata?.name).toBeUndefined();
    expect(payload.metadata?.annotations?.['kubernetes.io/description']).toBe('desc');
    expect(payload.spec?.ownerRef).toEqual({ kind: 'Organization', name: 'acme' });
  });

  it('stamps display-name alongside description so the name is renameable later', () => {
    const payload = toCreatePayload({
      organizationId: 'acme',
      description: 'My Project',
    } as never);

    expect(payload.metadata?.annotations?.['kubernetes.io/display-name']).toBe('My Project');
    expect(payload.metadata?.annotations?.['kubernetes.io/description']).toBe('My Project');
  });
});

describe('toUpdatePayload', () => {
  it('merges the description annotation with extra annotations', () => {
    const payload = toUpdatePayload({
      description: 'new desc',
      annotations: { 'custom/flag': 'on' },
    } as never);

    expect(payload.metadata?.annotations).toEqual({
      'kubernetes.io/display-name': 'new desc',
      'kubernetes.io/description': 'new desc',
      'custom/flag': 'on',
    });
  });

  it('omits the name annotations when no description is provided', () => {
    const payload = toUpdatePayload({ annotations: { a: 'b' } } as never);
    expect(payload.metadata?.annotations).toEqual({ a: 'b' });
  });

  it('writes an explicitly empty name instead of silently dropping it', () => {
    const payload = toUpdatePayload({ description: '' } as never);

    expect(payload.metadata?.annotations).toEqual({
      'kubernetes.io/display-name': '',
      'kubernetes.io/description': '',
    });
  });
});

// Regression guard for #1440: renaming wrote kubernetes.io/description while
// toProject read kubernetes.io/display-name first, so any project already
// carrying display-name silently reverted to its old name after a save.
describe('rename round-trip', () => {
  it('resolves to the new name for a project already carrying display-name', () => {
    const existing = rawMetadata({
      name: 'proj-abc',
      annotations: {
        'kubernetes.io/display-name': 'Old Name',
        'kubernetes.io/description': 'Old Name',
      },
    });

    const patch = toUpdatePayload({ description: 'New Name' } as never);

    // metadata.annotations is a map, so merge-patch merges keys onto the object.
    const merged = {
      metadata: {
        ...existing,
        annotations: { ...existing.annotations, ...patch.metadata?.annotations },
      },
      spec: { ownerRef: { name: 'acme' } },
    };

    expect(toProject(merged as never).displayName).toBe('New Name');
  });
});
